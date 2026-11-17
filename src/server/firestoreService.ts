import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  deleteDoc,
  deleteField,
  Firestore
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { InvestmentDocument } from '../types';

let firestoreInstance: Firestore | null = null;
let cloudProjectId = '';
let cloudDbId = '';

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    cloudProjectId = config.projectId || '';
    cloudDbId = config.firestoreDatabaseId || '';
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    firestoreInstance = getFirestore(app, config.firestoreDatabaseId);
    console.log(`[FirestoreService] Initialized Google Cloud & Firebase Firestore db: ${config.firestoreDatabaseId}`);

    // Validate connection on boot as recommended
    getDocFromServer(doc(firestoreInstance, 'test', 'connection')).catch((err) => {
      if (err instanceof Error && err.message.includes('the client is offline')) {
        console.error('[FirestoreService] Please check your Firebase configuration (offline).');
      }
    });
  }
} catch (err: any) {
  console.error('[FirestoreService] Initialization warning:', err.message);
}

export function getCloudInfo() {
  return {
    connected: firestoreInstance !== null,
    projectId: cloudProjectId,
    databaseId: cloudDbId,
    targetCollection: 'documents',
    fileCollection: 'document_files'
  };
}

export async function isCloudConnected(): Promise<boolean> {
  if (!firestoreInstance) return false;
  try {
    const colRef = collection(firestoreInstance, 'documents');
    await getDocs(colRef);
    return true;
  } catch (e: any) {
    console.warn('[FirestoreService] Connection check failed:', e.message);
    return false;
  }
}

/**
 * Deletes existing chunks for a document before overwriting with a new version
 */
async function clearExistingChunks(docId: string): Promise<void> {
  if (!firestoreInstance) return;
  try {
    const chunksCol = collection(firestoreInstance, `document_files/${docId}/chunks`);
    const snap = await getDocs(chunksCol);
    if (snap.empty) return;
    const batchSize = 10;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = snap.docs.slice(i, i + batchSize);
      await Promise.all(batch.map((d) => deleteDoc(d.ref)));
    }
  } catch (e: any) {
    console.warn(`[FirestoreService] Clear old chunks notice for ${docId}:`, e.message);
  }
}

/**
 * Saves document metadata and file binary to Google Cloud Firestore.
 * Uses Base64 length checks so we never exceed Firestore's 1 MiB document limit,
 * and writes chunks in parallel batches for speed and reliability.
 */
export async function saveDocumentToCloud(
  docData: InvestmentDocument,
  fileBuffer?: Buffer
): Promise<{ success: boolean; error?: string; totalChunks?: number }> {
  if (!firestoreInstance) {
    return { success: false, error: 'Firestore instance not initialized' };
  }

  try {
    // 1. Save metadata to 'documents' collection
    const docRef = doc(firestoreInstance, 'documents', docData.id);
    const cleanDocData: any = {
      ...docData,
      isRealFile: true,
      source: 'google-cloud-firebase',
      cloudSyncAt: new Date().toISOString(),
      cloudFileStatus: fileBuffer ? 'complete' : docData.cloudFileStatus || 'complete'
    };

    Object.keys(cleanDocData).forEach((key) => {
      if (cleanDocData[key] === undefined) {
        delete cleanDocData[key];
      }
    });

    await setDoc(docRef, cleanDocData, { merge: true });

    // 2. Save binary to 'document_files' collection if buffer provided
    if (fileBuffer) {
      const fileDocRef = doc(firestoreInstance, 'document_files', docData.id);
      const b64 = fileBuffer.toString('base64');

      // Check BASE64 length (Firestore 1 MiB doc limit; keep inline <= 650 KB base64)
      const MAX_INLINE_B64 = 650 * 1024;
      const CHUNK_B64_SIZE = 500 * 1024; // 500 KB per chunk (well below 1 MiB & 850KB rule limit)

      if (b64.length <= MAX_INLINE_B64) {
        await clearExistingChunks(docData.id);
        await setDoc(
          fileDocRef,
          {
            docId: docData.id,
            fileName: docData.namaFileAsli,
            mimeType: docData.tipeMime || 'application/pdf',
            size: fileBuffer.length,
            base64: b64,
            chunked: false,
            totalChunks: 0,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
        return { success: true, totalChunks: 0 };
      } else {
        // Clear stale chunks before writing new chunk set
        await clearExistingChunks(docData.id);

        const totalChunks = Math.ceil(b64.length / CHUNK_B64_SIZE);
        await setDoc(
          fileDocRef,
          {
            docId: docData.id,
            fileName: docData.namaFileAsli,
            mimeType: docData.tipeMime || 'application/pdf',
            size: fileBuffer.length,
            base64: deleteField(),
            chunked: true,
            totalChunks,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );

        // Upload chunks in parallel batches of 5 so large PDFs (up to 50MB) finish reliably
        const PARALLEL_BATCH = 5;
        for (let start = 0; start < totalChunks; start += PARALLEL_BATCH) {
          const batchPromises: Promise<void>[] = [];
          const end = Math.min(start + PARALLEL_BATCH, totalChunks);
          for (let i = start; i < end; i++) {
            const chunkStr = b64.substring(i * CHUNK_B64_SIZE, (i + 1) * CHUNK_B64_SIZE);
            const chunkRef = doc(firestoreInstance, `document_files/${docData.id}/chunks`, `chunk_${i}`);
            batchPromises.push(setDoc(chunkRef, { index: i, data: chunkStr }));
          }
          await Promise.all(batchPromises);
        }

        // Verify all chunks exist in Firestore
        const verifySnap = await getDocs(collection(firestoreInstance, `document_files/${docData.id}/chunks`));
        if (verifySnap.size < totalChunks) {
          throw new Error(`Hanya ${verifySnap.size} dari ${totalChunks} potongan berkas yang tersimpan di Cloud Firestore.`);
        }

        return { success: true, totalChunks };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[FirestoreService] Error saving document ${docData.id} to cloud:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves genuine file payload from Firestore 'document_files'.
 * Validates chunk completeness so partial/broken pre-fix records don't serve corrupt data.
 */
export async function getDocumentFileFromCloud(
  docId: string
): Promise<{ buffer: Buffer; fileName: string; mimeType: string } | null> {
  if (!firestoreInstance) return null;

  try {
    const fileDocRef = doc(firestoreInstance, 'document_files', docId);
    const snap = await getDoc(fileDocRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    if (!data.chunked && data.base64) {
      return {
        buffer: Buffer.from(data.base64, 'base64'),
        fileName: data.fileName || `${docId}.pdf`,
        mimeType: data.mimeType || 'application/pdf'
      };
    }

    if (data.chunked && data.totalChunks) {
      const chunksCol = collection(firestoreInstance, `document_files/${docId}/chunks`);
      const chunksSnap = await getDocs(chunksCol);

      if (chunksSnap.size === 0 || chunksSnap.size < data.totalChunks) {
        console.warn(
          `[FirestoreService] Document ${docId} missing chunks in Firestore: found ${chunksSnap.size}/${data.totalChunks}`
        );
        return null;
      }

      const orderedChunks = chunksSnap.docs
        .map((d) => d.data() as { index: number; data: string })
        .sort((a, b) => a.index - b.index);

      const fullBase64 = orderedChunks.map((c) => c.data || '').join('');
      if (!fullBase64) return null;

      return {
        buffer: Buffer.from(fullBase64, 'base64'),
        fileName: data.fileName || `${docId}.pdf`,
        mimeType: data.mimeType || 'application/pdf'
      };
    }

    return null;
  } catch (err: any) {
    console.error(`[FirestoreService] Error fetching file ${docId} from cloud:`, err);
    return null;
  }
}

/**
 * Checks integrity of all document_files records in Cloud Firestore
 */
export async function getCloudFilesIntegrityMap(): Promise<Map<string, 'complete' | 'missing_chunks'>> {
  const result = new Map<string, 'complete' | 'missing_chunks'>();
  if (!firestoreInstance) return result;

  try {
    const filesSnap = await getDocs(collection(firestoreInstance, 'document_files'));
    await Promise.all(
      filesSnap.docs.map(async (fDoc) => {
        const data = fDoc.data();
        if (!data.chunked) {
          result.set(fDoc.id, data.base64 ? 'complete' : 'missing_chunks');
        } else {
          try {
            const chunksSnap = await getDocs(collection(firestoreInstance, `document_files/${fDoc.id}/chunks`));
            const expected = data.totalChunks || 1;
            result.set(fDoc.id, chunksSnap.size >= expected ? 'complete' : 'missing_chunks');
          } catch {
            result.set(fDoc.id, 'missing_chunks');
          }
        }
      })
    );
  } catch (err: any) {
    console.warn('[FirestoreService] Integrity check warning:', err.message);
  }
  return result;
}

/**
 * Fetches all documents saved in Firestore
 */
export async function getAllDocumentsFromCloud(): Promise<InvestmentDocument[] | null> {
  if (!firestoreInstance) return null;
  try {
    const colRef = collection(firestoreInstance, 'documents');
    const snapshot = await getDocs(colRef);
    const docs: InvestmentDocument[] = [];
    snapshot.forEach((snap) => {
      docs.push(snap.data() as InvestmentDocument);
    });
    return docs;
  } catch (err: any) {
    console.error('[FirestoreService] Error fetching all docs from cloud:', err);
    return null;
  }
}

/**
 * Deletes document metadata, file header, and all chunks from Firestore
 */
export async function deleteDocumentFromCloud(docId: string): Promise<boolean> {
  if (!firestoreInstance) return false;
  try {
    await clearExistingChunks(docId);
    await deleteDoc(doc(firestoreInstance, 'document_files', docId));
    await deleteDoc(doc(firestoreInstance, 'documents', docId));
    return true;
  } catch (err: any) {
    console.error(`[FirestoreService] Error deleting doc ${docId} from cloud:`, err);
    return false;
  }
}

export interface FirestoreGithubIntegration {
  provider: 'github';
  connected: boolean;
  githubLogin?: string;
  githubName?: string;
  githubEmail?: string;
  avatarUrl?: string;
  owner?: string;
  repo?: string;
  branch?: string;
  folderPath?: string;
  organizeByYearType?: boolean;
  autoSyncOnUpload?: boolean;
  updatedAt: string;
}

/**
 * Saves non-secret GitHub integration metadata (repo, branch, folder, connected user) to Firestore
 */
export async function saveGithubConfigToCloud(
  cfg: Omit<FirestoreGithubIntegration, 'provider' | 'updatedAt'>
): Promise<boolean> {
  if (!firestoreInstance) return false;
  try {
    const cleanPayload: any = {
      provider: 'github',
      connected: Boolean(cfg.connected),
      githubLogin: cfg.githubLogin || '',
      githubName: cfg.githubName || '',
      githubEmail: cfg.githubEmail || '',
      avatarUrl: cfg.avatarUrl || '',
      owner: cfg.owner || '',
      repo: cfg.repo || '',
      branch: cfg.branch || 'main',
      folderPath: cfg.folderPath || 'dokumen-investasi-capex',
      organizeByYearType: cfg.organizeByYearType !== false,
      autoSyncOnUpload: cfg.autoSyncOnUpload !== false,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(firestoreInstance, 'integrations', 'github'), cleanPayload, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[FirestoreService] Error saving GitHub config to cloud:', err.message);
    return false;
  }
}

/**
 * Loads non-secret GitHub integration metadata from Firestore
 */
export async function getGithubConfigFromCloud(): Promise<FirestoreGithubIntegration | null> {
  if (!firestoreInstance) return null;
  try {
    const snap = await getDoc(doc(firestoreInstance, 'integrations', 'github'));
    if (!snap.exists()) return null;
    return snap.data() as FirestoreGithubIntegration;
  } catch (err: any) {
    console.warn('[FirestoreService] Error loading GitHub config from cloud:', err.message);
    return null;
  }
}


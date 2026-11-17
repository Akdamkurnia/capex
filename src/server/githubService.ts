import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  GitHubRepoConfig,
  GitHubRepoSummary,
  GitHubStatusResponse,
  GitHubUserSummary,
  InvestmentDocument
} from '../types';
import {
  getGithubConfigFromCloud,
  saveGithubConfigToCloud
} from './firestoreService';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const GITHUB_SESSION_FILE = path.resolve(DATA_DIR, 'github_session.json');

interface PersistedGithubSession {
  accessToken?: string;
  user?: GitHubUserSummary | null;
  repoConfig?: GitHubRepoConfig | null;
  updatedAt?: string;
}

const DEFAULT_REPO_CONFIG: GitHubRepoConfig = {
  owner: '',
  repo: '',
  branch: 'main',
  folderPath: 'dokumen-investasi-capex',
  organizeByYearType: true,
  autoSyncOnUpload: true
};

// In-memory store backed by local server file (never exposed to Firestore or frontend)
let currentSession: PersistedGithubSession = {
  user: null,
  repoConfig: { ...DEFAULT_REPO_CONFIG }
};

// Multi-session cookie token map (sid -> accessToken) so browser cookie auth works too
const cookieSessions = new Map<string, { accessToken: string; user: GitHubUserSummary }>();
const oauthStates = new Map<string, number>();

function loadPersistedSession() {
  try {
    if (fs.existsSync(GITHUB_SESSION_FILE)) {
      const raw = fs.readFileSync(GITHUB_SESSION_FILE, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw) as PersistedGithubSession;
        currentSession = {
          accessToken: parsed.accessToken,
          user: parsed.user || null,
          repoConfig: {
            ...DEFAULT_REPO_CONFIG,
            ...(parsed.repoConfig || {})
          },
          updatedAt: parsed.updatedAt
        };
      }
    }
  } catch (err: any) {
    console.warn('[GitHubService] Failed to load persisted session:', err.message);
  }
}

function persistSession() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(GITHUB_SESSION_FILE, JSON.stringify(currentSession, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[GitHubService] Failed to persist session:', err.message);
  }
}

loadPersistedSession();

export function isGithubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim());
}

export function getGithubCallbackUrl(): string {
  const baseUrl = (process.env.APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
  return `${baseUrl}/auth/github/callback`;
}

export function createOAuthState(): string {
  const now = Date.now();
  // Prune expired states (>15 min)
  for (const [k, ts] of oauthStates.entries()) {
    if (now - ts > 15 * 60 * 1000) oauthStates.delete(k);
  }
  const state = crypto.randomBytes(20).toString('hex');
  oauthStates.set(state, now);
  return state;
}

export function verifyOAuthState(state?: string): boolean {
  if (!state) return false;
  const ts = oauthStates.get(state);
  if (!ts) return false;
  oauthStates.delete(state);
  return Date.now() - ts <= 15 * 60 * 1000;
}

export function buildGithubAuthorizeUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim() || '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGithubCallbackUrl(),
    scope: 'repo read:user user:email',
    state,
    allow_signup: 'true'
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGithubCode(code: string): Promise<{ accessToken: string; scope?: string }> {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID atau GITHUB_CLIENT_SECRET belum diatur di environment.');
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getGithubCallbackUrl()
    })
  });

  const data = (await res.json()) as any;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Gagal menukar kode OAuth GitHub.');
  }

  return {
    accessToken: data.access_token,
    scope: data.scope
  };
}

async function githubFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'DALISTA-PT-Pos-Indonesia',
      ...(init?.headers || {})
    }
  });
  return res;
}

export async function fetchGithubUserProfile(accessToken: string): Promise<GitHubUserSummary> {
  const userRes = await githubFetch('https://api.github.com/user', accessToken);
  if (!userRes.ok) {
    const errText = await userRes.text();
    throw new Error(`GitHub user fetch failed (${userRes.status}): ${errText}`);
  }
  const userJson = (await userRes.json()) as any;

  let resolvedEmail: string | undefined = userJson.email || undefined;
  try {
    const emailsRes = await githubFetch('https://api.github.com/user/emails', accessToken);
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
      if (primary?.email) resolvedEmail = primary.email;
    }
  } catch {
    // Non-fatal if email scope unavailable
  }

  return {
    login: userJson.login,
    name: userJson.name || userJson.login,
    email: resolvedEmail,
    avatarUrl: userJson.avatar_url,
    profileUrl: userJson.html_url
  };
}

export async function saveConnectedGithubAccount(
  accessToken: string,
  user: GitHubUserSummary
): Promise<string> {
  const sid = crypto.randomBytes(24).toString('hex');
  cookieSessions.set(sid, { accessToken, user });

  // Merge existing repoConfig (from local or Firestore)
  const cloudCfg = await getGithubConfigFromCloud();
  const mergedRepoConfig: GitHubRepoConfig = {
    ...DEFAULT_REPO_CONFIG,
    ...(cloudCfg
      ? {
          owner: cloudCfg.owner || '',
          repo: cloudCfg.repo || '',
          branch: cloudCfg.branch || 'main',
          folderPath: cloudCfg.folderPath || 'dokumen-investasi-capex',
          organizeByYearType: cloudCfg.organizeByYearType !== false,
          autoSyncOnUpload: cloudCfg.autoSyncOnUpload !== false
        }
      : {}),
    ...(currentSession.repoConfig || {}),
    owner: (currentSession.repoConfig?.owner || cloudCfg?.owner || user.login).trim()
  };

  currentSession = {
    accessToken,
    user,
    repoConfig: mergedRepoConfig,
    updatedAt: new Date().toISOString()
  };
  persistSession();

  await saveGithubConfigToCloud({
    connected: true,
    githubLogin: user.login,
    githubName: user.name,
    githubEmail: user.email,
    avatarUrl: user.avatarUrl,
    ...mergedRepoConfig
  });

  return sid;
}

export function getActiveAccessToken(sidCookie?: string): string | null {
  if (sidCookie && cookieSessions.has(sidCookie)) {
    return cookieSessions.get(sidCookie)!.accessToken;
  }
  return currentSession.accessToken || null;
}

export async function getGithubStatus(sidCookie?: string): Promise<GitHubStatusResponse> {
  const token = getActiveAccessToken(sidCookie);
  const cloudCfg = await getGithubConfigFromCloud();

  const repoConfig: GitHubRepoConfig | null =
    currentSession.repoConfig?.repo || cloudCfg?.repo
      ? {
          owner: currentSession.repoConfig?.owner || cloudCfg?.owner || '',
          repo: currentSession.repoConfig?.repo || cloudCfg?.repo || '',
          branch: currentSession.repoConfig?.branch || cloudCfg?.branch || 'main',
          folderPath: currentSession.repoConfig?.folderPath || cloudCfg?.folderPath || 'dokumen-investasi-capex',
          organizeByYearType:
            currentSession.repoConfig?.organizeByYearType ?? (cloudCfg?.organizeByYearType !== false),
          autoSyncOnUpload:
            currentSession.repoConfig?.autoSyncOnUpload ?? (cloudCfg?.autoSyncOnUpload !== false)
        }
      : currentSession.repoConfig || { ...DEFAULT_REPO_CONFIG };

  let activeUser: GitHubUserSummary | null =
    (sidCookie && cookieSessions.get(sidCookie)?.user) || currentSession.user || null;

  if (!activeUser && cloudCfg?.githubLogin && token) {
    activeUser = {
      login: cloudCfg.githubLogin,
      name: cloudCfg.githubName,
      email: cloudCfg.githubEmail,
      avatarUrl: cloudCfg.avatarUrl
    };
  }

  return {
    oauthConfigured: isGithubOAuthConfigured(),
    callbackUrl: getGithubCallbackUrl(),
    connected: Boolean(token && activeUser),
    user: token ? activeUser : null,
    repoConfig,
    updatedAt: currentSession.updatedAt || cloudCfg?.updatedAt
  };
}

export async function disconnectGithub(sidCookie?: string): Promise<void> {
  if (sidCookie) cookieSessions.delete(sidCookie);
  currentSession = {
    accessToken: undefined,
    user: null,
    repoConfig: currentSession.repoConfig || { ...DEFAULT_REPO_CONFIG },
    updatedAt: new Date().toISOString()
  };
  persistSession();

  await saveGithubConfigToCloud({
    connected: false,
    ...(currentSession.repoConfig || DEFAULT_REPO_CONFIG)
  });
}

export async function listGithubRepositories(accessToken: string): Promise<GitHubRepoSummary[]> {
  const res = await githubFetch(
    'https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member',
    accessToken
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as any;
    throw new Error(err.message || `Gagal mengambil daftar repositori GitHub (${res.status})`);
  }
  const repos = (await res.json()) as any[];
  return repos.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner?.login || '',
    private: Boolean(r.private),
    defaultBranch: r.default_branch || 'main',
    htmlUrl: r.html_url,
    updatedAt: r.updated_at
  }));
}

export async function createGithubRepository(
  accessToken: string,
  params: { name: string; description?: string; isPrivate?: boolean }
): Promise<GitHubRepoSummary> {
  const cleanName = params.name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  if (!cleanName) {
    throw new Error('Nama repositori GitHub tidak valid.');
  }

  const res = await githubFetch('https://api.github.com/user/repos', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: cleanName,
      description:
        params.description?.trim() ||
        'Repositori arsip dokumen investasi CAPEX PT Pos Indonesia (DALISTA)',
      private: params.isPrivate !== false,
      auto_init: true
    })
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const detail = data.errors?.[0]?.message || data.message || `HTTP ${res.status}`;
    throw new Error(`Gagal membuat repositori GitHub: ${detail}`);
  }

  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    owner: data.owner?.login || '',
    private: Boolean(data.private),
    defaultBranch: data.default_branch || 'main',
    htmlUrl: data.html_url,
    updatedAt: data.updated_at
  };
}

export async function updateGithubRepoConfig(
  cfg: Partial<GitHubRepoConfig>,
  sidCookie?: string
): Promise<GitHubRepoConfig> {
  const sanitizedFolder = (cfg.folderPath ?? currentSession.repoConfig?.folderPath ?? 'dokumen-investasi-capex')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.{2,}/g, '');

  const updated: GitHubRepoConfig = {
    owner: (cfg.owner ?? currentSession.repoConfig?.owner ?? currentSession.user?.login ?? '').trim(),
    repo: (cfg.repo ?? currentSession.repoConfig?.repo ?? '').trim(),
    branch: (cfg.branch ?? currentSession.repoConfig?.branch ?? 'main').trim() || 'main',
    folderPath: sanitizedFolder || 'dokumen-investasi-capex',
    organizeByYearType:
      cfg.organizeByYearType !== undefined
        ? Boolean(cfg.organizeByYearType)
        : currentSession.repoConfig?.organizeByYearType ?? true,
    autoSyncOnUpload:
      cfg.autoSyncOnUpload !== undefined
        ? Boolean(cfg.autoSyncOnUpload)
        : currentSession.repoConfig?.autoSyncOnUpload ?? true
  };

  currentSession.repoConfig = updated;
  currentSession.updatedAt = new Date().toISOString();
  persistSession();

  const status = await getGithubStatus(sidCookie);
  await saveGithubConfigToCloud({
    connected: status.connected,
    githubLogin: status.user?.login,
    githubName: status.user?.name,
    githubEmail: status.user?.email,
    avatarUrl: status.user?.avatarUrl,
    ...updated
  });

  return updated;
}

export function buildDocumentGithubPath(doc: InvestmentDocument, cfg: GitHubRepoConfig): string {
  const rootFolder = (cfg.folderPath || 'dokumen-investasi-capex')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  const safeOriginal = (doc.namaFileAsli || `${doc.id}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${doc.id}_${safeOriginal}`;

  if (cfg.organizeByYearType) {
    const tahun = doc.tahunAnggaran || 2026;
    const jenis = (doc.jenisDokumen || 'DOKUMEN').replace(/[^a-zA-Z0-9_-]/g, '-');
    return `${rootFolder}/TA-${tahun}/${jenis}/${fileName}`;
  }
  return `${rootFolder}/${fileName}`;
}

function encodeGithubPath(repoPath: string): string {
  return repoPath
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

export async function commitDocumentToGithub(
  doc: InvestmentDocument,
  fileBuffer: Buffer,
  sidCookie?: string
): Promise<{
  success: boolean;
  skipped?: boolean;
  error?: string;
  githubRepo?: string;
  githubBranch?: string;
  githubPath?: string;
  githubUrl?: string;
  githubSha?: string;
  githubSyncedAt?: string;
}> {
  const status = await getGithubStatus(sidCookie);
  const accessToken = getActiveAccessToken(sidCookie);
  const cfg = status.repoConfig;

  if (!status.connected || !accessToken) {
    return { success: false, skipped: true, error: 'Akun GitHub belum terhubung.' };
  }
  if (!cfg?.owner || !cfg?.repo) {
    return { success: false, skipped: true, error: 'Repositori GitHub tujuan belum dipilih.' };
  }

  const branch = cfg.branch || 'main';
  const targetPath = buildDocumentGithubPath(doc, cfg);
  const encodedPath = encodeGithubPath(targetPath);
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodedPath}`;

  try {
    // Check if file exists so we include existing SHA on version updates
    let existingSha: string | undefined = undefined;
    const checkRes = await githubFetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, accessToken);
    if (checkRes.ok) {
      const existingData = (await checkRes.json()) as any;
      if (existingData?.sha) existingSha = existingData.sha;
    }

    const commitPayload: Record<string, any> = {
      message: `[DALISTA] Upload ${doc.jenisDokumen} ${doc.nomorDokumen} (${doc.namaFileAsli})`,
      content: fileBuffer.toString('base64'),
      branch
    };
    if (existingSha) commitPayload.sha = existingSha;

    const putRes = await githubFetch(apiUrl, accessToken, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commitPayload)
    });

    const putData = (await putRes.json().catch(() => ({}))) as any;
    if (!putRes.ok) {
      const msg = putData.message || `GitHub API error (${putRes.status})`;
      return { success: false, error: msg };
    }

    return {
      success: true,
      githubRepo: `${cfg.owner}/${cfg.repo}`,
      githubBranch: branch,
      githubPath: putData.content?.path || targetPath,
      githubUrl: putData.content?.html_url || `https://github.com/${cfg.owner}/${cfg.repo}/blob/${branch}/${targetPath}`,
      githubSha: putData.content?.sha,
      githubSyncedAt: new Date().toISOString()
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghubungi API GitHub.' };
  }
}

export async function deleteDocumentFromGithub(
  doc: InvestmentDocument,
  sidCookie?: string
): Promise<boolean> {
  if (!doc.githubRepo || !doc.githubPath) return false;
  const accessToken = getActiveAccessToken(sidCookie);
  if (!accessToken) return false;

  const [owner, repo] = doc.githubRepo.split('/');
  if (!owner || !repo) return false;

  const branch = doc.githubBranch || 'main';
  const encodedPath = encodeGithubPath(doc.githubPath);
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;

  try {
    let sha = doc.githubSha;
    if (!sha) {
      const getRes = await githubFetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, accessToken);
      if (!getRes.ok) return false;
      const getData = (await getRes.json()) as any;
      sha = getData.sha;
    }
    if (!sha) return false;

    const delRes = await githubFetch(apiUrl, accessToken, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[DALISTA] Hapus dokumen ${doc.nomorDokumen} (${doc.namaFileAsli})`,
        sha,
        branch
      })
    });
    return delRes.ok;
  } catch {
    return false;
  }
}

export async function listGithubFolderContents(
  sidCookie?: string
): Promise<{
  files: Array<{ name: string; path: string; type: 'file' | 'dir'; size: number; htmlUrl: string }>;
  folderUrl: string;
}> {
  const status = await getGithubStatus(sidCookie);
  const accessToken = getActiveAccessToken(sidCookie);
  const cfg = status.repoConfig;

  if (!status.connected || !accessToken || !cfg?.owner || !cfg?.repo) {
    return { files: [], folderUrl: '' };
  }

  const branch = cfg.branch || 'main';
  const rootFolder = (cfg.folderPath || 'dokumen-investasi-capex').replace(/^\/+|\/+$/g, '');
  const folderUrl = `https://github.com/${cfg.owner}/${cfg.repo}/tree/${branch}/${rootFolder}`;

  // Use Git Tree recursive endpoint on branch to show nested TA-xxxx/Jenis files inside rootFolder!
  const treeRes = await githubFetch(
    `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    accessToken
  );

  if (!treeRes.ok) {
    return { files: [], folderUrl };
  }

  const treeData = (await treeRes.json()) as any;
  const prefix = `${rootFolder}/`;
  const files = (treeData.tree || [])
    .filter((item: any) => item.type === 'blob' && typeof item.path === 'string' && item.path.startsWith(prefix))
    .map((item: any) => ({
      name: item.path.split('/').pop() || item.path,
      path: item.path,
      type: 'file' as const,
      size: item.size || 0,
      htmlUrl: `https://github.com/${cfg.owner}/${cfg.repo}/blob/${branch}/${item.path}`
    }));

  return { files, folderUrl };
}

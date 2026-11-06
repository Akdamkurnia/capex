import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  INITIAL_WORK_PROGRAMS,
  INITIAL_DOCUMENTS,
  INITIAL_PROGRESS_RECORDS,
  INITIAL_REALIZATIONS,
  INITIAL_FINANCIAL_ANALYSES,
  INITIAL_NOTIFICATIONS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_AVAILABLE_YEARS
} from './src/server/mockData';
import {
  WorkProgram,
  InvestmentDocument,
  PhysicalProgressRecord,
  BudgetRealizationRelease,
  FinancialAnalysisFSBC,
  SystemNotification,
  AuditLog,
  DashboardStats,
  DocumentChecklistSummary,
  YearSummary,
  User
} from './src/types';

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Ensure data and uploads directories exist
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Create minimal valid PDF buffer for sample files
function createSamplePdfBuffer(title: string, proker: string): Buffer {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 18 Tf
50 720 Td
(PT POS INDONESIA - DALISTA) Tj
/F1 12 Tf
0 -30 Td
(${title.replace(/[()]/g, '')}) Tj
0 -20 Td
(Program Kerja: ${proker.replace(/[()]/g, '')}) Tj
0 -20 Td
(Dokumen ini adalah arsip resmi investasi CAPEX PT Pos Indonesia.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000247 00000 n 
0000000499 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
570
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

// Ensure sample pdf files exist
const sampleFiles = [
  { name: 'sample_pks.pdf', title: 'Perjanjian Kerja Sama (PKS)', proker: 'HCM1.5a.1.26' },
  { name: 'sample_spk.pdf', title: 'Surat Perintah Kerja (SPK)', proker: 'KUR 1.2.8.26' },
  { name: 'sample_bapp.pdf', title: 'Berita Acara Pemeriksaan Pekerjaan (BAPP)', proker: 'PRO 1.1.2.26' },
  { name: 'sample_invoice.pdf', title: 'Invoice Tagihan Vendor', proker: 'PRO 1.1.2.26' },
  { name: 'sample_fsbc.pdf', title: 'Feasibility Study & Business Case (FS-BC)', proker: 'HCM1.5a.1.26' }
];

sampleFiles.forEach(sf => {
  const filePath = path.join(UPLOADS_DIR, sf.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, createSamplePdfBuffer(sf.title, sf.proker));
  }
});

// Database state
const DB_FILE = path.join(DATA_DIR, 'db.json');
interface DatabaseState {
  availableYears: number[];
  workPrograms: WorkProgram[];
  documents: InvestmentDocument[];
  progressRecords: PhysicalProgressRecord[];
  realizations: BudgetRealizationRelease[];
  financialAnalyses: FinancialAnalysisFSBC[];
  notifications: SystemNotification[];
  auditLogs: AuditLog[];
  users: User[];
}

let db: DatabaseState = {
  availableYears: [...INITIAL_AVAILABLE_YEARS],
  workPrograms: [...INITIAL_WORK_PROGRAMS],
  documents: [...INITIAL_DOCUMENTS],
  progressRecords: [...INITIAL_PROGRESS_RECORDS],
  realizations: [...INITIAL_REALIZATIONS],
  financialAnalyses: [...INITIAL_FINANCIAL_ANALYSES],
  notifications: [...INITIAL_NOTIFICATIONS],
  auditLogs: [...INITIAL_AUDIT_LOGS],
  users: [...INITIAL_USERS]
};

if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    db = { ...db, ...parsed };

    // Merge missing historical prokers if any
    INITIAL_WORK_PROGRAMS.forEach(initP => {
      if (!db.workPrograms.some(p => p.id === initP.id || p.kodeProker === initP.kodeProker)) {
        db.workPrograms.push(initP);
      }
    });

    // Merge missing documents if any
    INITIAL_DOCUMENTS.forEach(initDoc => {
      if (!db.documents.some(d => d.id === initDoc.id)) {
        db.documents.push(initDoc);
      }
    });

    // Merge missing realizations if any
    INITIAL_REALIZATIONS.forEach(initR => {
      if (!db.realizations.some(r => r.id === initR.id)) {
        db.realizations.push(initR);
      }
    });

    // Ensure every document and realization has tahunAnggaran
    const prokerYearMap = new Map(db.workPrograms.map(p => [p.id, p.tahunAnggaran]));
    db.documents.forEach(d => {
      if (!d.tahunAnggaran) {
        d.tahunAnggaran = prokerYearMap.get(d.prokerId) || 2026;
      }
    });

    db.realizations.forEach(r => {
      if (!r.tahunAnggaran) {
        if (r.tglPosting) {
          const yr = new Date(r.tglPosting).getFullYear();
          if (!isNaN(yr)) r.tahunAnggaran = yr;
        }
        if (!r.tahunAnggaran) {
          r.tahunAnggaran = prokerYearMap.get(r.prokerId) || 2026;
        }
      }
    });

    // Ensure availableYears is populated
    if (!db.availableYears || db.availableYears.length === 0) {
      db.availableYears = [...INITIAL_AVAILABLE_YEARS];
    } else {
      INITIAL_AVAILABLE_YEARS.forEach(y => {
        if (!db.availableYears.includes(y)) db.availableYears.push(y);
      });
    }

    // Ensure all work program financial numbers (RKAP, Kontrak, Rilis, Aktual, etc.) are strictly in Miliar
    db.workPrograms.forEach(p => {
      if (Math.abs(p.nilaiCapexRkap) >= 1_000_000) p.nilaiCapexRkap = parseFloat((p.nilaiCapexRkap / 1_000_000_000).toFixed(4));
      if (Math.abs(p.nilaiKontrak) >= 1_000_000) p.nilaiKontrak = parseFloat((p.nilaiKontrak / 1_000_000_000).toFixed(4));
      if (Math.abs(p.nilaiRilis) >= 1_000_000) p.nilaiRilis = parseFloat((p.nilaiRilis / 1_000_000_000).toFixed(4));
      if (Math.abs(p.nilaiAktual) >= 1_000_000) p.nilaiAktual = parseFloat((p.nilaiAktual / 1_000_000_000).toFixed(4));
      if (Math.abs(p.nilaiNpp) >= 1_000_000) p.nilaiNpp = parseFloat((p.nilaiNpp / 1_000_000_000).toFixed(4));
      if (Math.abs(p.nilaiOgp) >= 1_000_000) p.nilaiOgp = parseFloat((p.nilaiOgp / 1_000_000_000).toFixed(4));
      if (Math.abs(p.nilaiAccrue) >= 1_000_000) p.nilaiAccrue = parseFloat((p.nilaiAccrue / 1_000_000_000).toFixed(4));
      if (Math.abs(p.belumOgp) >= 1_000_000) p.belumOgp = parseFloat((p.belumOgp / 1_000_000_000).toFixed(4));
      if (Math.abs(p.sisaAccrue) >= 1_000_000) p.sisaAccrue = parseFloat((p.sisaAccrue / 1_000_000_000).toFixed(4));
    });

    // Also collect any years from workPrograms
    db.workPrograms.forEach(p => {
      if (p.tahunAnggaran && !db.availableYears.includes(p.tahunAnggaran)) {
        db.availableYears.push(p.tahunAnggaran);
      }
    });
    db.availableYears.sort((a, b) => a - b);

    // Ensure users array is initialized
    if (!db.users || !Array.isArray(db.users) || db.users.length === 0) {
      db.users = [...INITIAL_USERS];
    } else {
      INITIAL_USERS.forEach(initU => {
        if (!db.users.some(u => u.id === initU.id)) {
          db.users.push(initU);
        }
      });
    }
  } catch (e) {
    console.error('Failed reading existing DB, using defaults', e);
  }
}

function normalizeToMiliar(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return 0;
  if (Math.abs(num) >= 1_000_000) {
    return parseFloat((num / 1_000_000_000).toFixed(4));
  }
  return parseFloat(num.toFixed(4));
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

function logAudit(
  userId: string,
  userName: string,
  userRole: any,
  action: string,
  entityType: any,
  entityId: string,
  details: string,
  req?: Request
) {
  const audit: AuditLog = {
    id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    userId: userId || 'USR-001',
    userName: userName || 'Budi Santoso',
    userRole: userRole || 'Administrator',
    action,
    entityType,
    entityId,
    details,
    ipAddress: req?.ip || '127.0.0.1'
  };
  db.auditLogs.unshift(audit);
  if (db.auditLogs.length > 300) db.auditLogs.pop();
  saveDb();
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploaded files safely
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper: Calculate Document Checklist
function calculateDocumentChecklist(prokerId: string): DocumentChecklistSummary {
  const docs = db.documents.filter(d => d.prokerId === prokerId);
  const pks = docs.filter(d => d.jenisDokumen === 'PKS');
  const spk = docs.filter(d => d.jenisDokumen === 'SPK');
  const invoice = docs.filter(d => d.jenisDokumen === 'Invoice');
  const bapp = docs.filter(d => d.jenisDokumen === 'BAPP');
  const fsBc = docs.filter(d => d.jenisDokumen === 'FS-BC');

  const pksDone = pks.some(d => d.statusVerifikasi === 'Terverifikasi');
  const spkDone = spk.some(d => d.statusVerifikasi === 'Terverifikasi');
  const invDone = invoice.some(d => d.statusVerifikasi === 'Terverifikasi');
  const bappDone = bapp.some(d => d.statusVerifikasi === 'Terverifikasi');
  const fsDone = fsBc.some(d => d.statusVerifikasi === 'Terverifikasi');

  const completed = (pksDone ? 1 : 0) + (spkDone ? 1 : 0) + (invDone ? 1 : 0) + (bappDone ? 1 : 0) + (fsDone ? 1 : 0);
  const percentage = Math.round((completed / 5) * 100);

  return {
    pks: { count: pks.length, verified: pksDone, hasDoc: pks.length > 0 },
    spk: { count: spk.length, verified: spkDone, hasDoc: spk.length > 0 },
    invoice: { count: invoice.length, verified: invDone, hasDoc: invoice.length > 0 },
    bapp: { count: bapp.length, verified: bappDone, hasDoc: bapp.length > 0 },
    fsBc: { count: fsBc.length, verified: fsDone, hasDoc: fsBc.length > 0 },
    totalMandatory: 5,
    completedMandatory: completed,
    completenessPercentage: percentage
  };
}

// ==================== REST APIS ==================== //

// 0. Years Endpoints
app.get('/api/years', (_req: Request, res: Response) => {
  db.workPrograms.forEach(p => {
    if (p.tahunAnggaran && !db.availableYears.includes(p.tahunAnggaran)) {
      db.availableYears.push(p.tahunAnggaran);
    }
  });
  db.availableYears.sort((a, b) => a - b);
  res.json(db.availableYears);
});

app.post('/api/years', (req: Request, res: Response) => {
  const { tahun, userId, userName, userRole } = req.body;
  const numYear = parseInt(tahun);
  if (!numYear || numYear < 2000 || numYear > 2100) {
    return res.status(400).json({ error: 'Tahun anggaran tidak valid (antara 2000 - 2100)' });
  }

  if (!db.availableYears.includes(numYear)) {
    db.availableYears.push(numYear);
    db.availableYears.sort((a, b) => a - b);
    saveDb();
    logAudit(userId, userName, userRole, 'ADD_YEAR', 'CONFIG', numYear.toString(), `Menambahkan tahun anggaran baru: ${numYear}`, req);
  }

  res.status(201).json({ success: true, years: db.availableYears, addedYear: numYear });
});

// Multi-Year Aggregation
app.get('/api/dashboard/multi-year', (_req: Request, res: Response) => {
  db.workPrograms.forEach(p => {
    if (p.tahunAnggaran && !db.availableYears.includes(p.tahunAnggaran)) {
      db.availableYears.push(p.tahunAnggaran);
    }
  });
  db.availableYears.sort((a, b) => a - b);

  const summaries: YearSummary[] = db.availableYears.map(thn => {
    const prokers = db.workPrograms.filter(p => p.tahunAnggaran === thn);
    const totalRkap = prokers.reduce((a, b) => a + (b.nilaiCapexRkap || 0), 0);
    const totalAktual = prokers.reduce((a, b) => a + (b.nilaiAktual || 0), 0);
    const serapan = totalRkap > 0 ? (totalAktual / totalRkap) * 100 : 0;
    const sumProg = prokers.reduce((a, b) => a + (b.progresFisik || 0), 0);
    const avgProg = prokers.length > 0 ? sumProg / prokers.length : 0;

    return {
      tahun: thn,
      totalProker: prokers.length,
      totalAnggaranCapex: parseFloat(totalRkap.toFixed(2)),
      totalRealisasi: parseFloat(totalAktual.toFixed(2)),
      persentaseSerapan: parseFloat(serapan.toFixed(2)),
      rataRataProgres: parseFloat(avgProg.toFixed(2)),
      prokerSelesai: prokers.filter(p => p.statusProyek === 'Selesai').length,
      prokerProses: prokers.filter(p => p.statusProyek === 'Proses').length,
      prokerBelumMulai: prokers.filter(p => p.statusProyek === 'Belum Mulai').length
    };
  });

  res.json(summaries);
});

// 1. Dashboard Stats
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  const { tahun, owner, direktorat, bosie } = req.query;

  let filtered = db.workPrograms;
  if (tahun && tahun !== 'Semua') {
    filtered = filtered.filter(p => p.tahunAnggaran.toString() === tahun.toString());
  }
  if (owner && owner !== 'Semua') {
    filtered = filtered.filter(p => p.ownerCategory.toLowerCase() === (owner as string).toLowerCase());
  }
  if (direktorat && direktorat !== 'Semua') {
    filtered = filtered.filter(p => p.direktorat === direktorat);
  }
  if (bosie && bosie !== 'Semua') {
    filtered = filtered.filter(p => p.jenisBosie === bosie);
  }

  const totalProker = filtered.length;
  const totalAnggaranCapex = parseFloat(filtered.reduce((acc, p) => acc + (p.nilaiCapexRkap || 0), 0).toFixed(2));
  const realisasiAnggaran = parseFloat(filtered.reduce((acc, p) => acc + (p.nilaiAktual || 0), 0).toFixed(2));
  const persentaseSerapan = totalAnggaranCapex > 0 ? parseFloat(((realisasiAnggaran / totalAnggaranCapex) * 100).toFixed(2)) : 0;
  
  const sumProgress = filtered.reduce((acc, p) => acc + (p.progresFisik || 0), 0);
  const rataRataProgresFisik = totalProker > 0 ? parseFloat((sumProgress / totalProker).toFixed(2)) : 0;

  const proyekTerlambatCount = filtered.filter(p => p.statusJadwal === 'Terlambat').length;
  const proyekBelumMulaiCount = filtered.filter(p => p.statusProyek === 'Belum Mulai').length;

  // Documents incomplete count
  let dokumenBelumLengkapCount = 0;
  filtered.forEach(p => {
    const chk = calculateDocumentChecklist(p.id);
    if (chk.completenessPercentage < 100) dokumenBelumLengkapCount++;
  });

  // Status Proker donut
  const statusProker = {
    belumMulai: filtered.filter(p => p.statusProyek === 'Belum Mulai').length,
    proses: filtered.filter(p => p.statusProyek === 'Proses').length,
    selesai: filtered.filter(p => p.statusProyek === 'Selesai').length
  };

  // Waktu Pelaksanaan donut
  const waktuPelaksanaan = {
    terdepan: filtered.filter(p => p.statusJadwal === 'Terdepan').length,
    sesuai: filtered.filter(p => p.statusJadwal === 'Sesuai').length,
    terlambat: filtered.filter(p => p.statusJadwal === 'Terlambat').length
  };

  // Distribusi Owner donut
  const distribusiOwner = {
    induk: filtered.filter(p => p.ownerCategory === 'Induk').length,
    poslog: filtered.filter(p => p.ownerCategory === 'Poslog').length,
    posdig: filtered.filter(p => p.ownerCategory === 'Posdig').length,
    pospro: filtered.filter(p => p.ownerCategory === 'Pospro').length,
    lainnya: filtered.filter(p => !['Induk', 'Poslog', 'Posdig', 'Pospro'].includes(p.ownerCategory)).length
  };

  // Realisasi per BOSIE
  const bosieMap: Record<string, { nama: string; rkap: number; realisasi: number }> = {
    B: { nama: 'Business Development', rkap: 0, realisasi: 0 },
    O: { nama: 'Operational Excellence', rkap: 0, realisasi: 0 },
    S: { nama: 'System Improvement', rkap: 0, realisasi: 0 },
    I: { nama: 'IT Infrastructure', rkap: 0, realisasi: 0 },
    E: { nama: 'Corporate Enabler', rkap: 0, realisasi: 0 }
  };

  filtered.forEach(p => {
    const key = p.jenisBosie;
    if (bosieMap[key]) {
      bosieMap[key].rkap += p.nilaiCapexRkap || 0;
      bosieMap[key].realisasi += p.nilaiAktual || 0;
    }
  });

  const realisasiPerBosie = Object.keys(bosieMap).map(k => {
    const item = bosieMap[k];
    const pct = item.rkap > 0 ? (item.realisasi / item.rkap) * 100 : 0;
    return {
      bosie: k as any,
      namaBosie: item.nama,
      rkap: parseFloat(item.rkap.toFixed(2)),
      realisasi: parseFloat(item.realisasi.toFixed(2)),
      persentase: parseFloat(pct.toFixed(2))
    };
  });

  // CAPEX vs Realisasi per Quarter (realistic breakdown)
  const capexVsRealisasiQuarter = [
    {
      quarter: 'Q1' as const,
      targetAnggaran: parseFloat((totalAnggaranCapex * 0.20).toFixed(2)),
      prognosa: parseFloat((totalAnggaranCapex * 0.18).toFixed(2)),
      realisasiAktual: parseFloat((realisasiAnggaran * 0.45).toFixed(2)),
      varians: parseFloat(((realisasiAnggaran * 0.45) - (totalAnggaranCapex * 0.20)).toFixed(2))
    },
    {
      quarter: 'Q2' as const,
      targetAnggaran: parseFloat((totalAnggaranCapex * 0.25).toFixed(2)),
      prognosa: parseFloat((totalAnggaranCapex * 0.22).toFixed(2)),
      realisasiAktual: parseFloat((realisasiAnggaran * 0.35).toFixed(2)),
      varians: parseFloat(((realisasiAnggaran * 0.35) - (totalAnggaranCapex * 0.25)).toFixed(2))
    },
    {
      quarter: 'Q3' as const,
      targetAnggaran: parseFloat((totalAnggaranCapex * 0.30).toFixed(2)),
      prognosa: parseFloat((totalAnggaranCapex * 0.28).toFixed(2)),
      realisasiAktual: parseFloat((realisasiAnggaran * 0.20).toFixed(2)),
      varians: parseFloat(((realisasiAnggaran * 0.20) - (totalAnggaranCapex * 0.30)).toFixed(2))
    },
    {
      quarter: 'Q4' as const,
      targetAnggaran: parseFloat((totalAnggaranCapex * 0.25).toFixed(2)),
      prognosa: parseFloat((totalAnggaranCapex * 0.32).toFixed(2)),
      realisasiAktual: parseFloat((realisasiAnggaran * 0.00).toFixed(2)),
      varians: parseFloat((0 - (totalAnggaranCapex * 0.25)).toFixed(2))
    }
  ];

  const stats: DashboardStats = {
    totalProker,
    totalAnggaranCapex,
    rataRataProgresFisik,
    realisasiAnggaran,
    persentaseSerapan,
    proyekTerlambatCount,
    proyekBelumMulaiCount,
    dokumenBelumLengkapCount,
    statusProker,
    waktuPelaksanaan,
    distribusiOwner,
    realisasiPerBosie,
    capexVsRealisasiQuarter
  };

  res.json(stats);
});

// 2. Work Program CRUD
app.get('/api/proker', (_req: Request, res: Response) => {
  res.json(db.workPrograms);
});

app.get('/api/proker/:id', (req: Request, res: Response) => {
  const item = db.workPrograms.find(p => p.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Program kerja tidak ditemukan' });
  const checklist = calculateDocumentChecklist(item.id);
  res.json({ ...item, checklist });
});

app.post('/api/proker', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.kodeProker || !body.namaProker) {
    return res.status(400).json({ error: 'Kode dan Nama Proker wajib diisi' });
  }

  // Check unique code
  if (db.workPrograms.some(p => p.kodeProker.toLowerCase() === body.kodeProker.toLowerCase())) {
    return res.status(400).json({ error: 'Kode Proker sudah digunakan' });
  }

  const newProker: WorkProgram = {
    id: 'PRK-' + Date.now(),
    kodeProker: body.kodeProker,
    namaProker: body.namaProker,
    tahunAnggaran: parseInt(body.tahunAnggaran) || 2026,
    functionalArea: body.functionalArea || 'Umum',
    jenisBosie: body.jenisBosie || 'O',
    direktorat: body.direktorat || 'KOMERSIAL',
    subdit: body.subdit || '-',
    divisiUnitKerja: body.divisiUnitKerja || '-',
    ownerPic: body.ownerPic || 'PIC Terdaftar',
    ownerCategory: body.ownerCategory || 'Induk',
    namaPekerjaan: body.namaPekerjaan || body.namaProker,
    latarBelakang: body.latarBelakang || '',
    tujuanInvestasi: body.tujuanInvestasi || '',
    nilaiCapexRkap: normalizeToMiliar(body.nilaiCapexRkap),
    nilaiKontrak: normalizeToMiliar(body.nilaiKontrak),
    nilaiRilis: normalizeToMiliar(body.nilaiRilis),
    nilaiNpp: normalizeToMiliar(body.nilaiNpp),
    nilaiOgp: normalizeToMiliar(body.nilaiOgp),
    nilaiAktual: normalizeToMiliar(body.nilaiAktual),
    nilaiAccrue: normalizeToMiliar(body.nilaiAccrue),
    belumOgp: normalizeToMiliar(body.belumOgp),
    sisaAccrue: normalizeToMiliar(body.sisaAccrue),
    tanggalMulai: body.tanggalMulai || new Date().toISOString().substring(0, 10),
    targetSelesai: body.targetSelesai || new Date().toISOString().substring(0, 10),
    targetProgresFisik: parseFloat(body.targetProgresFisik) || 0,
    progresFisik: parseFloat(body.progresFisik) || 0,
    statusProyek: body.statusProyek || 'Belum Mulai',
    statusJadwal: body.statusJadwal || 'Sesuai',
    catatan: body.catatan || '',
    terakhirDiperbarui: new Date().toISOString().substring(0, 10)
  };

  db.workPrograms.unshift(newProker);
  saveDb();
  logAudit(body.userId, body.userName, body.userRole, 'CREATE_PROKER', 'PROKER', newProker.id, `Menambahkan proker baru: ${newProker.kodeProker} - ${newProker.namaProker}`, req);

  res.status(201).json(newProker);
});

app.put('/api/proker/:id', (req: Request, res: Response) => {
  const index = db.workPrograms.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Program kerja tidak ditemukan' });

  const current = db.workPrograms[index];
  const body = req.body;

  const updated: WorkProgram = {
    ...current,
    ...body,
    nilaiCapexRkap: body.nilaiCapexRkap !== undefined ? normalizeToMiliar(body.nilaiCapexRkap) : current.nilaiCapexRkap,
    nilaiKontrak: body.nilaiKontrak !== undefined ? normalizeToMiliar(body.nilaiKontrak) : current.nilaiKontrak,
    nilaiRilis: body.nilaiRilis !== undefined ? normalizeToMiliar(body.nilaiRilis) : current.nilaiRilis,
    nilaiAktual: body.nilaiAktual !== undefined ? normalizeToMiliar(body.nilaiAktual) : current.nilaiAktual,
    progresFisik: body.progresFisik !== undefined ? parseFloat(body.progresFisik) : current.progresFisik,
    terakhirDiperbarui: new Date().toISOString().substring(0, 10)
  };

  db.workPrograms[index] = updated;
  saveDb();
  logAudit(body.userId, body.userName, body.userRole, 'UPDATE_PROKER', 'PROKER', updated.id, `Memperbarui proker ${updated.kodeProker}`, req);

  res.json(updated);
});

app.delete('/api/proker/:id', (req: Request, res: Response) => {
  const index = db.workPrograms.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Program kerja tidak ditemukan' });

  const deleted = db.workPrograms[index];
  db.workPrograms.splice(index, 1);
  saveDb();
  logAudit(req.body.userId, req.body.userName, req.body.userRole, 'DELETE_PROKER', 'PROKER', req.params.id, `Menghapus proker ${deleted.kodeProker} - ${deleted.namaProker}`, req);

  res.json({ message: 'Program kerja berhasil dihapus', id: req.params.id });
});

// 3. Document Management
app.get('/api/documents', (req: Request, res: Response) => {
  const { jenis, prokerId, status, tahun } = req.query;
  let docs = db.documents;
  const prokerYearMap = new Map(db.workPrograms.map(p => [p.id, p.tahunAnggaran]));

  if (tahun && tahun !== 'Semua') {
    const yr = parseInt(tahun as string);
    docs = docs.filter(d => (d.tahunAnggaran === yr) || (prokerYearMap.get(d.prokerId) === yr));
  }
  if (jenis && jenis !== 'Semua') {
    docs = docs.filter(d => d.jenisDokumen === jenis);
  }
  if (prokerId && prokerId !== 'Semua') {
    docs = docs.filter(d => d.prokerId === prokerId);
  }
  if (status && status !== 'Semua') {
    docs = docs.filter(d => d.statusVerifikasi === status);
  }

  res.json(docs);
});

app.get('/api/documents/checklist/:prokerId', (req: Request, res: Response) => {
  const checklist = calculateDocumentChecklist(req.params.prokerId);
  res.json(checklist);
});

app.post('/api/documents/upload', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  const body = req.body;

  if (!file) {
    return res.status(400).json({ error: 'File dokumen harus dipilih untuk diunggah' });
  }

  const proker = db.workPrograms.find(p => p.id === body.prokerId);
  const kodeProker = proker ? proker.kodeProker : (body.kodeProker || '-');
  const namaProker = proker ? proker.namaProker : (body.namaProker || '-');
  const tahunAnggaran = body.tahunAnggaran ? parseInt(body.tahunAnggaran) : (proker ? proker.tahunAnggaran : 2026);

  // Check if replacing version or new doc
  if (body.replaceDocId) {
    const existingIndex = db.documents.findIndex(d => d.id === body.replaceDocId);
    if (existingIndex !== -1) {
      const existing = db.documents[existingIndex];
      const newVersion = (existing.versi || 1) + 1;
      
      const newHistoryItem = {
        versionNumber: existing.versi,
        fileName: existing.namaFileAsli,
        fileSize: existing.ukuranFile,
        fileUrl: existing.fileUrl,
        uploadedAt: existing.tanggalUpload,
        uploadedBy: existing.picPengunggah,
        changeNote: existing.catatanReviewer || 'Versi sebelumnya'
      };

      existing.riwayatVersi = [newHistoryItem, ...(existing.riwayatVersi || [])];
      existing.versi = newVersion;
      existing.namaFileAsli = file.originalname;
      existing.lokasiPenyimpanan = file.path;
      existing.ukuranFile = file.size;
      existing.tipeMime = file.mimetype;
      existing.fileUrl = `/uploads/${file.filename}`;
      existing.tanggalUpload = new Date().toISOString().substring(0, 10);
      existing.picPengunggah = body.picPengunggah || 'User Sistem';
      existing.statusVerifikasi = 'Menunggu Verifikasi';
      existing.catatanReviewer = body.catatan || 'Versi dokumen diperbarui, menunggu verifikasi ulang.';
      if (body.tahunAnggaran) {
        existing.tahunAnggaran = parseInt(body.tahunAnggaran);
      }

      db.documents[existingIndex] = existing;
      saveDb();
      logAudit(body.userId, body.userName, body.userRole, 'UPDATE_DOCUMENT_VERSION', 'DOKUMEN', existing.id, `Memperbarui versi dokumen ${existing.nomorDokumen} ke v${newVersion}`, req);

      return res.json(existing);
    }
  }

  const newDoc: InvestmentDocument = {
    id: 'DOC-' + Date.now(),
    prokerId: body.prokerId || 'PRK-001',
    kodeProker,
    namaProker,
    tahunAnggaran,
    jenisDokumen: (body.jenisDokumen as any) || 'PKS',
    nomorDokumen: body.nomorDokumen || `DOK/${Date.now().toString().slice(-6)}`,
    namaDokumen: body.namaDokumen || file.originalname,
    tanggalDokumen: body.tanggalDokumen || new Date().toISOString().substring(0, 10),
    tanggalBerlaku: body.tanggalBerlaku,
    nilaiDokumen: body.nilaiDokumen ? parseFloat(body.nilaiDokumen) : undefined,
    namaVendor: body.namaVendor || '',
    picPengunggah: body.picPengunggah || 'PIC Pengunggah',
    tanggalUpload: new Date().toISOString().substring(0, 10),
    versi: 1,
    statusVerifikasi: 'Menunggu Verifikasi',
    catatanReviewer: body.catatan || 'Dokumen baru diunggah, menunggu peninjauan verifikator.',
    namaFileAsli: file.originalname,
    lokasiPenyimpanan: file.path,
    ukuranFile: file.size,
    tipeMime: file.mimetype,
    fileUrl: `/uploads/${file.filename}`,
    riwayatVersi: []
  };

  db.documents.unshift(newDoc);
  saveDb();
  logAudit(body.userId, body.userName, body.userRole, 'UPLOAD_DOCUMENT', 'DOKUMEN', newDoc.id, `Mengunggah dokumen ${newDoc.jenisDokumen}: ${newDoc.nomorDokumen} (${file.originalname})`, req);

  res.status(201).json(newDoc);
});

// Download document
app.get('/api/documents/:id/download', (req: Request, res: Response) => {
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

  let targetPath = doc.lokasiPenyimpanan;
  if (!fs.existsSync(targetPath)) {
    // Fallback to sample or uploads directory
    const sampleTarget = path.join(UPLOADS_DIR, path.basename(doc.fileUrl || 'sample_pks.pdf'));
    if (fs.existsSync(sampleTarget)) {
      targetPath = sampleTarget;
    } else {
      // Generate sample PDF on the fly
      const createdPath = path.join(UPLOADS_DIR, `generated_${doc.id}.pdf`);
      fs.writeFileSync(createdPath, createSamplePdfBuffer(doc.namaDokumen, doc.kodeProker));
      targetPath = createdPath;
    }
  }

  logAudit(req.query.userId as string, req.query.userName as string, req.query.userRole as any, 'DOWNLOAD_DOCUMENT', 'DOKUMEN', doc.id, `Mengunduh file asli dokumen: ${doc.namaFileAsli}`, req);

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.namaFileAsli)}"`);
  res.setHeader('Content-Type', doc.tipeMime || 'application/pdf');
  res.download(targetPath, doc.namaFileAsli);
});

// Preview document (inline)
app.get('/api/documents/:id/preview', (req: Request, res: Response) => {
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

  let targetPath = doc.lokasiPenyimpanan;
  if (!fs.existsSync(targetPath)) {
    const sampleTarget = path.join(UPLOADS_DIR, path.basename(doc.fileUrl || 'sample_pks.pdf'));
    if (fs.existsSync(sampleTarget)) {
      targetPath = sampleTarget;
    } else {
      const createdPath = path.join(UPLOADS_DIR, `generated_${doc.id}.pdf`);
      fs.writeFileSync(createdPath, createSamplePdfBuffer(doc.namaDokumen, doc.kodeProker));
      targetPath = createdPath;
    }
  }

  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.namaFileAsli)}"`);
  res.setHeader('Content-Type', doc.tipeMime || 'application/pdf');
  res.sendFile(targetPath);
});

// Update document metadata & verification status
app.put('/api/documents/:id', (req: Request, res: Response) => {
  const index = db.documents.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

  const current = db.documents[index];
  const body = req.body;

  const updated: InvestmentDocument = {
    ...current,
    ...body,
    statusVerifikasi: body.statusVerifikasi || current.statusVerifikasi,
    catatanReviewer: body.catatanReviewer !== undefined ? body.catatanReviewer : current.catatanReviewer,
    reviewedBy: body.reviewedBy || current.reviewedBy,
    reviewedAt: body.statusVerifikasi ? new Date().toISOString().substring(0, 10) : current.reviewedAt
  };

  db.documents[index] = updated;
  saveDb();
  logAudit(body.userId, body.userName, body.userRole, 'VERIFY_DOCUMENT', 'DOKUMEN', updated.id, `Status dokumen ${updated.nomorDokumen} diubah menjadi ${updated.statusVerifikasi}`, req);

  res.json(updated);
});

// Delete document
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const index = db.documents.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

  const deleted = db.documents[index];
  db.documents.splice(index, 1);
  saveDb();
  logAudit(req.body.userId, req.body.userName, req.body.userRole, 'DELETE_DOCUMENT', 'DOKUMEN', req.params.id, `Menghapus dokumen ${deleted.nomorDokumen} (${deleted.namaFileAsli})`, req);

  res.json({ message: 'Dokumen berhasil dihapus' });
});

// 4. Physical Progress CRUD
app.get('/api/progress/:prokerId', (req: Request, res: Response) => {
  const records = db.progressRecords.filter(r => r.prokerId === req.params.prokerId);
  res.json(records);
});

app.post('/api/progress', (req: Request, res: Response) => {
  const body = req.body;
  const newRecord: PhysicalProgressRecord = {
    id: 'PRG-' + Date.now(),
    prokerId: body.prokerId,
    kodeProker: body.kodeProker || '',
    periode: body.periode || 'Bulan Berjalan',
    tanggalPelaporan: body.tanggalPelaporan || new Date().toISOString().substring(0, 10),
    targetProgres: parseFloat(body.targetProgres) || 0,
    realisasiProgres: parseFloat(body.realisasiProgres) || 0,
    selisih: (parseFloat(body.realisasiProgres) || 0) - (parseFloat(body.targetProgres) || 0),
    deskripsiPekerjaan: body.deskripsiPekerjaan || '',
    kendala: body.kendala,
    tindakLanjut: body.tindakLanjut,
    buktiUrl: body.buktiUrl,
    buktiNama: body.buktiNama,
    picPelapor: body.picPelapor || 'PIC Proker',
    statusVerifikasi: 'Terverifikasi'
  };

  db.progressRecords.unshift(newRecord);

  // Sync back to work program progresFisik
  const prokerIndex = db.workPrograms.findIndex(p => p.id === body.prokerId);
  if (prokerIndex !== -1) {
    db.workPrograms[prokerIndex].progresFisik = newRecord.realisasiProgres;
    db.workPrograms[prokerIndex].targetProgresFisik = newRecord.targetProgres;
    // Auto status
    if (newRecord.realisasiProgres >= 100) {
      db.workPrograms[prokerIndex].statusProyek = 'Selesai';
    } else if (newRecord.realisasiProgres > 0) {
      db.workPrograms[prokerIndex].statusProyek = 'Proses';
    }
    if (newRecord.selisih < -5) {
      db.workPrograms[prokerIndex].statusJadwal = 'Terlambat';
    } else if (newRecord.selisih > 5) {
      db.workPrograms[prokerIndex].statusJadwal = 'Terdepan';
    } else {
      db.workPrograms[prokerIndex].statusJadwal = 'Sesuai';
    }
  }

  saveDb();
  logAudit(body.userId, body.userName, body.userRole, 'LOG_PROGRESS', 'PROGRES', newRecord.id, `Pencatatan progres fisik ${newRecord.kodeProker} sebesar ${newRecord.realisasiProgres}%`, req);

  res.status(201).json(newRecord);
});

// 5. Budget Realizations CRUD
app.get('/api/realizations', (req: Request, res: Response) => {
  const { tahun, prokerId, status } = req.query;
  let records = db.realizations;
  const prokerYearMap = new Map(db.workPrograms.map(p => [p.id, p.tahunAnggaran]));

  if (tahun && tahun !== 'Semua') {
    const yr = parseInt(tahun as string);
    records = records.filter(r => {
      if (r.tahunAnggaran && r.tahunAnggaran === yr) return true;
      if (r.tglPosting) {
        const postYr = new Date(r.tglPosting).getFullYear();
        if (postYr === yr) return true;
      }
      return prokerYearMap.get(r.prokerId) === yr;
    });
  }

  if (prokerId && prokerId !== 'Semua') {
    records = records.filter(r => r.prokerId === prokerId);
  }

  if (status && status !== 'Semua') {
    records = records.filter(r => r.statusPembayaran === status);
  }

  res.json(records);
});

app.get('/api/realizations/:prokerId', (req: Request, res: Response) => {
  const records = db.realizations.filter(r => r.prokerId === req.params.prokerId);
  res.json(records);
});

app.post('/api/realizations', (req: Request, res: Response) => {
  const body = req.body;
  const prokerYear = db.workPrograms.find(p => p.id === body.prokerId)?.tahunAnggaran;
  const resolvedYear = body.tahunAnggaran 
    ? parseInt(body.tahunAnggaran) 
    : (body.tglPosting ? new Date(body.tglPosting).getFullYear() : (prokerYear || 2026));

  const newRealization: BudgetRealizationRelease = {
    id: 'RLS-' + Date.now(),
    prokerId: body.prokerId,
    kodeProker: body.kodeProker || '',
    idRelease: body.idRelease || (db.realizations.length + 1).toString(),
    tglPosting: body.tglPosting || new Date().toISOString().substring(0, 10),
    kodeAset: body.kodeAset || 'Gedung Kantor',
    kodeRekening: body.kodeRekening || '1204010102',
    nomorDokumen: body.nomorDokumen || `${Date.now()}`,
    keteranganRelease: body.keteranganRelease || '',
    noNde: body.noNde || 'ACCRUE',
    bsuRelease: parseFloat(body.bsuRelease) || 0,
    kodeSubproker: body.kodeSubproker || '',
    statusPembayaran: body.statusPembayaran || 'Sudah di OGP',
    bsuAktual: parseFloat(body.bsuAktual) || 0,
    bulanAktual: body.bulanAktual || 'OKT',
    lokasiAset: body.lokasiAset || 'Kantor Pusat',
    tahunAnggaran: resolvedYear
  };

  db.realizations.unshift(newRealization);
  saveDb();
  logAudit(body.userId, body.userName, body.userRole, 'CREATE_REALIZATION', 'REALISASI', newRealization.id, `Input realisasi BSU Rp ${newRealization.bsuAktual} untuk proker ${newRealization.kodeProker} (Tahun ${resolvedYear})`, req);

  res.status(201).json(newRealization);
});

// 6. Financial Analysis FS-BC
app.get('/api/financial-analysis', (_req: Request, res: Response) => {
  res.json(db.financialAnalyses);
});

app.get('/api/financial-analysis/:prokerId', (req: Request, res: Response) => {
  const item = db.financialAnalyses.find(f => f.prokerId === req.params.prokerId);
  if (!item) return res.status(404).json({ error: 'Data analisa finansial belum dibuat' });
  res.json(item);
});

app.post('/api/financial-analysis', (req: Request, res: Response) => {
  const body = req.body;
  const index = db.financialAnalyses.findIndex(f => f.prokerId === body.prokerId);

  const payload: FinancialAnalysisFSBC = {
    id: index !== -1 ? db.financialAnalyses[index].id : 'FA-' + Date.now(),
    prokerId: body.prokerId,
    kodeProker: body.kodeProker || '',
    namaProker: body.namaProker || '',
    investasiAwal: body.investasiAwal !== undefined ? parseFloat(body.investasiAwal) : (parseFloat(body.biayaInvestasiTotal) * 1_000_000_000 || 100_000_000),
    discountRate: body.discountRate !== undefined ? parseFloat(body.discountRate) : 10.0,
    periodeAnalisis: body.periodeAnalisis !== undefined ? parseInt(body.periodeAnalisis) : 5,
    biayaTetap: body.biayaTetap !== undefined ? parseFloat(body.biayaTetap) : 20_000_000,
    hargaJualPerUnit: body.hargaJualPerUnit !== undefined ? parseFloat(body.hargaJualPerUnit) : 100_000,
    biayaVariabelPerUnit: body.biayaVariabelPerUnit !== undefined ? parseFloat(body.biayaVariabelPerUnit) : 60_000,
    bepUnit: body.bepUnit !== undefined ? parseFloat(body.bepUnit) : 500,
    bepNilaiPenjualan: body.bepNilaiPenjualan !== undefined ? parseFloat(body.bepNilaiPenjualan) : 50_000_000,
    arusKasTahunan: Array.isArray(body.arusKasTahunan) ? body.arusKasTahunan.map((v: any) => parseFloat(v) || 0) : [30_000_000, 30_000_000, 30_000_000, 30_000_000, 30_000_000, 0, 0, 0, 0, 0],
    totalArusKasMasuk: body.totalArusKasMasuk !== undefined ? parseFloat(body.totalArusKasMasuk) : 150_000_000,
    roi: parseFloat(body.roi) || 0,
    npv: parseFloat(body.npv) || 0,
    irr: parseFloat(body.irr) || 0,
    paybackPeriodTahun: parseFloat(body.paybackPeriodTahun) || 0,
    breakEvenPoint: parseFloat(body.breakEvenPoint) || (body.bepNilaiPenjualan ? body.bepNilaiPenjualan / 1_000_000_000 : 0),
    biayaInvestasiTotal: parseFloat(body.biayaInvestasiTotal) || (body.investasiAwal ? body.investasiAwal / 1_000_000_000 : 0),
    totalManfaatFinansial: parseFloat(body.totalManfaatFinansial) || (body.totalArusKasMasuk ? body.totalArusKasMasuk / 1_000_000_000 : 0),
    asumsiBisnis: Array.isArray(body.asumsiBisnis) ? body.asumsiBisnis : (body.asumsiBisnis ? [body.asumsiBisnis] : []),
    risikoInvestasi: Array.isArray(body.risikoInvestasi) ? body.risikoInvestasi : (body.risikoInvestasi ? [body.risikoInvestasi] : []),
    statusKelayakan: body.statusKelayakan || 'Layak',
    catatanReviewer: body.catatanReviewer,
    dokumenFsBcId: body.dokumenFsBcId,
    namaDokumenFsBc: body.namaDokumenFsBc,
    proyeksiArusKas: body.proyeksiArusKas || []
  };

  if (index !== -1) {
    db.financialAnalyses[index] = payload;
  } else {
    db.financialAnalyses.unshift(payload);
  }

  saveDb();
  logAudit(body.userId, body.userName, body.userRole, 'SAVE_FINANCIAL_ANALYSIS', 'FS-BC', payload.id, `Simpan kajian kelayakan FS-BC untuk proker ${payload.kodeProker} (NPV: Rp ${payload.npv}M, IRR: ${payload.irr}%)`, req);

  res.json(payload);
});

// 7. Notifications
app.get('/api/notifications', (_req: Request, res: Response) => {
  res.json(db.notifications);
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const item = db.notifications.find(n => n.id === req.params.id);
  if (item) {
    item.dibaca = true;
    saveDb();
  }
  res.json({ success: true });
});

// 8. Users & RBAC (Kelola Nama PIC & Role PIC)
app.get('/api/users', (_req: Request, res: Response) => {
  res.json(db.users || INITIAL_USERS);
});

app.post('/api/users', (req: Request, res: Response) => {
  const { name, email, role, unitKerja, userId, userName, userRole } = req.body;
  if (!name || !role) {
    res.status(400).json({ error: 'Nama PIC dan Role PIC wajib diisi' });
    return;
  }

  const newUser: User = {
    id: `USR-${Date.now()}`,
    name: name.trim(),
    email: email?.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@posindonesia.co.id`,
    role: role,
    unitKerja: unitKerja?.trim() || 'PT Pos Indonesia (Persero)'
  };

  if (!db.users) db.users = [...INITIAL_USERS];
  db.users.push(newUser);

  logAudit(
    userId,
    userName,
    userRole || 'Administrator',
    'TAMBAH_PIC_USER',
    'USER',
    newUser.id,
    `Mendaftarkan PIC/User baru: ${newUser.name} (${newUser.role}) - ${newUser.unitKerja}`,
    req
  );

  saveDb();
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, role, unitKerja, userId, userName, userRole } = req.body;

  if (!db.users) db.users = [...INITIAL_USERS];
  const user = db.users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'Pengguna/PIC tidak ditemukan' });
    return;
  }

  const oldName = user.name;
  const oldRole = user.role;

  if (name) user.name = name.trim();
  if (email) user.email = email.trim();
  if (role) user.role = role;
  if (unitKerja) user.unitKerja = unitKerja.trim();

  // Sinkronisasi nama PIC pada program kerja jika nama berubah
  if (name && oldName !== user.name) {
    db.workPrograms.forEach(p => {
      if (p.ownerPic === oldName) {
        p.ownerPic = user.name;
      }
    });
  }

  logAudit(
    userId,
    userName,
    userRole || 'Administrator',
    'EDIT_ROLE_NAMA_PIC',
    'USER',
    user.id,
    `Update PIC ${id}: ${oldName} (${oldRole}) -> ${user.name} (${user.role})`,
    req
  );

  saveDb();
  res.json(user);
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, userName, userRole } = req.body;

  if (!db.users) db.users = [...INITIAL_USERS];
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Pengguna/PIC tidak ditemukan' });
    return;
  }

  const user = db.users[idx];
  const adminCount = db.users.filter(u => u.role === 'Administrator').length;
  if (user.role === 'Administrator' && adminCount <= 1) {
    res.status(400).json({ error: 'Tidak dapat menghapus Administrator utama sistem' });
    return;
  }

  db.users.splice(idx, 1);

  logAudit(
    userId,
    userName,
    userRole || 'Administrator',
    'HAPUS_PIC_USER',
    'USER',
    user.id,
    `Menghapus PIC/User: ${user.name} (${user.role})`,
    req
  );

  saveDb();
  res.json({ success: true, message: `PIC/Pengguna ${user.name} berhasil dihapus` });
});

// Ubah Penugasan PIC Program Kerja
app.put('/api/proker/:id/assign-pic', (req: Request, res: Response) => {
  const { id } = req.params;
  const { ownerPic, ownerCategory, subdit, divisiUnitKerja, catatan, userId, userName, userRole } = req.body;

  const proker = db.workPrograms.find(p => p.id === id);
  if (!proker) {
    res.status(404).json({ error: 'Program kerja tidak ditemukan' });
    return;
  }

  const oldPic = proker.ownerPic;
  const oldCategory = proker.ownerCategory;

  if (ownerPic) proker.ownerPic = ownerPic.trim();
  if (ownerCategory) proker.ownerCategory = ownerCategory;
  if (subdit) proker.subdit = subdit.trim();
  if (divisiUnitKerja) proker.divisiUnitKerja = divisiUnitKerja.trim();
  if (catatan) proker.catatan = catatan.trim();
  proker.terakhirDiperbarui = new Date().toISOString().substring(0, 10);

  logAudit(
    userId,
    userName,
    userRole || 'Administrator',
    'ASSIGN_PIC_PROKER',
    'PROKER',
    proker.id,
    `Ubah PIC Proker [${proker.kodeProker}]: ${oldPic} (${oldCategory}) -> ${proker.ownerPic} (${proker.ownerCategory})`,
    req
  );

  saveDb();
  res.json(proker);
});

// 9. Audit Logs
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json(db.auditLogs);
});

// 10. Excel Export (Real .xlsx workbook generation)
app.get('/api/export/excel', (req: Request, res: Response) => {
  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Program Kerja
    const prokerData = db.workPrograms.map((p, i) => ({
      'No': i + 1,
      'Kode Proker': p.kodeProker,
      'Nama Program Kerja': p.namaProker,
      'Tahun': p.tahunAnggaran,
      'BOSIE': p.jenisBosie,
      'Direktorat': p.direktorat,
      'Divisi / Subdit': p.subdit,
      'Owner / PIC': p.ownerPic,
      'Kategori Owner': p.ownerCategory,
      'CAPEX RKAP (Miliar)': p.nilaiCapexRkap,
      'Kontrak (Miliar)': p.nilaiKontrak,
      'Rilis (Miliar)': p.nilaiRilis,
      'Aktual (Miliar)': p.nilaiAktual,
      'Serapan %': p.nilaiCapexRkap > 0 ? ((p.nilaiAktual / p.nilaiCapexRkap) * 100).toFixed(2) + '%' : '0%',
      'Progres Fisik %': p.progresFisik + '%',
      'Status Proyek': p.statusProyek,
      'Status Jadwal': p.statusJadwal,
      'Target Selesai': p.targetSelesai
    }));
    const wsProker = XLSX.utils.json_to_sheet(prokerData);
    XLSX.utils.book_append_sheet(wb, wsProker, 'Program Kerja');

    // Sheet 2: Dokumen Investasi
    const docData = db.documents.map((d, i) => ({
      'No': i + 1,
      'Kode Proker': d.kodeProker,
      'Nama Proker': d.namaProker,
      'Jenis Dokumen': d.jenisDokumen,
      'Nomor Dokumen': d.nomorDokumen,
      'Nama File': d.namaFileAsli,
      'Vendor': d.namaVendor || '-',
      'Nilai Dokumen': d.nilaiDokumen || '-',
      'Tanggal Upload': d.tanggalUpload,
      'Versi': 'v' + d.versi,
      'Status Verifikasi': d.statusVerifikasi,
      'Reviewer': d.reviewedBy || '-'
    }));
    const wsDocs = XLSX.utils.json_to_sheet(docData);
    XLSX.utils.book_append_sheet(wb, wsDocs, 'Dokumen Investasi');

    // Sheet 3: Realisasi Release
    const rlsData = db.realizations.map((r, i) => ({
      'No': i + 1,
      'ID Release': r.idRelease,
      'Tgl Posting': r.tglPosting,
      'Kode Proker': r.kodeProker,
      'Kode Aset': r.kodeAset,
      'Kode Rekening': r.kodeRekening,
      'Nomor Dokumen': r.nomorDokumen,
      'Keterangan Release': r.keteranganRelease,
      'No NDE': r.noNde,
      'BSU Release': r.bsuRelease,
      'Status Pembayaran': r.statusPembayaran,
      'BSU Aktual': r.bsuAktual,
      'Bulan Aktual': r.bulanAktual,
      'Lokasi Aset': r.lokasiAset
    }));
    const wsRls = XLSX.utils.json_to_sheet(rlsData);
    XLSX.utils.book_append_sheet(wb, wsRls, 'Realisasi BSU');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    logAudit(req.query.userId as string, req.query.userName as string, req.query.userRole as any, 'EXPORT_EXCEL', 'CONFIG', 'ALL', 'Mengunduh laporan komprehensif DALISTA dalam format Excel (.xlsx)', req);

    res.setHeader('Content-Disposition', 'attachment; filename="DALISTA_PT_Pos_Indonesia_CAPEX_2026.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating Excel export:', err);
    res.status(500).json({ error: 'Gagal membuat file Excel: ' + err.message });
  }
});

// 11. Excel Import
app.post('/api/import/excel', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'File Excel harus diunggah' });

  try {
    const workbook = XLSX.readFile(file.path);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ error: 'File Excel kosong atau format tabel tidak terdeteksi' });
    }

    const importedItems: WorkProgram[] = [];
    const errors: string[] = [];

    jsonData.forEach((row, idx) => {
      const kode = row['KODE PROKER'] || row['Kode Proker'] || row['kode'] || row['Kode'];
      const nama = row['KETERANGAN PROKER'] || row['Nama Proker'] || row['Nama Program Kerja'] || row['keterangan'] || row['nama'];

      if (!kode || !nama) {
        errors.push(`Baris ${idx + 2}: Kode atau Nama Proker kosong`);
        return;
      }

      // Check if already exists, then update or insert
      const rkap = normalizeToMiliar(row['RKAP (MILIAR)'] || row['RKAP'] || row['Capex'] || '0');
      const kontrak = normalizeToMiliar(row['KONTRAK PENGADAAN (MILIAR)'] || row['Kontrak'] || '0');
      const rilis = normalizeToMiliar(row['RILIS (MILIAR)'] || row['Rilis'] || '0');
      const aktual = normalizeToMiliar(row['AKTUAL (MILIAR)'] || row['Aktual'] || '0');

      const existingIndex = db.workPrograms.findIndex(p => p.kodeProker.toLowerCase() === String(kode).trim().toLowerCase());
      if (existingIndex !== -1) {
        db.workPrograms[existingIndex].nilaiCapexRkap = rkap || db.workPrograms[existingIndex].nilaiCapexRkap;
        db.workPrograms[existingIndex].nilaiKontrak = kontrak || db.workPrograms[existingIndex].nilaiKontrak;
        db.workPrograms[existingIndex].nilaiRilis = rilis || db.workPrograms[existingIndex].nilaiRilis;
        db.workPrograms[existingIndex].nilaiAktual = aktual || db.workPrograms[existingIndex].nilaiAktual;
        db.workPrograms[existingIndex].terakhirDiperbarui = new Date().toISOString().substring(0, 10);
        importedItems.push(db.workPrograms[existingIndex]);
      } else {
        const newP: WorkProgram = {
          id: 'PRK-' + Date.now() + '-' + idx,
          kodeProker: String(kode).trim(),
          namaProker: String(nama).trim(),
          tahunAnggaran: 2026,
          functionalArea: row['DIREKTORAT'] || 'Umum',
          jenisBosie: 'O',
          direktorat: row['DIREKTORAT'] || 'KOMERSIAL',
          subdit: row['SUBDIT'] || '-',
          divisiUnitKerja: row['KETERANGAN PPK'] || '-',
          ownerPic: 'PIC Impor',
          ownerCategory: 'Induk',
          namaPekerjaan: String(nama).trim(),
          latarBelakang: 'Data diimpor dari dokumen Excel',
          tujuanInvestasi: 'Peningkatan kapabilitas operasional investasi PT Pos Indonesia',
          nilaiCapexRkap: rkap,
          nilaiKontrak: kontrak,
          nilaiRilis: rilis,
          nilaiNpp: rilis,
          nilaiOgp: aktual,
          nilaiAktual: aktual,
          nilaiAccrue: 0,
          belumOgp: 0,
          sisaAccrue: 0,
          tanggalMulai: '2026-01-01',
          targetSelesai: '2026-12-31',
          targetProgresFisik: 50,
          progresFisik: 0,
          statusProyek: 'Belum Mulai',
          statusJadwal: 'Sesuai',
          terakhirDiperbarui: new Date().toISOString().substring(0, 10)
        };
        db.workPrograms.push(newP);
        importedItems.push(newP);
      }
    });

    saveDb();
    logAudit(req.body.userId, req.body.userName, req.body.userRole, 'IMPORT_EXCEL', 'PROKER', 'BATCH', `Impor data Excel berhasil: ${importedItems.length} baris diproses, ${errors.length} peringatan.`, req);

    res.json({
      success: true,
      totalProcessed: jsonData.length,
      importedCount: importedItems.length,
      errors
    });
  } catch (err: any) {
    console.error('Error importing Excel:', err);
    res.status(500).json({ error: 'Gagal memproses file Excel: ' + err.message });
  }
});

// Setup Vite or production static serving
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 DALISTA PT Pos Indonesia Server running on port ${PORT}`);
  });
}

startServer();

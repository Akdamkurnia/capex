export type BosieType = 'B' | 'O' | 'S' | 'I' | 'E';
export type OwnerType = 'Induk' | 'Poslog' | 'Posdig' | 'Pospro' | 'Lainnya';
export type ProkerStatus = 'Belum Mulai' | 'Proses' | 'Selesai';
export type ScheduleStatus = 'Terdepan' | 'Sesuai' | 'Terlambat';
export type DocumentType = 'PKS' | 'SPK' | 'Invoice' | 'BAPP' | 'FS-BC';
export type VerificationStatus = 'Draft' | 'Menunggu Verifikasi' | 'Terverifikasi' | 'Perlu Perbaikan';
export type UserRole = 'Administrator' | 'VP/Manager' | 'PIC Proker' | 'Analyst Investment' | 'Reviewer Dokumen' | 'Auditor/Viewer';
export type FeasibilityStatus = 'Draft' | 'Dalam Review' | 'Layak' | 'Layak dengan Catatan' | 'Tidak Layak' | 'Perlu Revisi';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unitKerja: string;
  avatar?: string;
}

export interface WorkProgram {
  id: string;
  kodeProker: string;
  namaProker: string;
  tahunAnggaran: number;
  functionalArea: string;
  jenisBosie: BosieType; // B, O, S, I, E
  direktorat: string;
  subdit: string;
  divisiUnitKerja: string;
  ownerPic: string;
  ownerCategory: OwnerType;
  keteranganPpk?: string;
  namaPekerjaan: string;
  latarBelakang: string;
  tujuanInvestasi: string;
  
  // Finansial (dalam Miliar Rupiah)
  nilaiCapexRkap: number;
  nilaiKontrak: number;
  nilaiRilis: number;
  nilaiNpp: number;
  nilaiOgp: number;
  nilaiAktual: number;
  nilaiAccrue: number;
  belumOgp: number;
  sisaAccrue: number;
  
  // Waktu & Progres
  tanggalMulai: string; // YYYY-MM-DD
  targetSelesai: string; // YYYY-MM-DD
  targetProgresFisik: number; // %
  progresFisik: number; // %
  statusProyek: ProkerStatus;
  statusJadwal: ScheduleStatus;
  
  catatan?: string;
  terakhirDiperbarui: string;
}

export interface DocumentVersion {
  versionNumber: number;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  changeNote?: string;
}

export interface InvestmentDocument {
  id: string;
  prokerId: string;
  kodeProker: string;
  namaProker: string;
  tahunAnggaran?: number;
  jenisDokumen: DocumentType;
  nomorDokumen: string;
  namaDokumen: string;
  tanggalDokumen: string;
  tanggalBerlaku?: string;
  nilaiDokumen?: number;
  namaVendor?: string;
  picPengunggah: string;
  tanggalUpload: string;
  versi: number;
  statusVerifikasi: VerificationStatus;
  catatanReviewer?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  
  // Metadata File
  namaFileAsli: string;
  lokasiPenyimpanan: string;
  ukuranFile: number;
  tipeMime: string;
  fileUrl: string;
  riwayatVersi: DocumentVersion[];
}

export interface DocumentChecklistSummary {
  pks: { count: number; verified: boolean; hasDoc: boolean };
  spk: { count: number; verified: boolean; hasDoc: boolean };
  invoice: { count: number; verified: boolean; hasDoc: boolean };
  bapp: { count: number; verified: boolean; hasDoc: boolean };
  fsBc: { count: number; verified: boolean; hasDoc: boolean };
  totalMandatory: number;
  completedMandatory: number;
  completenessPercentage: number;
}

export type QuarterType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface PhysicalProgressRecord {
  id: string;
  prokerId: string;
  kodeProker: string;
  periode: string; // e.g. "Minggu 4 - Okt 2026"
  quarter?: QuarterType; // 'Q1' | 'Q2' | 'Q3' | 'Q4'
  mingguKe?: number; // e.g. 1, 2, 3 ... 52
  labelMinggu?: string; // e.g. "W1", "W2", "W3", ...
  bulan?: string; // e.g. "Januari", "Februari", ...
  tahunAnggaran?: number; // e.g. 2026
  tanggalPelaporan: string;
  targetProgres: number;
  realisasiProgres: number;
  selisih: number;
  deskripsiPekerjaan: string;
  kendala?: string;
  tindakLanjut?: string;
  buktiUrl?: string;
  buktiNama?: string;
  picPelapor: string;
  statusVerifikasi: VerificationStatus;
}

export type RealisasiType = 'ACCRUE' | 'NPP';
export type OgpStatus = 'Sudah di OGP' | 'Belum di OGP';
export type KategoriRealisasi = 'Accrual' | 'NPP - Sudah di OGP' | 'NPP - Belum di OGP';

export interface BudgetRealizationRelease {
  id: string;
  prokerId: string;
  kodeProker: string;
  idRelease: string;
  tglPosting: string;
  kodeAset: string;
  kodeRekening: string;
  nomorDokumen: string;
  keteranganRelease: string;
  noNde: string;
  tipeRealisasi?: RealisasiType; // 'ACCRUE' | 'NPP'
  statusOgp?: OgpStatus; // 'Sudah di OGP' | 'Belum di OGP'
  kategoriRealisasi?: KategoriRealisasi; // 'Accrual' | 'NPP - Sudah di OGP' | 'NPP - Belum di OGP'
  bsuRelease: number;
  kodeSubproker: string;
  statusPembayaran: 'Sudah di OGP' | 'Belum di OGP' | 'Draft';
  bsuAktual: number;
  bulanAktual: string;
  lokasiAset: string;
  tahunAnggaran?: number;
}

export interface FinancialAnalysisFSBC {
  id: string;
  prokerId: string;
  kodeProker: string;
  namaProker: string;
  // Core Inputs from Excel
  investasiAwal?: number; // Rupiah (e.g. 100_000_000 or custom)
  discountRate?: number; // % (e.g. 10)
  periodeAnalisis?: number; // 1 to 10 tahun
  biayaTetap?: number; // Rupiah
  hargaJualPerUnit?: number; // Rupiah
  biayaVariabelPerUnit?: number; // Rupiah
  bepUnit?: number; // calculated unit
  bepNilaiPenjualan?: number; // calculated Rp
  arusKasTahunan?: number[]; // index 0..9 for year 1..10

  // Key Results
  totalArusKasMasuk?: number;
  roi: number; // %
  npv: number; // Rp / Miliar Rp
  irr: number; // %
  paybackPeriodTahun: number;

  // Additional & legacy fields
  breakEvenPoint: number; // Miliar Rp / Rp
  biayaInvestasiTotal: number;
  totalManfaatFinansial: number;
  asumsiBisnis: string[];
  risikoInvestasi: string[];
  statusKelayakan: FeasibilityStatus;
  catatanReviewer?: string;
  dokumenFsBcId?: string;
  namaDokumenFsBc?: string;
  proyeksiArusKas: {
    tahun: number;
    arusKasMasuk: number;
    arusKasKeluar: number;
    arusKasBersih: number;
    arusKasKumulatif: number;
    pvFactor?: number;
    pv?: number;
  }[];
}


export interface SystemNotification {
  id: string;
  tipe: 'danger' | 'warning' | 'info' | 'success';
  judul: string;
  deskripsi: string;
  tanggal: string;
  dibaca: boolean;
  prokerId?: string;
  kodeProker?: string;
  targetLink: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'PROKER' | 'DOKUMEN' | 'PROGRES' | 'REALISASI' | 'FS-BC' | 'USER' | 'AUTH' | 'CONFIG';
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface DashboardStats {
  totalProker: number;
  totalAnggaranCapex: number; // Miliar Rp
  rataRataProgresFisik: number; // %
  realisasiAnggaran: number; // Miliar Rp
  persentaseSerapan: number; // %
  proyekTerlambatCount: number;
  proyekBelumMulaiCount: number;
  dokumenBelumLengkapCount: number;
  
  statusProker: {
    belumMulai: number;
    proses: number;
    selesai: number;
  };
  waktuPelaksanaan: {
    terdepan: number;
    sesuai: number;
    terlambat: number;
  };
  distribusiOwner: {
    induk: number;
    poslog: number;
    posdig: number;
    pospro: number;
    lainnya: number;
  };
  realisasiPerBosie: {
    bosie: BosieType;
    namaBosie: string;
    rkap: number;
    realisasi: number;
    persentase: number;
  }[];
  capexVsRealisasiQuarter: {
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    targetAnggaran: number;
    prognosa: number;
    realisasiAktual: number;
    varians: number;
  }[];
}

export interface YearSummary {
  tahun: number;
  totalProker: number;
  totalAnggaranCapex: number;
  totalKontrak?: number;
  totalRilis?: number;
  totalRealisasi: number;
  persentaseSerapan: number;
  rataRataProgres: number;
  prokerSelesai: number;
  prokerProses: number;
  prokerBelumMulai: number;
}



import { pgTable, text, serial, numeric, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  unitKerja: text('unit_kerja').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const workPrograms = pgTable('work_programs', {
  id: text('id').primaryKey(),
  kodeProker: text('kode_proker').notNull(),
  namaProker: text('nama_proker').notNull(),
  tahunAnggaran: integer('tahun_anggaran').notNull(),
  functionalArea: text('functional_area').default(''),
  jenisBosie: text('jenis_bosie').default('O'),
  direktorat: text('direktorat').notNull(),
  subdit: text('subdit').default(''),
  divisiUnitKerja: text('divisi_unit_kerja').default(''),
  ownerPic: text('owner_pic').default(''),
  keteranganPpk: text('keterangan_ppk').default(''),
  ownerCategory: text('owner_category').default('Induk'),
  namaPekerjaan: text('nama_pekerjaan').default(''),
  latarBelakang: text('latar_belakang').default(''),
  tujuanInvestasi: text('tujuan_investasi').default(''),
  nilaiCapexRkap: numeric('nilai_capex_rkap').default('0'),
  nilaiKontrak: numeric('nilai_kontrak').default('0'),
  nilaiRilis: numeric('nilai_rilis').default('0'),
  nilaiNpp: numeric('nilai_npp').default('0'),
  nilaiOgp: numeric('nilai_ogp').default('0'),
  nilaiAktual: numeric('nilai_aktual').default('0'),
  nilaiAccrue: numeric('nilai_accrue').default('0'),
  belumOgp: numeric('belum_ogp').default('0'),
  sisaAccrue: numeric('sisa_accrue').default('0'),
  tanggalMulai: text('tanggal_mulai').default(''),
  targetSelesai: text('target_selesai').default(''),
  targetProgresFisik: numeric('target_progres_fisik').default('100'),
  progresFisik: numeric('progres_fisik').default('0'),
  statusProyek: text('status_proyek').default('Belum Mulai'),
  statusJadwal: text('status_jadwal').default('Sesuai'),
  catatan: text('catatan').default(''),
  terakhirDiperbarui: text('terakhir_diperbarui').default('')
});

export const realizations = pgTable('realizations', {
  id: text('id').primaryKey(),
  prokerId: text('proker_id').notNull(),
  kodeProker: text('kode_proker').default(''),
  idRelease: text('id_release').default(''),
  tglPosting: text('tgl_posting').default(''),
  kodeAset: text('kode_aset').default(''),
  kodeRekening: text('kode_rekening').default(''),
  nomorDokumen: text('nomor_dokumen').default(''),
  keteranganRelease: text('keterangan_release').default(''),
  noNde: text('no_nde').default(''),
  tipeRealisasi: text('tipe_realisasi').default('NPP'),
  statusOgp: text('status_ogp').default('Sudah di OGP'),
  kategoriRealisasi: text('kategori_realisasi').default('NPP - Sudah di OGP'),
  bsuRelease: numeric('bsu_release').default('0'),
  kodeSubproker: text('kode_subproker').default(''),
  statusPembayaran: text('status_pembayaran').default(''),
  bsuAktual: numeric('bsu_aktual').default('0'),
  bulanAktual: text('bulan_aktual').default(''),
  lokasiAset: text('lokasi_aset').default(''),
  tahunAnggaran: integer('tahun_anggaran').notNull()
});

export const investmentDocuments = pgTable('investment_documents', {
  id: text('id').primaryKey(),
  prokerId: text('proker_id').notNull(),
  kodeProker: text('kode_proker').default(''),
  namaProker: text('nama_proker').default(''),
  tahunAnggaran: integer('tahun_anggaran').notNull(),
  jenisDokumen: text('jenis_dokumen').notNull(),
  nomorDokumen: text('nomor_dokumen').notNull(),
  namaDokumen: text('nama_dokumen').notNull(),
  tanggalDokumen: text('tanggal_dokumen').default(''),
  tanggalBerlaku: text('tanggal_berlaku'),
  nilaiDokumen: numeric('nilai_dokumen'),
  namaVendor: text('nama_vendor').default(''),
  picPengunggah: text('pic_pengunggah').default(''),
  tanggalUpload: text('tanggal_upload').default(''),
  versi: integer('versi').default(1),
  statusVerifikasi: text('status_verifikasi').default('Menunggu Verifikasi'),
  catatanReviewer: text('catatan_reviewer').default(''),
  namaFileAsli: text('nama_file_asli').notNull(),
  lokasiPenyimpanan: text('lokasi_penyimpanan').default(''),
  ukuranFile: integer('ukuran_file').default(0),
  tipeMime: text('tipe_mime').default('application/pdf'),
  fileUrl: text('file_url').default('')
});

export const investmentDocumentFiles = pgTable('investment_document_files', {
  docId: text('doc_id').primaryKey(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').default('application/pdf'),
  fileSize: integer('file_size').default(0),
  base64Data: text('base64_data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});


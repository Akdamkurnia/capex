import React, { useState, useMemo, useEffect } from 'react';
import {
  FolderLock,
  Upload,
  Download,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileCheck2,
  FileSignature,
  Receipt,
  FileSpreadsheet,
  FileText,
  X,
  History,
  Calendar,
  Building,
  Layers
} from 'lucide-react';
import { InvestmentDocument, WorkProgram, User, DocumentType, VerificationStatus } from '../types';
import { formatDateIndo, formatFileSize, formatRupiah } from '../utils/formatters';

interface DocumentsViewProps {
  documents: InvestmentDocument[];
  workPrograms: WorkProgram[];
  currentUser: User;
  availableYears?: number[];
  selectedYear?: string;
  onOpenAddYearModal?: () => void;
  forcedType?: DocumentType | null;
  onRefresh: () => void;
  onUploadDocument: (formData: FormData) => Promise<void>;
  onUpdateDocument: (id: string, data: Partial<InvestmentDocument>) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onPreviewDocument: (doc: InvestmentDocument) => void;
  onDownloadDocument: (doc: InvestmentDocument) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  workPrograms,
  currentUser,
  availableYears = [2022, 2023, 2024, 2025, 2026],
  selectedYear,
  onOpenAddYearModal,
  forcedType = null,
  onRefresh,
  onUploadDocument,
  onUpdateDocument,
  onDeleteDocument,
  onPreviewDocument,
  onDownloadDocument
}) => {
  const [search, setSearch] = useState('');
  const [filterTahun, setFilterTahun] = useState<string>(selectedYear || 'Semua');
  const [filterType, setFilterType] = useState<string>(forcedType || 'Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterProker, setFilterProker] = useState<string>('Semua');

  // Sync filterTahun if selectedYear prop changes
  useEffect(() => {
    if (selectedYear && selectedYear !== 'Semua') {
      setFilterTahun(selectedYear);
    }
  }, [selectedYear]);

  // Lookup map: Proker ID -> Proker object
  const prokerMap = useMemo(() => {
    const map = new Map<string, WorkProgram>();
    workPrograms.forEach((p) => map.set(p.id, p));
    return map;
  }, [workPrograms]);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [replaceTargetDoc, setReplaceTargetDoc] = useState<InvestmentDocument | null>(null);
  const [editTargetDoc, setEditTargetDoc] = useState<InvestmentDocument | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Upload Form State
  const defaultYear = useMemo(() => {
    if (filterTahun && filterTahun !== 'Semua') return parseInt(filterTahun);
    return availableYears.length > 0 ? Math.max(...availableYears) : 2026;
  }, [filterTahun, availableYears]);

  const [uploadTahun, setUploadTahun] = useState<number>(defaultYear);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProkerId, setUploadProkerId] = useState<string>('');
  const [uploadJenis, setUploadJenis] = useState<DocumentType>(forcedType || 'PKS');
  const [uploadNomor, setUploadNomor] = useState('');
  const [uploadNama, setUploadNama] = useState('');
  const [uploadVendor, setUploadVendor] = useState('');
  const [uploadNilai, setUploadNilai] = useState<number | ''>('');
  const [uploadTanggal, setUploadTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [uploadCatatan, setUploadCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prokers filtered by chosen uploadTahun
  const uploadProkers = useMemo(() => {
    return workPrograms.filter((p) => p.tahunAnggaran === uploadTahun);
  }, [workPrograms, uploadTahun]);

  // Auto-select valid proker when uploadProkers change
  useEffect(() => {
    if (uploadProkers.length > 0 && !uploadProkers.some((p) => p.id === uploadProkerId)) {
      setUploadProkerId(uploadProkers[0].id);
    }
  }, [uploadProkers, uploadProkerId]);

  // Edit Metadata State
  const [editTahun, setEditTahun] = useState<number>(2026);
  const [editNomor, setEditNomor] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [editNilai, setEditNilai] = useState<number | ''>('');

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const docYear = d.tahunAnggaran || prokerMap.get(d.prokerId)?.tahunAnggaran;
      const matchYear = filterTahun === 'Semua' || (docYear && docYear.toString() === filterTahun);
      const matchForced = !forcedType || d.jenisDokumen === forcedType;
      const matchType = filterType === 'Semua' || d.jenisDokumen === filterType;
      const matchStatus = filterStatus === 'Semua' || d.statusVerifikasi === filterStatus;
      const matchProker = filterProker === 'Semua' || d.prokerId === filterProker;
      const matchSearch =
        d.namaDokumen.toLowerCase().includes(search.toLowerCase()) ||
        d.nomorDokumen.toLowerCase().includes(search.toLowerCase()) ||
        d.namaFileAsli.toLowerCase().includes(search.toLowerCase()) ||
        d.kodeProker.toLowerCase().includes(search.toLowerCase()) ||
        (d.namaVendor && d.namaVendor.toLowerCase().includes(search.toLowerCase()));

      return matchYear && matchForced && matchType && matchStatus && matchProker && matchSearch;
    });
  }, [documents, prokerMap, filterTahun, forcedType, filterType, filterStatus, filterProker, search]);

  const docKpis = useMemo(() => {
    const total = filteredDocs.length;
    const verified = filteredDocs.filter((d) => d.statusVerifikasi === 'Terverifikasi').length;
    const pending = filteredDocs.filter((d) => d.statusVerifikasi === 'Menunggu Verifikasi').length;
    const needRevision = filteredDocs.filter((d) => d.statusVerifikasi === 'Perlu Perbaikan').length;
    const totalNilai = filteredDocs.reduce((acc, d) => acc + (d.nilaiDokumen || 0), 0);
    return { total, verified, pending, needRevision, totalNilai };
  }, [filteredDocs]);

  const handleOpenUpload = (targetProkerId?: string, defaultType?: DocumentType) => {
    setReplaceTargetDoc(null);
    setUploadFile(null);
    const initialYr = filterTahun !== 'Semua' ? parseInt(filterTahun) : (availableYears[availableYears.length - 1] || 2026);
    setUploadTahun(initialYr);
    const matchingProkers = workPrograms.filter((p) => p.tahunAnggaran === initialYr);
    setUploadProkerId(targetProkerId || matchingProkers[0]?.id || workPrograms[0]?.id || '');
    setUploadJenis(defaultType || forcedType || 'PKS');
    setUploadNomor('');
    setUploadNama('');
    setUploadVendor('');
    setUploadNilai('');
    setUploadTanggal(new Date().toISOString().substring(0, 10));
    setUploadCatatan('');
    setShowUploadModal(true);
  };

  const handleOpenReplaceVersion = (doc: InvestmentDocument) => {
    setReplaceTargetDoc(doc);
    setUploadFile(null);
    const docYr = doc.tahunAnggaran || prokerMap.get(doc.prokerId)?.tahunAnggaran || 2026;
    setUploadTahun(docYr);
    setUploadProkerId(doc.prokerId);
    setUploadJenis(doc.jenisDokumen);
    setUploadNomor(doc.nomorDokumen);
    setUploadNama(doc.namaDokumen);
    setUploadVendor(doc.namaVendor || '');
    setUploadNilai(doc.nilaiDokumen || '');
    setUploadTanggal(new Date().toISOString().substring(0, 10));
    setUploadCatatan('');
    setShowUploadModal(true);
  };

  const handleOpenEditMetadata = (doc: InvestmentDocument) => {
    setEditTargetDoc(doc);
    setEditTahun(doc.tahunAnggaran || prokerMap.get(doc.prokerId)?.tahunAnggaran || 2026);
    setEditNomor(doc.nomorDokumen);
    setEditNama(doc.namaDokumen);
    setEditVendor(doc.namaVendor || '');
    setEditNilai(doc.nilaiDokumen || '');
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('prokerId', uploadProkerId);
      formData.append('tahunAnggaran', uploadTahun.toString());
      formData.append('jenisDokumen', uploadJenis);
      formData.append('nomorDokumen', uploadNomor || `DOK/${Date.now().toString().slice(-6)}`);
      formData.append('namaDokumen', uploadNama || uploadFile.name);
      formData.append('namaVendor', uploadVendor);
      if (uploadNilai !== '') formData.append('nilaiDokumen', uploadNilai.toString());
      formData.append('tanggalDokumen', uploadTanggal);
      formData.append('catatan', uploadCatatan);
      formData.append('picPengunggah', currentUser.name);
      formData.append('userId', currentUser.id);
      formData.append('userName', currentUser.name);
      formData.append('userRole', currentUser.role);

      if (replaceTargetDoc) {
        formData.append('replaceDocId', replaceTargetDoc.id);
      }

      await onUploadDocument(formData);
      setShowUploadModal(false);
      onRefresh();
    } catch (err: any) {
      alert('Error mengunggah dokumen: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetDoc) return;

    await onUpdateDocument(editTargetDoc.id, {
      nomorDokumen: editNomor,
      namaDokumen: editNama,
      namaVendor: editVendor,
      tahunAnggaran: editTahun,
      nilaiDokumen: editNilai !== '' ? Number(editNilai) : undefined
    });
    setEditTargetDoc(null);
    onRefresh();
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'Terverifikasi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
            <CheckCircle className="w-3 h-3" />
            <span>Terverifikasi</span>
          </span>
        );
      case 'Menunggu Verifikasi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
            <Clock className="w-3 h-3" />
            <span>Menunggu Verifikasi</span>
          </span>
        );
      case 'Perlu Perbaikan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-semibold">
            <AlertTriangle className="w-3 h-3" />
            <span>Perlu Perbaikan</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[11px] font-semibold">
            <span>Draft</span>
          </span>
        );
    }
  };

  const canUpload = ['Administrator', 'VP/Manager', 'PIC Proker', 'Reviewer Dokumen'].includes(currentUser.role);
  const canDelete = currentUser.role === 'Administrator';

  const title = forcedType ? `Modul Dokumen ${forcedType}` : 'Manajemen Dokumen Investasi CAPEX';

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pengelolaan file asli, riwayat versi, preview PDF, dan verifikasi kepatuhan dokumen CAPEX
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenAddYearModal && (
            <button
              onClick={onOpenAddYearModal}
              className="px-3 py-2 bg-[#18294e] hover:bg-[#203666] text-slate-200 border border-[#253d73] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              <span>+ Tambah Tahun</span>
            </button>
          )}

          {canUpload && (
            <button
              onClick={() => handleOpenUpload()}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all active:scale-95 shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Dokumen {forcedType || ''}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards & Year Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase text-[11px] tracking-wider">Total Dokumen</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] font-bold">
              {filterTahun === 'Semua' ? 'Semua TA' : `TA ${filterTahun}`}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono">{docKpis.total}</span>
            <span className="text-slate-400 text-[11px]">Berkas Arsip</span>
          </div>
        </div>

        <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase text-[11px] tracking-wider">Terverifikasi</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">{docKpis.verified}</span>
            <span className="text-emerald-400/80 text-[11px] font-semibold">
              {docKpis.total > 0 ? `${((docKpis.verified / docKpis.total) * 100).toFixed(0)}% Sesuai` : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase text-[11px] tracking-wider">Menunggu Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-400 font-mono">{docKpis.pending}</span>
            <span className="text-amber-400/80 text-[11px]">Perlu Tindakan</span>
          </div>
        </div>

        <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase text-[11px] tracking-wider">Total Nilai Dokumen</span>
            <span className="text-emerald-400 text-[10px] font-mono">BSU / Kontrak</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-white font-mono">{formatRupiah(docKpis.totalNilai)}</span>
          </div>
        </div>
      </div>

      {/* Quick Year Selection Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0 mr-1">
          <Calendar className="w-3.5 h-3.5 text-orange-400" />
          <span>Pilihan Tahun:</span>
        </span>
        <button
          onClick={() => setFilterTahun('Semua')}
          className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 ${
            filterTahun === 'Semua'
              ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
              : 'bg-[#13203c] hover:bg-[#1a2c52] text-slate-300 border border-[#1e325c]'
          }`}
        >
          Semua Tahun
        </button>
        {availableYears.map((yr) => (
          <button
            key={yr}
            onClick={() => setFilterTahun(yr.toString())}
            className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 ${
              filterTahun === yr.toString()
                ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                : 'bg-[#13203c] hover:bg-[#1a2c52] text-slate-300 border border-[#1e325c]'
            }`}
          >
            TA {yr}
          </button>
        ))}
        {onOpenAddYearModal && (
          <button
            onClick={onOpenAddYearModal}
            className="px-2.5 py-1 rounded-lg text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 font-semibold transition-all shrink-0"
          >
            + Tambah Tahun
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor dokumen, nama file, vendor..."
              className="w-full bg-[#0d1733] border border-[#213565] text-white text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Pilihan Tahun Dropdown */}
          <div className="flex items-center gap-1 bg-[#0d1733] border border-[#213565] px-2 py-1 rounded-lg">
            <span className="text-slate-400">Tahun:</span>
            <select
              value={filterTahun}
              onChange={(e) => {
                if (e.target.value === '__add__') {
                  if (onOpenAddYearModal) onOpenAddYearModal();
                } else {
                  setFilterTahun(e.target.value);
                }
              }}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="Semua" className="bg-[#0d1733]">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr.toString()} className="bg-[#0d1733]">
                  TA {yr}
                </option>
              ))}
              {onOpenAddYearModal && (
                <option value="__add__" className="bg-[#0d1733] text-orange-400 font-bold">
                  + Tambah Tahun...
                </option>
              )}
            </select>
          </div>

          {!forcedType && (
            <div className="flex items-center gap-1 bg-[#0d1733] border border-[#213565] px-2 py-1 rounded-lg">
              <span className="text-slate-400">Jenis:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="Semua" className="bg-[#0d1733]">Semua Jenis</option>
                <option value="PKS" className="bg-[#0d1733]">PKS</option>
                <option value="SPK" className="bg-[#0d1733]">SPK</option>
                <option value="Invoice" className="bg-[#0d1733]">Invoice</option>
                <option value="BAPP" className="bg-[#0d1733]">BAPP</option>
                <option value="FS-BC" className="bg-[#0d1733]">FS-BC</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 bg-[#0d1733] border border-[#213565] px-2 py-1 rounded-lg">
            <span className="text-slate-400">Program Kerja:</span>
            <select
              value={filterProker}
              onChange={(e) => setFilterProker(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="Semua" className="bg-[#0d1733]">Semua Proker</option>
              {workPrograms
                .filter((p) => filterTahun === 'Semua' || p.tahunAnggaran.toString() === filterTahun)
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0d1733]">
                    [{p.tahunAnggaran}] {p.kodeProker} - {p.namaProker}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#0d1733] border border-[#213565] px-2 py-1 rounded-lg">
            <span className="text-slate-400">Verifikasi:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="Semua" className="bg-[#0d1733]">Semua Status</option>
              <option value="Terverifikasi" className="bg-[#0d1733]">Terverifikasi</option>
              <option value="Menunggu Verifikasi" className="bg-[#0d1733]">Menunggu Verifikasi</option>
              <option value="Draft" className="bg-[#0d1733]">Draft</option>
              <option value="Perlu Perbaikan" className="bg-[#0d1733]">Perlu Perbaikan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dokumen Table - matching Prompt Section 5 */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0d1733] border-b border-[#1c2c54] text-slate-300 select-none">
                <th className="py-3 px-3 font-bold">PROGRAM KERJA</th>
                <th className="py-3 px-3 font-bold text-center">JENIS</th>
                <th className="py-3 px-3 font-bold">NOMOR DOKUMEN</th>
                <th className="py-3 px-3 font-bold min-w-[200px]">NAMA FILE ASLI</th>
                <th className="py-3 px-3 font-bold">VENDOR / NILAI</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">TANGGAL UPLOAD</th>
                <th className="py-3 px-3 font-bold text-center">STATUS</th>
                <th className="py-3 px-3 font-bold text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2c54]/60">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada dokumen yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#18294e]/70 transition-colors">
                    <td className="py-3 px-3 max-w-[210px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-blue-400">
                          {doc.kodeProker}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-mono text-[9px] border border-orange-500/25 font-bold">
                          TA {doc.tahunAnggaran || prokerMap.get(doc.prokerId)?.tahunAnggaran || '-'}
                        </span>
                      </div>
                      <span className="text-white text-[11px] truncate block mt-0.5" title={doc.namaProker}>
                        {doc.namaProker}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold text-[10px]">
                        {doc.jenisDokumen}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-200 whitespace-nowrap">
                      <div>{doc.nomorDokumen}</div>
                      <span className="text-[10px] text-orange-400 font-mono">v{doc.versi}</span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onPreviewDocument(doc)}
                        className="text-white font-medium hover:text-orange-400 text-left block truncate max-w-xs transition-colors"
                      >
                        {doc.namaFileAsli}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatFileSize(doc.ukuranFile)} · {doc.picPengunggah}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 text-[11px]">
                      <div>{doc.namaVendor || '-'}</div>
                      {doc.nilaiDokumen && (
                        <div className="font-mono text-emerald-400 font-semibold mt-0.5">
                          {formatRupiah(doc.nilaiDokumen)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                      {formatDateIndo(doc.tanggalUpload)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(doc.statusVerifikasi)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onPreviewDocument(doc)}
                          title="Lihat / Preview Dokumen"
                          className="p-1 rounded hover:bg-[#203666] text-blue-400 hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDownloadDocument(doc)}
                          title="Download File Asli"
                          className="p-1 rounded hover:bg-[#203666] text-emerald-400 hover:text-white"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canUpload && (
                          <button
                            onClick={() => handleOpenReplaceVersion(doc)}
                            title="Upload Versi Baru (Update File)"
                            className="p-1 rounded hover:bg-[#203666] text-orange-400 hover:text-white"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canUpload && (
                          <button
                            onClick={() => handleOpenEditMetadata(doc)}
                            title="Edit Metadata Dokumen"
                            className="p-1 rounded hover:bg-[#203666] text-amber-400 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTargetId(doc.id)}
                            title="Hapus Dokumen"
                            className="p-1 rounded hover:bg-[#203666] text-red-400 hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPLOAD / UPDATE VERSION MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-400" />
                <span>
                  {replaceTargetDoc
                    ? `Upload Versi Terbaru: ${replaceTargetDoc.nomorDokumen}`
                    : 'Upload Dokumen Investasi Baru'}
                </span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUpload} className="space-y-3.5 text-xs">
              {/* File Dropzone */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pilih Berkas Dokumen (PDF, DOCX, XLSX) *
                </label>
                <div className="border-2 border-dashed border-[#24396b] hover:border-orange-500 rounded-xl p-4 text-center bg-[#0d1733] cursor-pointer">
                  <input
                    type="file"
                    required
                    accept=".pdf, .doc, .docx, .xls, .xlsx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600"
                  />
                  {uploadFile && (
                    <p className="mt-2 text-emerald-400 font-mono text-[11px]">
                      File terpilih: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </p>
                  )}
                </div>
              </div>

              {/* Tahun Anggaran & Proker Selector */}
              <div className="bg-[#0b1429] border border-[#1e325c] rounded-xl p-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-400" />
                      <span>Pilihan Tahun Anggaran *</span>
                    </label>
                    <select
                      disabled={!!replaceTargetDoc}
                      value={uploadTahun}
                      onChange={(e) => {
                        if (e.target.value === '__add__') {
                          if (onOpenAddYearModal) onOpenAddYearModal();
                        } else {
                          const yr = parseInt(e.target.value);
                          setUploadTahun(yr);
                          const matching = workPrograms.filter((p) => p.tahunAnggaran === yr);
                          if (matching.length > 0) {
                            setUploadProkerId(matching[0].id);
                          } else {
                            setUploadProkerId('');
                          }
                        }
                      }}
                      className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono focus:border-orange-500 cursor-pointer"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr} className="bg-[#0d1733]">
                          Tahun Anggaran {yr}
                        </option>
                      ))}
                      {onOpenAddYearModal && (
                        <option value="__add__" className="bg-[#0d1733] text-orange-400 font-bold">
                          + Tambah Tahun Baru...
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                      <span>Program Kerja Terkait *</span>
                      <span className="text-[10px] text-orange-400 font-mono font-normal">TA {uploadTahun}</span>
                    </label>
                    <select
                      disabled={!!replaceTargetDoc}
                      value={uploadProkerId}
                      onChange={(e) => setUploadProkerId(e.target.value)}
                      className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white focus:border-orange-500"
                    >
                      {uploadProkers.length === 0 ? (
                        <option value="">(Belum ada program kerja pada TA {uploadTahun})</option>
                      ) : (
                        uploadProkers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.kodeProker} - {p.namaProker}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {uploadProkerId && prokerMap.get(uploadProkerId) && (
                  <div className="text-[11px] bg-[#122144] px-3 py-2 rounded-lg border border-[#223969] text-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <div className="truncate max-w-sm">
                      <span className="text-white font-semibold block truncate">
                        {prokerMap.get(uploadProkerId)?.namaProker}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {prokerMap.get(uploadProkerId)?.direktorat} · PIC: {prokerMap.get(uploadProkerId)?.ownerPic}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">RKAP CAPEX</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {formatRupiah(prokerMap.get(uploadProkerId)?.nilaiCapexRkap || 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Jenis & Nomor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jenis Dokumen *</label>
                  <select
                    disabled={!!replaceTargetDoc || !!forcedType}
                    value={uploadJenis}
                    onChange={(e) => setUploadJenis(e.target.value as any)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white focus:border-orange-500"
                  >
                    <option value="PKS">PKS (Perjanjian Kerja Sama)</option>
                    <option value="SPK">SPK (Surat Perintah Kerja)</option>
                    <option value="Invoice">Invoice (Tagihan)</option>
                    <option value="BAPP">BAPP (Berita Acara)</option>
                    <option value="FS-BC">FS-BC (Feasibility Study)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Dokumen *</label>
                  <input
                    type="text"
                    required
                    value={uploadNomor}
                    onChange={(e) => setUploadNomor(e.target.value)}
                    placeholder="Contoh: PKS.120/DIR-POS/2026"
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Nama Dokumen */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul / Nama Dokumen</label>
                <input
                  type="text"
                  value={uploadNama}
                  onChange={(e) => setUploadNama(e.target.value)}
                  placeholder="Keterangan judul dokumen..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white focus:border-orange-500"
                />
              </div>

              {/* Vendor & Nilai */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Vendor / Penyedia</label>
                  <input
                    type="text"
                    value={uploadVendor}
                    onChange={(e) => setUploadVendor(e.target.value)}
                    placeholder="PT Telkom / Wijaya Karya..."
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nilai Dokumen (Miliar Rp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadNilai}
                    onChange={(e) => setUploadNilai(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Pengunggahan</label>
                <textarea
                  rows={2}
                  value={uploadCatatan}
                  onChange={(e) => setUploadCatatan(e.target.value)}
                  placeholder="Keterangan versi baru atau justifikasi dokumen..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg hover:bg-[#203666]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Mengunggah...' : replaceTargetDoc ? 'Simpan Versi Baru' : 'Upload Dokumen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT METADATA MODAL */}
      {editTargetDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Edit Metadata Dokumen</span>
              </h3>
              <button
                onClick={() => setEditTargetDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                  <span>Tahun Anggaran Dokumen</span>
                </label>
                <select
                  value={editTahun}
                  onChange={(e) => setEditTahun(parseInt(e.target.value))}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono focus:border-orange-500 cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr} className="bg-[#0d1733]">
                      Tahun Anggaran {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nomor Dokumen</label>
                <input
                  type="text"
                  required
                  value={editNomor}
                  onChange={(e) => setEditNomor(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Dokumen</label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Vendor / Penyedia</label>
                <input
                  type="text"
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nilai Dokumen (Miliar Rp)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editNilai}
                  onChange={(e) => setEditNilai(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setEditTargetDoc(null)}
                  className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Hapus Dokumen Investasi</h3>
              <p className="text-xs text-slate-300 mt-2">
                Apakah Anda yakin ingin menghapus dokumen ini beserta seluruh arsip filenya? Tindakan ini dicatat dalam log audit.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 px-4 py-2 bg-[#18294e] text-slate-300 text-xs font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  await onDeleteDocument(deleteTargetId);
                  setDeleteTargetId(null);
                  onRefresh();
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-lg"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

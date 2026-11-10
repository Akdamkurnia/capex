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
  Layers,
  Sparkles,
  FileUp,
  Check
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
  initialProkerId?: string;
  initialDocType?: DocumentType | null;
  initialOpenUpload?: boolean;
  onClearUploadIntent?: () => void;
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
  initialProkerId,
  initialDocType,
  initialOpenUpload,
  onClearUploadIntent,
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

  // Success Notification Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-generate realistic document number helper
  const generateNomorDokumen = (jenis: DocumentType, yr: number, pid: string) => {
    const p = prokerMap.get(pid);
    const unit = p ? p.ownerCategory.toUpperCase() : 'DIR-POS';
    const rand = Math.floor(100 + Math.random() * 900);
    return `${jenis}.${rand}/${unit}/${yr}`;
  };

  const handleQuickGenerateNomor = () => {
    setUploadNomor(generateNomorDokumen(uploadJenis, uploadTahun, uploadProkerId));
  };

  // Open upload modal with optional preset proker & type
  const handleOpenUpload = (targetProkerId?: string, defaultType?: DocumentType, yrOverride?: number) => {
    setReplaceTargetDoc(null);
    setUploadFile(null);

    const targetProker = targetProkerId ? prokerMap.get(targetProkerId) : null;
    const initialYr = yrOverride || (targetProker ? targetProker.tahunAnggaran : (filterTahun !== 'Semua' ? parseInt(filterTahun) : (availableYears[availableYears.length - 1] || 2026)));

    setUploadTahun(initialYr);

    // Resolve proker for that year
    const matching = workPrograms.filter((p) => p.tahunAnggaran === initialYr);
    const resolvedPid = targetProkerId || matching[0]?.id || workPrograms[0]?.id || '';
    setUploadProkerId(resolvedPid);

    const chosenJenis = defaultType || forcedType || 'PKS';
    setUploadJenis(chosenJenis);

    // Pre-generate number & vendor
    setUploadNomor(generateNomorDokumen(chosenJenis, initialYr, resolvedPid));
    setUploadNama('');
    setUploadVendor(targetProker?.ownerPic || '');
    setUploadNilai('');
    setUploadTanggal(new Date().toISOString().substring(0, 10));
    setUploadCatatan('');
    setShowUploadModal(true);
  };

  // Handle Intent when coming from another view (e.g. Program Kerja click Upload PKS / SPK / Invoice / BAPP / FS-BC)
  useEffect(() => {
    if (initialOpenUpload) {
      handleOpenUpload(initialProkerId, initialDocType || forcedType || 'PKS');
      if (onClearUploadIntent) onClearUploadIntent();
    }
  }, [initialOpenUpload, initialProkerId, initialDocType]);

  // Prokers available for upload: fallback to all prokers if specific year has none yet
  const uploadProkers = useMemo(() => {
    const matching = workPrograms.filter((p) => p.tahunAnggaran === uploadTahun);
    return matching.length > 0 ? matching : workPrograms;
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

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadFile(file);
      if (!uploadNama) {
        setUploadNama(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Pilih file berkas dokumen terlebih dahulu');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('prokerId', uploadProkerId || workPrograms[0]?.id || 'PRK-001');
      formData.append('tahunAnggaran', uploadTahun.toString());
      formData.append('jenisDokumen', uploadJenis);
      
      const finalNomor = uploadNomor.trim() || generateNomorDokumen(uploadJenis, uploadTahun, uploadProkerId);
      formData.append('nomorDokumen', finalNomor);
      formData.append('namaDokumen', uploadNama.trim() || uploadFile.name);
      formData.append('namaVendor', uploadVendor.trim());
      if (uploadNilai !== '') formData.append('nilaiDokumen', uploadNilai.toString());
      formData.append('tanggalDokumen', uploadTanggal);
      formData.append('catatan', uploadCatatan.trim());
      formData.append('picPengunggah', currentUser.name);
      formData.append('userId', currentUser.id);
      formData.append('userName', currentUser.name);
      formData.append('userRole', currentUser.role);

      if (replaceTargetDoc) {
        formData.append('replaceDocId', replaceTargetDoc.id);
      }

      await onUploadDocument(formData);
      setShowUploadModal(false);
      
      // Auto switch filters so the newly uploaded document is immediately visible
      setFilterTahun(uploadTahun.toString());
      if (!forcedType) {
        setFilterType(uploadJenis);
      }
      setFilterProker('Semua');
      setFilterStatus('Semua');

      const successMsg = replaceTargetDoc
        ? `Versi baru berkas ${finalNomor} (${uploadJenis}) berhasil disimpan permanen di repositori!`
        : `Berkas ${uploadJenis} (${finalNomor}) berhasil diunggah & tersimpan aman di repositori (lokal & cloud)!`;
      setSuccessToast(successMsg);
      setTimeout(() => setSuccessToast(null), 5000);

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

  // Counts for 5 mandatory types
  const typeCounts = useMemo(() => {
    const base = documents.filter((d) => {
      const docYear = d.tahunAnggaran || prokerMap.get(d.prokerId)?.tahunAnggaran;
      return filterTahun === 'Semua' || (docYear && docYear.toString() === filterTahun);
    });
    return {
      PKS: base.filter((d) => d.jenisDokumen === 'PKS').length,
      SPK: base.filter((d) => d.jenisDokumen === 'SPK').length,
      Invoice: base.filter((d) => d.jenisDokumen === 'Invoice').length,
      BAPP: base.filter((d) => d.jenisDokumen === 'BAPP').length,
      'FS-BC': base.filter((d) => d.jenisDokumen === 'FS-BC').length,
      Total: base.length
    };
  }, [documents, prokerMap, filterTahun]);

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[11px] font-semibold">
            <Clock className="w-3 h-3" />
            <span>Draft</span>
          </span>
        );
    }
  };

  const getDocTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'PKS':
        return <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />;
      case 'SPK':
        return <FileSignature className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Invoice':
        return <Receipt className="w-3.5 h-3.5 text-amber-400" />;
      case 'BAPP':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />;
      case 'FS-BC':
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const canUpload = ['Administrator', 'VP/Manager', 'PIC Proker'].includes(currentUser.role);
  const canDelete = ['Administrator'].includes(currentUser.role);

  return (
    <div className="space-y-5">
      {/* SUCCESS TOAST NOTIFICATION */}
      {successToast && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between shadow-lg text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {forcedType
                ? `Manajemen Dokumen ${forcedType}`
                : 'Pusat Manajemen Dokumen Investasi CAPEX'}
            </h2>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Penyimpanan Permanen Aktif</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Arsip terpusat PKS, SPK, Invoice, BAPP, dan FS-BC tersimpan aman di repositori permanen (penyimpanan lokal & cloud persistence)
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

      {/* 5 DOCUMENT TYPES SHORTCUT TABS (If not forced) */}
      {!forcedType && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span>Kategori Dokumen:</span>
          </span>
          <button
            onClick={() => setFilterType('Semua')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              filterType === 'Semua'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-[#13203c] hover:bg-[#1a2c52] text-slate-300 border border-[#1e325c]'
            }`}
          >
            <span>Semua Jenis</span>
            <span className="px-1.5 py-0.2 rounded bg-black/30 font-mono text-[10px]">
              {typeCounts.Total}
            </span>
          </button>

          {(['PKS', 'SPK', 'Invoice', 'BAPP', 'FS-BC'] as DocumentType[]).map((jt) => (
            <button
              key={jt}
              onClick={() => setFilterType(jt)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                filterType === jt
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-[#13203c] hover:bg-[#1a2c52] text-slate-300 border border-[#1e325c]'
              }`}
            >
              {getDocTypeIcon(jt)}
              <span>{jt}</span>
              <span className="px-1.5 py-0.2 rounded bg-black/30 font-mono text-[10px]">
                {typeCounts[jt]}
              </span>
            </button>
          ))}
        </div>
      )}

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
            <span className="text-slate-400 text-[11px]">Berkas Tersimpan</span>
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

      {/* Filter Toolbar */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor dokumen, file, vendor, proker..."
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

      {/* Dokumen Table */}
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
                    <FolderLock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Tidak ada dokumen yang ditemukan sesuai filter.</p>
                    {canUpload && (
                      <button
                        onClick={() => handleOpenUpload()}
                        className="mt-3 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold shadow"
                      >
                        + Upload Dokumen Baru
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#18294e]/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-orange-400 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-[#0d1733] border border-[#213565] text-[10px]">
                          TA {doc.tahunAnggaran || prokerMap.get(doc.prokerId)?.tahunAnggaran || 2026}
                        </span>
                        <span>{doc.kodeProker}</span>
                      </div>
                      <div className="font-medium text-slate-200 truncate max-w-xs mt-0.5">
                        {doc.namaProker}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-[#1a2d54] text-white border border-[#233f7a]">
                        {getDocTypeIcon(doc.jenisDokumen)}
                        <span>{doc.jenisDokumen}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      <div>{doc.nomorDokumen}</div>
                      <span className="text-[10px] text-orange-400 font-mono">v{doc.versi}</span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onPreviewDocument(doc)}
                        className="text-white font-medium hover:text-orange-400 text-left block truncate max-w-xs transition-colors"
                        title="Klik untuk melihat preview"
                      >
                        {doc.namaFileAsli}
                      </button>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(doc.ukuranFile)} · {doc.picPengunggah}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                          <Check className="w-2.5 h-2.5" />
                          <span>Tersimpan</span>
                        </span>
                      </div>
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

      {/* UPLOAD / UPDATE VERSION MODAL (PKS, SPK, INVOICE, BAPP, FS-BC) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-400" />
                <span>
                  {replaceTargetDoc
                    ? `Upload Versi Terbaru: ${replaceTargetDoc.nomorDokumen}`
                    : `Upload Dokumen ${uploadJenis} Investasi`}
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
              {/* Jenis Dokumen Selector Cards */}
              {!replaceTargetDoc && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-semibold">
                      Jenis Dokumen Investasi *
                    </label>
                    {forcedType && (
                      <span className="text-[10px] text-orange-400 font-mono font-semibold">
                        Modul Khusus: {forcedType}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {(['PKS', 'SPK', 'Invoice', 'BAPP', 'FS-BC'] as DocumentType[]).map((jt) => (
                      <button
                        type="button"
                        key={jt}
                        onClick={() => {
                          setUploadJenis(jt);
                          setUploadNomor(generateNomorDokumen(jt, uploadTahun, uploadProkerId));
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                          uploadJenis === jt
                            ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold shadow-md ring-1 ring-orange-500/40'
                            : 'bg-[#0d1733] border-[#213565] text-slate-300 hover:bg-[#152347]'
                        }`}
                      >
                        {getDocTypeIcon(jt)}
                        <span className="text-[11px] font-mono">{jt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* File Dropzone */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pilih Berkas Dokumen (PDF, DOCX, XLSX, JPG, PNG) *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-orange-500 bg-orange-500/10'
                      : uploadFile
                      ? 'border-emerald-500/60 bg-emerald-500/5'
                      : 'border-[#24396b] hover:border-orange-500 bg-[#0d1733]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadFile(file);
                      if (file && !uploadNama) {
                        setUploadNama(file.name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${uploadFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      <FileUp className="w-5 h-5" />
                    </div>
                    {uploadFile ? (
                      <div>
                        <p className="text-emerald-400 font-bold font-mono text-xs">{uploadFile.name}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{formatFileSize(uploadFile.size)} · Klik untuk mengganti berkas</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-white font-semibold text-xs">Klik di sini untuk memilih berkas atau seret & lepas file</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">Mendukung PDF, Word (DOCX), Excel (XLSX), serta scan/foto (JPG, PNG)</p>
                      </div>
                    )}
                  </div>
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
                          const newPid = matching.length > 0 ? matching[0].id : workPrograms[0]?.id || '';
                          setUploadProkerId(newPid);
                          setUploadNomor(generateNomorDokumen(uploadJenis, yr, newPid));
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
                      onChange={(e) => {
                        const newPid = e.target.value;
                        setUploadProkerId(newPid);
                        setUploadNomor(generateNomorDokumen(uploadJenis, uploadTahun, newPid));
                      }}
                      className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white focus:border-orange-500 cursor-pointer"
                    >
                      {uploadProkers.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.tahunAnggaran}] {p.kodeProker} - {p.namaProker}
                        </option>
                      ))}
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
                        Rp {prokerMap.get(uploadProkerId)?.nilaiCapexRkap?.toFixed(2)} M
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Nomor Dokumen with Generator Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Nomor Dokumen *</label>
                  <button
                    type="button"
                    onClick={handleQuickGenerateNomor}
                    className="text-orange-400 hover:text-orange-300 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate No. Otomatis</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={uploadNomor}
                  onChange={(e) => setUploadNomor(e.target.value)}
                  placeholder="Contoh: PKS.120/DIR-POS/2026"
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono focus:border-orange-500"
                />
              </div>

              {/* Nama Dokumen */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul / Keterangan Dokumen</label>
                <input
                  type="text"
                  value={uploadNama}
                  onChange={(e) => setUploadNama(e.target.value)}
                  placeholder="Contoh: Perjanjian Kerja Sama Pengadaan Konsultan..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white focus:border-orange-500"
                />
              </div>

              {/* Vendor & Nilai */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Vendor / Rekanan</label>
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

              {/* Catatan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Pengunggahan</label>
                <textarea
                  rows={2}
                  value={uploadCatatan}
                  onChange={(e) => setUploadCatatan(e.target.value)}
                  placeholder="Keterangan versi atau kelengkapan berkas..."
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
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : replaceTargetDoc ? (
                    <span>Simpan Versi Baru</span>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      <span>Upload Dokumen</span>
                    </>
                  )}
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
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
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
                <label className="block text-slate-300 font-semibold mb-1">Judul Dokumen</label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Vendor</label>
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
                  className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg hover:bg-[#203666]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg"
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
          <div className="bg-[#111e3f] border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hapus Berkas Dokumen?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Tindakan ini tidak dapat dibatalkan. Berkas fisik dan riwayat audit dokumen ini akan dihapus dari sistem.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg hover:bg-[#203666] text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  await onDeleteDocument(deleteTargetId);
                  setDeleteTargetId(null);
                  onRefresh();
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-md"
              >
                Ya, Hapus Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

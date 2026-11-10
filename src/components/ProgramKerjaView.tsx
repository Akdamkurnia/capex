import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  FileText,
  Clock,
  ArrowUpDown,
  Coins,
  TrendingUp,
  Receipt,
  DollarSign,
  UserCog,
  UserCheck
} from 'lucide-react';
import { WorkProgram, User, DocumentChecklistSummary } from '../types';
import { formatRupiah, formatPercentage, formatDateIndo, formatMiliar } from '../utils/formatters';

interface ProgramKerjaViewProps {
  workPrograms: WorkProgram[];
  currentUser: User;
  users?: User[];
  availableYears?: number[];
  onOpenAddYearModal?: () => void;
  onRefresh: () => void;
  onCreateProker: (data: Partial<WorkProgram>) => Promise<void>;
  onUpdateProker: (id: string, data: Partial<WorkProgram>) => Promise<void>;
  onDeleteProker: (id: string) => Promise<void>;
  onAssignPic?: (prokerId: string, data: { ownerPic: string; ownerCategory: any; subdit?: string; divisiUnitKerja?: string; catatan?: string }) => Promise<void>;
  onOpenUploadModal: (proker: WorkProgram, defaultJenis?: string) => void;
  onViewDocument: (docId: string) => void;
}

export const ProgramKerjaView: React.FC<ProgramKerjaViewProps> = ({
  workPrograms,
  currentUser,
  users = [],
  availableYears = [2022, 2023, 2024, 2025, 2026],
  onOpenAddYearModal,
  onRefresh,
  onCreateProker,
  onUpdateProker,
  onDeleteProker,
  onAssignPic,
  onOpenUploadModal,
  onViewDocument
}) => {
  const [search, setSearch] = useState('');
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [filterBosie, setFilterBosie] = useState('Semua');
  const [filterOwner, setFilterOwner] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [sortField, setSortField] = useState<keyof WorkProgram>('kodeProker');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [selectedProkerDetail, setSelectedProkerDetail] = useState<WorkProgram | null>(null);
  const [prokerChecklist, setProkerChecklist] = useState<DocumentChecklistSummary | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProker, setEditingProker] = useState<WorkProgram | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // PIC Assignment State
  const [selectedProkerForPic, setSelectedProkerForPic] = useState<WorkProgram | null>(null);
  const [picAssignData, setPicAssignData] = useState<{
    ownerPic: string;
    ownerCategory: any;
    subdit: string;
    divisiUnitKerja: string;
    catatan: string;
  }>({
    ownerPic: '',
    ownerCategory: 'Induk',
    subdit: '',
    divisiUnitKerja: '',
    catatan: ''
  });
  const [isAssigningPic, setIsAssigningPic] = useState(false);

  const handleOpenAssignPic = (p: WorkProgram) => {
    setSelectedProkerForPic(p);
    setPicAssignData({
      ownerPic: p.ownerPic,
      ownerCategory: p.ownerCategory || 'Induk',
      subdit: p.subdit || '',
      divisiUnitKerja: p.divisiUnitKerja || '',
      catatan: p.catatan || ''
    });
  };

  const handleSaveAssignPic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProkerForPic) return;
    try {
      setIsAssigningPic(true);
      if (onAssignPic) {
        await onAssignPic(selectedProkerForPic.id, picAssignData);
      } else {
        await onUpdateProker(selectedProkerForPic.id, picAssignData);
      }
      setSelectedProkerForPic(null);
      onRefresh();
    } catch (err) {
      console.error('Gagal memperbarui penugasan PIC', err);
    } finally {
      setIsAssigningPic(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState<Partial<WorkProgram>>({
    kodeProker: '',
    namaProker: '',
    tahunAnggaran: 2026,
    functionalArea: 'Komensial',
    jenisBosie: 'O',
    direktorat: 'KOMERSIAL',
    subdit: '',
    divisiUnitKerja: '',
    ownerPic: currentUser.name,
    ownerCategory: 'Induk',
    namaPekerjaan: '',
    latarBelakang: '',
    tujuanInvestasi: '',
    nilaiCapexRkap: 0,
    nilaiKontrak: 0,
    nilaiRilis: 0,
    nilaiAktual: 0,
    tanggalMulai: new Date().toISOString().substring(0, 10),
    targetSelesai: '2026-12-31',
    progresFisik: 0,
    statusProyek: 'Belum Mulai',
    statusJadwal: 'Sesuai'
  });

  // Filter & Search Logic
  const filteredList = useMemo(() => {
    return workPrograms.filter((p) => {
      const matchSearch =
        p.kodeProker.toLowerCase().includes(search.toLowerCase()) ||
        p.namaProker.toLowerCase().includes(search.toLowerCase()) ||
        p.direktorat.toLowerCase().includes(search.toLowerCase()) ||
        p.ownerPic.toLowerCase().includes(search.toLowerCase());

      const matchTahun = filterTahun === 'Semua' || p.tahunAnggaran.toString() === filterTahun;
      const matchBosie = filterBosie === 'Semua' || p.jenisBosie === filterBosie;
      const matchOwner = filterOwner === 'Semua' || p.ownerCategory === filterOwner;
      const matchStatus = filterStatus === 'Semua' || p.statusProyek === filterStatus;

      return matchSearch && matchTahun && matchBosie && matchOwner && matchStatus;
    }).sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [workPrograms, search, filterTahun, filterBosie, filterOwner, filterStatus, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Perhitungan Akumulasi Finansial dalam Miliar dengan pemisahan Accrual & NPP OGP
  const financialTotals = useMemo(() => {
    let totalRkap = 0;
    let totalKontrak = 0;
    let totalRilis = 0;
    let totalAccrue = 0;
    let totalNppSudahOgp = 0;
    let totalNppBelumOgp = 0;
    let totalAktual = 0;
    let totalSisaAccrue = 0;

    filteredList.forEach((p) => {
      totalRkap += p.nilaiCapexRkap || 0;
      totalKontrak += p.nilaiKontrak || 0;
      totalRilis += p.nilaiRilis || 0;
      totalAccrue += p.nilaiAccrue || 0;
      totalNppSudahOgp += p.nilaiOgp || 0;
      totalNppBelumOgp += p.belumOgp || 0;
      totalAktual += p.nilaiAktual || 0;
      totalSisaAccrue += p.sisaAccrue || 0;
    });

    const totalSisaPembayaran = totalKontrak - totalAktual;
    const avgSerapan = totalRkap > 0 ? (totalAktual / totalRkap) * 100 : 0;

    return {
      totalRkap,
      totalKontrak,
      totalRilis,
      totalAccrue,
      totalNppSudahOgp,
      totalNppBelumOgp,
      totalAktual,
      totalSisaPembayaran,
      totalSisaAccrue,
      avgSerapan,
      count: filteredList.length
    };
  }, [filteredList]);

  const handleSort = (field: keyof WorkProgram) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleOpenDetail = async (p: WorkProgram) => {
    setSelectedProkerDetail(p);
    try {
      const res = await fetch(`/api/documents/checklist/${p.id}`);
      if (res.ok) {
        const data = await res.json();
        setProkerChecklist(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreate = () => {
    setEditingProker(null);
    setFormData({
      kodeProker: '',
      namaProker: '',
      tahunAnggaran: 2026,
      functionalArea: 'Komersial',
      jenisBosie: 'O',
      direktorat: 'KOMERSIAL',
      subdit: 'Consumer Business',
      divisiUnitKerja: 'Consumer Business',
      ownerPic: currentUser.name,
      ownerCategory: 'Induk',
      namaPekerjaan: '',
      latarBelakang: '',
      tujuanInvestasi: '',
      nilaiCapexRkap: 0,
      nilaiKontrak: 0,
      nilaiRilis: 0,
      nilaiAktual: 0,
      tanggalMulai: new Date().toISOString().substring(0, 10),
      targetSelesai: '2026-12-31',
      progresFisik: 0,
      statusProyek: 'Belum Mulai',
      statusJadwal: 'Sesuai'
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (p: WorkProgram) => {
    setEditingProker(p);
    setFormData({ ...p });
    setShowFormModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProker) {
      await onUpdateProker(editingProker.id, formData);
    } else {
      await onCreateProker(formData);
    }
    setShowFormModal(false);
    onRefresh();
  };

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    try {
      const f = new FormData();
      f.append('file', importFile);
      f.append('userId', currentUser.id);
      f.append('userName', currentUser.name);
      f.append('userRole', currentUser.role);

      const res = await fetch('/api/import/excel', {
        method: 'POST',
        body: f
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        onRefresh();
      }
    } catch (err: any) {
      setImportResult({ error: err.message });
    } finally {
      setImportLoading(false);
    }
  };

  const canEdit = ['Administrator', 'VP/Manager', 'PIC Proker'].includes(currentUser.role);
  const canDelete = currentUser.role === 'Administrator';

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Modul Program Kerja Investasi
          </h2>
          <p className="text-xs text-slate-400">
            Penjelasan Cost Proker Investasi & Checklist Dokumen CAPEX PT Pos Indonesia
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-[#18294e] hover:bg-[#21386d] text-slate-200 border border-[#2b4480] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import Excel</span>
          </button>

          <a
            href={`/api/export/excel?userId=${currentUser.id}&userName=${encodeURIComponent(currentUser.name)}&userRole=${currentUser.role}`}
            className="px-3 py-2 bg-[#18294e] hover:bg-[#21386d] text-slate-200 border border-[#2b4480] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>Export Proker (.xlsx)</span>
          </a>

          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Proker</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial KPI Summary Strip (Satuan Miliar) - Pemisahan Accrual & NPP OGP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-[#111e3f] border border-[#203463] p-3 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">RKAP (M)</span>
            <Coins className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-white font-mono tabular-nums">
              {formatMiliar(financialTotals.totalRkap)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">M</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">Plafon CAPEX</p>
        </div>

        <div className="bg-[#111e3f] border border-[#203463] p-3 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">KONTRAK (M)</span>
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-blue-400 font-mono tabular-nums">
              {formatMiliar(financialTotals.totalKontrak)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">M</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">Nilai Perikatan</p>
        </div>

        <div className="bg-[#111e3f] border border-[#203463] p-3 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">RILIS (M)</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-indigo-300 font-mono tabular-nums">
              {formatMiliar(financialTotals.totalRilis)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">M</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">Otorisasi Rilis</p>
        </div>

        {/* Accrual Card */}
        <div className="bg-[#111e3f] border border-blue-500/30 p-3 rounded-xl shadow-md bg-gradient-to-b from-[#111e3f] to-[#0c1833]">
          <div className="flex items-center justify-between text-blue-400 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-blue-300">ACCRUAL (M)</span>
            <span className="w-2 h-2 rounded-full bg-blue-400" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-blue-300 font-mono tabular-nums">
              {formatMiliar(financialTotals.totalAccrue)}
            </span>
            <span className="text-[10px] text-blue-400 font-semibold">M</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">Beban Akrual</p>
        </div>

        {/* NPP Sudah OGP Card */}
        <div className="bg-[#111e3f] border border-emerald-500/30 p-3 rounded-xl shadow-md bg-gradient-to-b from-[#111e3f] to-[#0c1833]">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300">SUDAH OGP (M)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-emerald-300 font-mono tabular-nums">
              {formatMiliar(financialTotals.totalNppSudahOgp)}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">M</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">NPP Terbit OGP</p>
        </div>

        {/* NPP Belum OGP Card */}
        <div className="bg-[#111e3f] border border-amber-500/30 p-3 rounded-xl shadow-md bg-gradient-to-b from-[#111e3f] to-[#0c1833]">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-300">BELUM OGP (M)</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-amber-300 font-mono tabular-nums">
              {formatMiliar(financialTotals.totalNppBelumOgp)}
            </span>
            <span className="text-[10px] text-amber-400 font-semibold">M</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">NPP Antrean OGP</p>
        </div>

        {/* Total Aktual Card */}
        <div className="bg-[#111e3f] border border-emerald-500/40 p-3 rounded-xl shadow-md bg-gradient-to-b from-[#111e3f] to-[#0a1e28]">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300">TOTAL AKTUAL (M)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-emerald-400 font-mono tabular-nums">
              {formatMiliar(financialTotals.totalAktual)}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">M</span>
          </div>
          <p className="text-[9px] text-emerald-400/90 font-mono font-bold mt-0.5">
            Serapan: {financialTotals.avgSerapan.toFixed(1)}%
          </p>
        </div>

        {/* Sisa Accrue Card */}
        <div className="bg-[#111e3f] border border-[#203463] p-3 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">SISA ACCRUE (M)</span>
            <DollarSign className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-extrabold text-purple-300 font-mono tabular-nums">
              {formatMiliar(financialTotals.totalSisaAccrue)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">M</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">Accrue - OGP</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode, nama proker, direktorat, PIC..."
              className="w-full bg-[#0d1733] border border-[#213565] text-white text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tahun Filter */}
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
              {availableYears.map(yr => (
                <option key={yr} value={yr.toString()} className="bg-[#0d1733]">{yr}</option>
              ))}
              {onOpenAddYearModal && (
                <option value="__add__" className="bg-[#0d1733] text-orange-400 font-bold">+ Tambah Tahun...</option>
              )}
            </select>
          </div>

          {/* BOSIE Filter */}
          <div className="flex items-center gap-1 bg-[#0d1733] border border-[#213565] px-2 py-1 rounded-lg">
            <span className="text-slate-400">BOSIE:</span>
            <select
              value={filterBosie}
              onChange={(e) => setFilterBosie(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="Semua" className="bg-[#0d1733]">Semua</option>
              <option value="B" className="bg-[#0d1733]">B (Business Dev)</option>
              <option value="O" className="bg-[#0d1733]">O (Ops Excellence)</option>
              <option value="S" className="bg-[#0d1733]">S (System Impr)</option>
              <option value="I" className="bg-[#0d1733]">I (IT Infra)</option>
              <option value="E" className="bg-[#0d1733]">E (Corp Enabler)</option>
            </select>
          </div>

          {/* Owner Filter */}
          <div className="flex items-center gap-1 bg-[#0d1733] border border-[#213565] px-2 py-1 rounded-lg">
            <span className="text-slate-400">Owner:</span>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="Semua" className="bg-[#0d1733]">Semua</option>
              <option value="Induk" className="bg-[#0d1733]">Kantor Pusat / Induk</option>
              <option value="Poslog" className="bg-[#0d1733]">Pos Logistik</option>
              <option value="Posdig" className="bg-[#0d1733]">Pos Digi</option>
              <option value="Pospro" className="bg-[#0d1733]">Pos Properti</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#0d1733] border border-[#213565] px-2 py-1 rounded-lg">
            <span className="text-slate-400">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="Semua" className="bg-[#0d1733]">Semua</option>
              <option value="Belum Mulai" className="bg-[#0d1733]">Belum Mulai</option>
              <option value="Proses" className="bg-[#0d1733]">Proses</option>
              <option value="Selesai" className="bg-[#0d1733]">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table matching image_63be6f67.png */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0d1733] border-b border-[#1c2c54] text-slate-300 select-none">
                <th className="py-3 px-3 font-bold text-center w-12">NO</th>
                <th
                  onClick={() => handleSort('direktorat')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>DIREKTORAT</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('kodeProker')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>KODE PROKER</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('namaProker')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white min-w-[220px]"
                >
                  <div className="flex items-center gap-1">
                    <span>KETERANGAN PROKER</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-3 font-bold">SUBDIT / UNIT</th>
                <th
                  onClick={() => handleSort('nilaiCapexRkap')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>RKAP (M)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nilaiKontrak')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>KONTRAK (M)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nilaiRilis')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>RILIS (M)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nilaiAccrue')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-white text-blue-300"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ACCRUAL (M)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nilaiOgp')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-white text-emerald-300"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>SUDAH OGP (M)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('belumOgp')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-white text-amber-300"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>BELUM OGP (M)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nilaiAktual')}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>TOTAL AKTUAL (M)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-3 font-bold text-center">SERAPAN %</th>
                <th className="py-3 px-3 font-bold text-right text-purple-300">SISA ACCRUE (M)</th>
                <th className="py-3 px-3 font-bold text-center">PROGRES</th>
                <th className="py-3 px-3 font-bold text-center">STATUS</th>
                <th className="py-3 px-3 font-bold text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2c54]/60">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-10 text-center text-slate-400">
                    Tidak ada program kerja yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedList.map((p, index) => {
                  const serapan = p.nilaiCapexRkap > 0 ? (p.nilaiAktual / p.nilaiCapexRkap) * 100 : 0;
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#18294e]/70 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {rowNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-semibold whitespace-nowrap text-[11px]">
                        {p.direktorat}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(p)}
                          className="hover:underline text-left"
                        >
                          {p.kodeProker}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-white font-medium max-w-xs">
                        <div className="font-semibold text-slate-100 line-clamp-2">
                          {p.namaProker}
                        </div>
                        <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-slate-800 rounded font-mono">BOSIE: {p.jenisBosie}</span>
                          <span>·</span>
                          <span>PIC: {p.ownerPic}</span>
                          {p.keteranganPpk && (
                            <>
                              <span>·</span>
                              <span className="text-amber-300/80 font-medium">PPK: {p.keteranganPpk}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap text-[11px] max-w-[150px] truncate">
                        {p.subdit || p.divisiUnitKerja}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums whitespace-nowrap">
                        {formatMiliar(p.nilaiCapexRkap)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                        {formatMiliar(p.nilaiKontrak)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-indigo-300 tabular-nums whitespace-nowrap">
                        {formatMiliar(p.nilaiRilis)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-300 font-semibold tabular-nums whitespace-nowrap bg-blue-500/5">
                        {formatMiliar(p.nilaiAccrue)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-300 font-semibold tabular-nums whitespace-nowrap bg-emerald-500/5">
                        {formatMiliar(p.nilaiOgp)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-300 font-semibold tabular-nums whitespace-nowrap bg-amber-500/5">
                        {formatMiliar(p.belumOgp)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                        {formatMiliar(p.nilaiAktual)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            serapan > 80
                              ? 'text-emerald-400'
                              : serapan > 20
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {serapan.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-purple-300 font-semibold">
                        {formatMiliar(p.sisaAccrue)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-white font-semibold tabular-nums">
                            {p.progresFisik}%
                          </span>
                          <div className="w-12 bg-slate-700 h-1 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${Math.min(p.progresFisik, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.statusProyek === 'Selesai'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : p.statusProyek === 'Proses'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                          }`}
                        >
                          {p.statusProyek}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDetail(p)}
                            title="Lihat Detail & Dokumen"
                            className="p-1 rounded hover:bg-[#203666] text-slate-300 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenAssignPic(p)}
                                title="Ubah Penugasan & Role PIC"
                                className="p-1 rounded hover:bg-[#203666] text-slate-300 hover:text-emerald-400"
                              >
                                <UserCog className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Data Proker"
                                className="p-1 rounded hover:bg-[#203666] text-slate-300 hover:text-white"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              title="Hapus Proker"
                              className="p-1 rounded hover:bg-[#203666] text-slate-300 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-[#0d1733] border-t border-[#1c2c54] px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <span>
            Menampilkan {filteredList.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredList.length)} dari {filteredList.length} Proker
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-[#18294e] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1 font-mono text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-[#18294e] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL WITH 5-INDICATOR DOCUMENT CHECKLIST */}
      {selectedProkerDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-[#1c2c54] flex items-center justify-between sticky top-0 bg-[#111e3f] z-10">
              <div>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-mono font-bold">
                  {selectedProkerDetail.kodeProker}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedProkerDetail.namaProker}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedProkerDetail(null);
                  setProkerChecklist(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* PANEL KELENGKAPAN DOKUMEN INVESTASI (5 INDIKATOR) */}
              <div className="bg-[#142347] border border-[#223666] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-orange-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Kelengkapan Dokumen Investasi CAPEX
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Wajib memenuhi 5 jenis dokumen: PKS, SPK, Invoice, BAPP, dan FS-BC
                      </p>
                    </div>
                  </div>
                  {prokerChecklist && (
                    <div className="text-right">
                      <span className="text-lg font-extrabold font-mono text-orange-400">
                        {prokerChecklist.completenessPercentage}%
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {prokerChecklist.completedMandatory} dari 5 Terverifikasi
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                    style={{ width: `${prokerChecklist ? prokerChecklist.completenessPercentage : 0}%` }}
                  />
                </div>

                {/* 5-Item Checklist Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#213565] text-slate-400">
                        <th className="py-2 font-semibold">Jenis Dokumen</th>
                        <th className="py-2 font-semibold">Fungsi / Ketentuan</th>
                        <th className="py-2 font-semibold text-center">Status</th>
                        <th className="py-2 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#213565]/60">
                      {[
                        {
                          type: 'PKS',
                          desc: 'Perjanjian Kerja Sama',
                          info: prokerChecklist?.pks
                        },
                        {
                          type: 'SPK',
                          desc: 'Surat Perintah Kerja',
                          info: prokerChecklist?.spk
                        },
                        {
                          type: 'Invoice',
                          desc: 'Tagihan Pembayaran Vendor',
                          info: prokerChecklist?.invoice
                        },
                        {
                          type: 'BAPP',
                          desc: 'Berita Acara Pemeriksaan Pekerjaan',
                          info: prokerChecklist?.bapp
                        },
                        {
                          type: 'FS-BC',
                          desc: 'Feasibility Study & Business Case',
                          info: prokerChecklist?.fsBc
                        }
                      ].map((item) => (
                        <tr key={item.type}>
                          <td className="py-2.5 font-bold text-white font-mono">
                            {item.type}
                          </td>
                          <td className="py-2.5 text-slate-300 text-[11px]">
                            {item.desc}
                          </td>
                          <td className="py-2.5 text-center">
                            {item.info?.verified ? (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold">
                                Lengkap & Terverifikasi
                              </span>
                            ) : item.info?.hasDoc ? (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-semibold">
                                Menunggu Verifikasi ({item.info.count} file)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-semibold">
                                Belum Ada
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => {
                                onOpenUploadModal(selectedProkerDetail, item.type);
                                setSelectedProkerDetail(null);
                              }}
                              className="px-2.5 py-1 bg-[#18294e] hover:bg-orange-500 hover:text-white text-orange-400 rounded text-[11px] font-medium transition-colors"
                            >
                              Upload / Kelola
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Proker Financial & Milestone Information - Separated Breakdown */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#0f1b35] p-3 rounded-xl border border-[#1e2f57]">
                    <p className="text-slate-400">Plafon RKAP / CAPEX</p>
                    <p className="text-base font-bold text-white font-mono mt-0.5">
                      {formatMiliar(selectedProkerDetail.nilaiCapexRkap)} M
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Anggaran Disetujui</p>
                  </div>
                  <div className="bg-[#0f1b35] p-3 rounded-xl border border-[#1e2f57]">
                    <p className="text-slate-400">Kontrak Pengadaan</p>
                    <p className="text-base font-bold text-blue-400 font-mono mt-0.5">
                      {formatMiliar(selectedProkerDetail.nilaiKontrak)} M
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Perikatan Vendor</p>
                  </div>
                  <div className="bg-[#0f1b35] p-3 rounded-xl border border-[#1e2f57]">
                    <p className="text-slate-400">Rilis Anggaran</p>
                    <p className="text-base font-bold text-indigo-300 font-mono mt-0.5">
                      {formatMiliar(selectedProkerDetail.nilaiRilis)} M
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Alokasi Rilis</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="bg-[#0f1b35] p-2.5 rounded-xl border border-blue-500/30">
                    <p className="text-blue-300 font-semibold text-[11px]">Accrual (Akrual)</p>
                    <p className="text-base font-bold text-blue-300 font-mono mt-0.5">
                      {formatMiliar(selectedProkerDetail.nilaiAccrue)} M
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Beban Akrual</p>
                  </div>
                  <div className="bg-[#0f1b35] p-2.5 rounded-xl border border-emerald-500/30">
                    <p className="text-emerald-300 font-semibold text-[11px]">NPP Sudah OGP</p>
                    <p className="text-base font-bold text-emerald-300 font-mono mt-0.5">
                      {formatMiliar(selectedProkerDetail.nilaiOgp)} M
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Siap Bayar / Cair</p>
                  </div>
                  <div className="bg-[#0f1b35] p-2.5 rounded-xl border border-amber-500/30">
                    <p className="text-amber-300 font-semibold text-[11px]">NPP Belum OGP</p>
                    <p className="text-base font-bold text-amber-300 font-mono mt-0.5">
                      {formatMiliar(selectedProkerDetail.belumOgp)} M
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Menunggu OGP</p>
                  </div>
                  <div className="bg-[#0f1b35] p-2.5 rounded-xl border border-emerald-500/50 bg-emerald-950/20">
                    <p className="text-emerald-300 font-semibold text-[11px]">Total Realisasi Aktual</p>
                    <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                      {formatMiliar(selectedProkerDetail.nilaiAktual)} M
                    </p>
                    <p className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
                      Serapan: {selectedProkerDetail.nilaiCapexRkap > 0 ? ((selectedProkerDetail.nilaiAktual / selectedProkerDetail.nilaiCapexRkap) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <div className="bg-[#0f1b35] p-2.5 rounded-xl border border-purple-500/30">
                    <p className="text-purple-300 font-semibold text-[11px]">Sisa Accrue</p>
                    <p className="text-base font-bold text-purple-300 font-mono mt-0.5">
                      {formatMiliar(selectedProkerDetail.sisaAccrue)} M
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Accrue - OGP</p>
                  </div>
                </div>
              </div>

              {/* Description & Background */}
              <div className="space-y-3 text-xs text-slate-300">
                <div>
                  <h5 className="font-bold text-white">Nama Pekerjaan:</h5>
                  <p className="mt-0.5">{selectedProkerDetail.namaPekerjaan}</p>
                </div>
                <div>
                  <h5 className="font-bold text-white">Latar Belakang:</h5>
                  <p className="mt-0.5 text-slate-300">{selectedProkerDetail.latarBelakang || '-'}</p>
                </div>
                <div>
                  <h5 className="font-bold text-white">Tujuan Investasi:</h5>
                  <p className="mt-0.5 text-slate-300">{selectedProkerDetail.tujuanInvestasi || '-'}</p>
                </div>
                {selectedProkerDetail.catatan && (
                  <div className="bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg text-amber-200">
                    <span className="font-bold">Catatan Proyek: </span>
                    {selectedProkerDetail.catatan}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-[#1c2c54] flex items-center justify-between sticky top-0 bg-[#111e3f] z-10">
              <h3 className="text-base font-bold text-white">
                {editingProker ? 'Edit Program Kerja' : 'Tambah Program Kerja Investasi'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Proker *</label>
                  <input
                    type="text"
                    required
                    value={formData.kodeProker}
                    onChange={(e) => setFormData({ ...formData, kodeProker: e.target.value })}
                    placeholder="Contoh: KUR 1.2.8.26"
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-mono focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tahun Anggaran *</label>
                  <select
                    value={formData.tahunAnggaran}
                    onChange={(e) => {
                      if (e.target.value === '__add__') {
                        if (onOpenAddYearModal) onOpenAddYearModal();
                      } else {
                        setFormData({ ...formData, tahunAnggaran: parseInt(e.target.value) });
                      }
                    }}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-mono focus:border-orange-500 cursor-pointer"
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr} className="bg-[#0d1733]">{yr}</option>
                    ))}
                    {onOpenAddYearModal && (
                      <option value="__add__" className="bg-[#0d1733] text-orange-400 font-bold">+ Tambah Tahun Baru...</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Program Kerja *</label>
                <input
                  type="text"
                  required
                  value={formData.namaProker}
                  onChange={(e) => setFormData({ ...formData, namaProker: e.target.value })}
                  placeholder="Nama program kerja investasi..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jenis BOSIE *</label>
                  <select
                    value={formData.jenisBosie}
                    onChange={(e) => setFormData({ ...formData, jenisBosie: e.target.value as any })}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                  >
                    <option value="B">B - Business Development</option>
                    <option value="O">O - Operational Excellence</option>
                    <option value="S">S - System Improvement</option>
                    <option value="I">I - IT Infrastructure</option>
                    <option value="E">E - Corporate Enabler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Direktorat *</label>
                  <input
                    type="text"
                    required
                    value={formData.direktorat}
                    onChange={(e) => setFormData({ ...formData, direktorat: e.target.value })}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori Owner *</label>
                  <select
                    value={formData.ownerCategory}
                    onChange={(e) => setFormData({ ...formData, ownerCategory: e.target.value as any })}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                  >
                    <option value="Induk">Kantor Pusat / Induk</option>
                    <option value="Poslog">PT Pos Logistik</option>
                    <option value="Posdig">PT Pos Digi</option>
                    <option value="Pospro">PT Pos Properti</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subdit / Divisi</label>
                  <input
                    type="text"
                    value={formData.subdit}
                    onChange={(e) => setFormData({ ...formData, subdit: e.target.value })}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Owner / PIC *</label>
                    {users && users.length > 0 && (
                      <span className="text-[10px] text-orange-400 font-medium">Pilih / Ketik Manual</span>
                    )}
                  </div>
                  {users && users.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            const selectedUser = users.find(u => u.name === e.target.value);
                            setFormData({
                              ...formData,
                              ownerPic: e.target.value,
                              subdit: selectedUser?.unitKerja || formData.subdit
                            });
                          }
                        }}
                        value={users.some(u => u.name === formData.ownerPic) ? formData.ownerPic : ''}
                        className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-orange-500 cursor-pointer"
                      >
                        <option value="">— Pilih dari Daftar PIC Terdaftar —</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        value={formData.ownerPic || ''}
                        onChange={(e) => setFormData({ ...formData, ownerPic: e.target.value })}
                        placeholder="Nama PIC (atau ketik manual)..."
                        className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-1.5 text-white text-xs focus:border-orange-500 font-medium"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={formData.ownerPic || ''}
                      onChange={(e) => setFormData({ ...formData, ownerPic: e.target.value })}
                      className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                    />
                  )}
                </div>
              </div>

              {/* Financial Inputs (Satuan Miliar) */}
              <div className="space-y-2 bg-[#0d1733] p-4 rounded-xl border border-[#213565]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Nominal Anggaran & Realisasi (Satuan Miliar Rupiah)
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                    Contoh: 10.00 = Rp 10 Miliar
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">RKAP (Miliar Rp) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.nilaiCapexRkap}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, nilaiCapexRkap: raw >= 1_000_000 ? raw / 1_000_000_000 : raw });
                      }}
                      className="w-full bg-[#13203c] border border-[#253c6d] rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:border-orange-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      = Rp {formatMiliar(formData.nilaiCapexRkap)} M
                    </p>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Kontrak (Miliar Rp)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.nilaiKontrak}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, nilaiKontrak: raw >= 1_000_000 ? raw / 1_000_000_000 : raw });
                      }}
                      className="w-full bg-[#13203c] border border-[#253c6d] rounded-lg px-2.5 py-1.5 text-blue-300 font-mono focus:border-orange-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      = Rp {formatMiliar(formData.nilaiKontrak)} M
                    </p>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Rilis (Miliar Rp)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.nilaiRilis}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, nilaiRilis: raw >= 1_000_000 ? raw / 1_000_000_000 : raw });
                      }}
                      className="w-full bg-[#13203c] border border-[#253c6d] rounded-lg px-2.5 py-1.5 text-indigo-300 font-mono focus:border-orange-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      = Rp {formatMiliar(formData.nilaiRilis)} M
                    </p>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Aktual (Miliar Rp)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.nilaiAktual}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, nilaiAktual: raw >= 1_000_000 ? raw / 1_000_000_000 : raw });
                      }}
                      className="w-full bg-[#13203c] border border-[#253c6d] rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold focus:border-orange-500"
                    />
                    <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                      = Rp {formatMiliar(formData.nilaiAktual)} M
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  * Catatan: Masukkan angka dalam satuan Miliar (misal: ketik <strong>10</strong> untuk Rp 10 Miliar, atau <strong>0.50</strong> untuk Rp 500 Juta). Jika Anda memasukkan nominal penuh Rp (≥ 1 Juta), sistem otomatis mengonversinya ke satuan Miliar.
                </p>
              </div>

              {/* Status and Progress */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Progres Fisik (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progresFisik}
                    onChange={(e) => setFormData({ ...formData, progresFisik: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-mono focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Proyek</label>
                  <select
                    value={formData.statusProyek}
                    onChange={(e) => setFormData({ ...formData, statusProyek: e.target.value as any })}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                  >
                    <option value="Belum Mulai">Belum Mulai</option>
                    <option value="Proses">Proses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Jadwal</label>
                  <select
                    value={formData.statusJadwal}
                    onChange={(e) => setFormData({ ...formData, statusJadwal: e.target.value as any })}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                  >
                    <option value="Terdepan">Terdepan</option>
                    <option value="Sesuai">Sesuai</option>
                    <option value="Terlambat">Terlambat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Latar Belakang & Justifikasi</label>
                <textarea
                  rows={2}
                  value={formData.latarBelakang}
                  onChange={(e) => setFormData({ ...formData, latarBelakang: e.target.value })}
                  placeholder="Latar belakang investasi..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-[#18294e] hover:bg-[#203666] text-slate-300 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md"
                >
                  {editingProker ? 'Simpan Perubahan' : 'Buat Program Kerja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Konfirmasi Hapus Program Kerja</h3>
              <p className="text-xs text-slate-300 mt-2">
                Apakah Anda yakin ingin menghapus program kerja ini? Tindakan ini akan dicatat dalam audit trail perusahaan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 bg-[#18294e] hover:bg-[#203666] text-slate-300 text-xs font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  await onDeleteProker(deleteConfirmId);
                  setDeleteConfirmId(null);
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

      {/* EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Import Data Program Kerja (.xlsx)</span>
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <p className="text-slate-300">
                Pilih file spreadsheet Excel (format XLSX/XLS) yang memuat kolom KODE PROKER, KETERANGAN PROKER, RKAP, KONTRAK, RILIS, dan AKTUAL.
              </p>

              <div className="border-2 border-dashed border-[#24396b] hover:border-orange-500 rounded-xl p-5 text-center cursor-pointer bg-[#0d1733]">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600"
                />
              </div>

              {importResult && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    importResult.success
                      ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                      : 'bg-red-950/40 border border-red-800 text-red-300'
                  }`}
                >
                  {importResult.success ? (
                    <div>
                      <p className="font-bold">Berhasil mengimpor {importResult.importedCount} program kerja!</p>
                      {importResult.errors?.length > 0 && (
                        <p className="text-[11px] text-amber-300 mt-1">
                          Catatan: {importResult.errors.join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-bold">Gagal: {importResult.error}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg"
                >
                  {importLoading ? 'Memproses...' : 'Proses Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UBAH PENUGASAN PIC & ROLE PROKER */}
      {selectedProkerForPic && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1c2c54] flex items-center justify-between bg-[#0e1935]">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ubah Penugasan & Role PIC
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedProkerForPic.kodeProker} · {selectedProkerForPic.namaProker}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProkerForPic(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignPic} className="p-6 space-y-4 text-xs">
              {/* Summary Banner */}
              <div className="p-3 bg-[#0d1733] border border-[#1e325c] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">PIC Saat Ini:</span>
                  <span className="text-white font-bold text-xs">{selectedProkerForPic.ownerPic || '-'}</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Kategori: {selectedProkerForPic.ownerCategory || 'Induk'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">CAPEX RKAP:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    Rp {formatMiliar(selectedProkerForPic.nilaiCapexRkap)} M
                  </span>
                </div>
              </div>

              {/* Quick Select from Registered Users */}
              {users && users.length > 0 && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Pilih PIC dari Pengguna Terdaftar (Quick-Select)
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const u = users.find(x => x.name === e.target.value);
                        setPicAssignData({
                          ...picAssignData,
                          ownerPic: e.target.value,
                          subdit: u?.unitKerja || picAssignData.subdit,
                          ownerCategory: u?.unitKerja?.toLowerCase().includes('logistik')
                            ? 'Poslog'
                            : u?.unitKerja?.toLowerCase().includes('digi')
                            ? 'Posdig'
                            : u?.unitKerja?.toLowerCase().includes('properti')
                            ? 'Pospro'
                            : picAssignData.ownerCategory
                        });
                      }
                    }}
                    value={users.some(u => u.name === picAssignData.ownerPic) ? picAssignData.ownerPic : ''}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">— Pilih Pengguna Terdaftar —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} — [Role: {u.role}] ({u.unitKerja})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Input Nama PIC */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama PIC Penanggung Jawab *
                </label>
                <input
                  type="text"
                  required
                  value={picAssignData.ownerPic}
                  onChange={(e) => setPicAssignData({ ...picAssignData, ownerPic: e.target.value })}
                  placeholder="Nama lengkap PIC..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Kategori / Role Unit PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Kategori Unit / Role PIC *
                  </label>
                  <select
                    value={picAssignData.ownerCategory}
                    onChange={(e) => setPicAssignData({ ...picAssignData, ownerCategory: e.target.value })}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Induk">Kantor Pusat / Induk</option>
                    <option value="Poslog">PT Pos Logistik</option>
                    <option value="Posdig">PT Pos Digi</option>
                    <option value="Pospro">PT Pos Properti</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Subdit / Divisi
                  </label>
                  <input
                    type="text"
                    value={picAssignData.subdit}
                    onChange={(e) => setPicAssignData({ ...picAssignData, subdit: e.target.value })}
                    placeholder="Nama Subdit / Unit..."
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Catatan Penugasan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Catatan / Memo Penugasan PIC
                </label>
                <textarea
                  rows={2}
                  value={picAssignData.catatan}
                  onChange={(e) => setPicAssignData({ ...picAssignData, catatan: e.target.value })}
                  placeholder="Catatan penugasan atau arahan khusus untuk PIC..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setSelectedProkerForPic(null)}
                  className="px-4 py-2 bg-[#18294e] hover:bg-[#203666] text-slate-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAssigningPic}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isAssigningPic ? 'Menyimpan...' : 'Simpan Penugasan PIC'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

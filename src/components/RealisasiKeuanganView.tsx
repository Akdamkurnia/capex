import React, { useState, useMemo } from 'react';
import {
  Coins,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  X,
  Calendar,
  Building,
  Download,
  Printer,
  ChevronRight,
  Percent,
  Check,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  RotateCcw,
  Layers,
  CheckCircle2,
  Clock4,
  FileText
} from 'lucide-react';
import {
  BudgetRealizationRelease,
  WorkProgram,
  User,
  RealisasiType,
  OgpStatus,
  KategoriRealisasi
} from '../types';
import { formatRupiah, formatRupiahExact, formatDateIndo, formatPercentage } from '../utils/formatters';

interface RealisasiKeuanganViewProps {
  realizations: BudgetRealizationRelease[];
  workPrograms: WorkProgram[];
  currentUser: User;
  availableYears?: number[];
  selectedYear?: string;
  onYearChange?: (year: string) => void;
  onOpenAddYearModal?: () => void;
  onRefresh: () => void;
  onCreateRealization: (data: Partial<BudgetRealizationRelease>) => Promise<void>;
  onUpdateRealization: (id: string, data: Partial<BudgetRealizationRelease>) => Promise<void>;
  onDeleteRealization: (id: string) => Promise<void>;
}

// Helper to determine exact category for any realization
export function getRealizationCategory(r: Partial<BudgetRealizationRelease>): KategoriRealisasi {
  if (r.kategoriRealisasi) return r.kategoriRealisasi;
  if (r.tipeRealisasi === 'ACCRUE') return 'Accrual';
  if (r.tipeRealisasi === 'NPP') {
    return (r.statusOgp === 'Sudah di OGP' || r.statusPembayaran === 'Sudah di OGP')
      ? 'NPP - Sudah di OGP'
      : 'NPP - Belum di OGP';
  }
  const noNde = (r.noNde || '').toUpperCase();
  const ket = (r.keteranganRelease || '').toUpperCase();
  const isPaid = r.statusPembayaran === 'Sudah di OGP' || r.statusOgp === 'Sudah di OGP';
  if (noNde.includes('NPP') || ket.includes('NPP')) {
    return isPaid ? 'NPP - Sudah di OGP' : 'NPP - Belum di OGP';
  }
  if ((noNde.includes('ACCRUE') || ket.includes('ACCRUE')) && !isPaid) {
    return 'Accrual';
  }
  if (isPaid) return 'NPP - Sudah di OGP';
  return 'Accrual';
}

export const RealisasiKeuanganView: React.FC<RealisasiKeuanganViewProps> = ({
  realizations,
  workPrograms,
  currentUser,
  availableYears = [2026, 2025, 2024, 2023, 2022],
  selectedYear = '2026',
  onYearChange,
  onOpenAddYearModal,
  onRefresh,
  onCreateRealization,
  onUpdateRealization,
  onDeleteRealization
}) => {
  // Local active year filter
  const [activeYear, setActiveYear] = useState<string>(selectedYear || '2026');
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [filterOgp, setFilterOgp] = useState('Semua');
  const [filterBulan, setFilterBulan] = useState('Semua');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetRealizationRelease | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetRealizationRelease | null>(null);
  const [detailTarget, setDetailTarget] = useState<BudgetRealizationRelease | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync when prop selectedYear changes
  React.useEffect(() => {
    if (selectedYear) {
      setActiveYear(selectedYear);
    }
  }, [selectedYear]);

  const handleYearSelect = (yr: string) => {
    setActiveYear(yr);
    if (onYearChange) {
      onYearChange(yr);
    }
  };

  // Map proker ID to proker object and year
  const prokerMap = useMemo(() => {
    const map = new Map<string, WorkProgram>();
    workPrograms.forEach(p => map.set(p.id, p));
    return map;
  }, [workPrograms]);

  // Helper to extract year from a realization record
  const getRealizationYear = (r: BudgetRealizationRelease): number => {
    if (r.tahunAnggaran) return r.tahunAnggaran;
    if (r.tglPosting) {
      const yr = new Date(r.tglPosting).getFullYear();
      if (!isNaN(yr)) return yr;
    }
    const p = prokerMap.get(r.prokerId);
    if (p) return p.tahunAnggaran;
    return 2026;
  };

  // Year-filtered realization list
  const yearFilteredList = useMemo(() => {
    if (activeYear === 'Semua') return realizations;
    const yrNum = parseInt(activeYear);
    return realizations.filter(r => getRealizationYear(r) === yrNum);
  }, [realizations, activeYear, prokerMap]);

  // Count per year for badges
  const countPerYear = useMemo(() => {
    const counts: Record<string, number> = {};
    realizations.forEach(r => {
      const yr = getRealizationYear(r).toString();
      counts[yr] = (counts[yr] || 0) + 1;
    });
    return counts;
  }, [realizations, prokerMap]);

  // Separated Financial KPI calculations for active year
  const kpiMetrics = useMemo(() => {
    let totalBsuRelease = 0;
    let totalAccrual = 0;
    let totalNppSudahOgp = 0;
    let totalNppBelumOgp = 0;
    let countAccrual = 0;
    let countNppSudahOgp = 0;
    let countNppBelumOgp = 0;

    yearFilteredList.forEach((r) => {
      totalBsuRelease += r.bsuRelease || 0;
      const cat = getRealizationCategory(r);
      const val = r.bsuAktual || 0;

      if (cat === 'Accrual') {
        totalAccrual += val;
        countAccrual++;
      } else if (cat === 'NPP - Sudah di OGP') {
        totalNppSudahOgp += val;
        countNppSudahOgp++;
      } else {
        totalNppBelumOgp += val;
        countNppBelumOgp++;
      }
    });

    const totalBsuAktual = totalAccrual + totalNppSudahOgp + totalNppBelumOgp;
    const serapanPersen = totalBsuRelease > 0 ? (totalBsuAktual / totalBsuRelease) * 100 : 0;
    const sisaPembayaran = totalBsuRelease - totalBsuAktual;
    const sisaAccrue = Math.max(0, totalAccrual - totalNppSudahOgp);

    return {
      totalBsuRelease,
      totalBsuAktual,
      totalAccrual,
      totalNppSudahOgp,
      totalNppBelumOgp,
      countAccrual,
      countNppSudahOgp,
      countNppBelumOgp,
      totalCount: yearFilteredList.length,
      serapanPersen,
      sisaPembayaran,
      sisaAccrue
    };
  }, [yearFilteredList]);

  // Search & Secondary filter list
  const filteredList = useMemo(() => {
    return yearFilteredList.filter((r) => {
      const cat = getRealizationCategory(r);
      const matchKategori = filterKategori === 'Semua' || cat === filterKategori;
      const matchOgp =
        filterOgp === 'Semua' ||
        r.statusPembayaran === filterOgp ||
        r.statusOgp === filterOgp;
      const matchBulan =
        filterBulan === 'Semua' || r.bulanAktual.toUpperCase() === filterBulan.toUpperCase();
      const matchSearch =
        !search ||
        r.kodeProker.toLowerCase().includes(search.toLowerCase()) ||
        r.nomorDokumen.toLowerCase().includes(search.toLowerCase()) ||
        r.keteranganRelease.toLowerCase().includes(search.toLowerCase()) ||
        r.lokasiAset.toLowerCase().includes(search.toLowerCase()) ||
        r.kodeAset.toLowerCase().includes(search.toLowerCase()) ||
        r.noNde.toLowerCase().includes(search.toLowerCase()) ||
        cat.toLowerCase().includes(search.toLowerCase());
      return matchKategori && matchOgp && matchBulan && matchSearch;
    });
  }, [yearFilteredList, filterKategori, filterOgp, filterBulan, search]);

  // Form State for Creating Realization
  const modalDefaultYear = activeYear === 'Semua' ? '2026' : activeYear;
  const [createYear, setCreateYear] = useState<string>(modalDefaultYear);
  const [createProkerId, setCreateProkerId] = useState('');
  const [createTglPosting, setCreateTglPosting] = useState(`${modalDefaultYear}-03-31`);
  const [createKodeAset, setCreateKodeAset] = useState('3201, Gedung Kantor');
  const [createKodeRekening, setCreateKodeRekening] = useState('1204010102, Gedung');
  const [createNomorDoc, setCreateNomorDoc] = useState('');
  const [createKeterangan, setCreateKeterangan] = useState('');
  const [createNoNde, setCreateNoNde] = useState('ACCRUE');
  const [createTipeRealisasi, setCreateTipeRealisasi] = useState<RealisasiType>('ACCRUE');
  const [createStatusOgp, setCreateStatusOgp] = useState<OgpStatus>('Sudah di OGP');
  const [createBsuRelease, setCreateBsuRelease] = useState<number>(100_000_000);
  const [createBsuAktual, setCreateBsuAktual] = useState<number>(100_000_000);
  const [createBulanAktual, setCreateBulanAktual] = useState('MAR');
  const [createLokasiAset, setCreateLokasiAset] = useState('40005, Kantor Pusat');
  const [createKodeSubproker, setCreateKodeSubproker] = useState('');

  // Prokers selectable for create modal
  const createModalProkers = useMemo(() => {
    const yr = parseInt(createYear);
    const list = workPrograms.filter(p => p.tahunAnggaran === yr);
    return list.length > 0 ? list : workPrograms;
  }, [workPrograms, createYear]);

  // Set initial prokerId when create modal opens or createYear changes
  React.useEffect(() => {
    if (createModalProkers.length > 0 && !createModalProkers.some(p => p.id === createProkerId)) {
      setCreateProkerId(createModalProkers[0].id);
    }
  }, [createModalProkers, createProkerId]);

  const handleOpenCreateModal = () => {
    const yr = activeYear === 'Semua' ? '2026' : activeYear;
    setCreateYear(yr);
    setCreateTglPosting(`${yr}-03-31`);
    setCreateNomorDoc(`68000000${Math.floor(Math.random() * 90) + 10}`);
    setCreateKeterangan('');
    setCreateTipeRealisasi('ACCRUE');
    setCreateStatusOgp('Sudah di OGP');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedP = workPrograms.find(p => p.id === createProkerId);
      const yrNum = parseInt(createYear) || 2026;
      const derivedKategori: KategoriRealisasi =
        createTipeRealisasi === 'ACCRUE'
          ? 'Accrual'
          : createStatusOgp === 'Sudah di OGP'
          ? 'NPP - Sudah di OGP'
          : 'NPP - Belum di OGP';

      await onCreateRealization({
        prokerId: createProkerId,
        kodeProker: selectedP?.kodeProker || '',
        idRelease: (realizations.length + 1).toString(),
        tglPosting: createTglPosting,
        kodeAset: createKodeAset,
        kodeRekening: createKodeRekening,
        nomorDokumen: createNomorDoc || `${Date.now()}`,
        keteranganRelease: createKeterangan,
        noNde: createNoNde || (createTipeRealisasi === 'ACCRUE' ? 'ACCRUE' : 'NPP'),
        tipeRealisasi: createTipeRealisasi,
        statusOgp: createStatusOgp,
        kategoriRealisasi: derivedKategori,
        bsuRelease: Number(createBsuRelease),
        bsuAktual: Number(createBsuAktual),
        statusPembayaran: createStatusOgp,
        bulanAktual: createBulanAktual,
        lokasiAset: createLokasiAset,
        kodeSubproker: createKodeSubproker || selectedP?.kodeProker || '-',
        tahunAnggaran: yrNum
      });
      setShowCreateModal(false);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form State for Editing Realization
  const [editYear, setEditYear] = useState<string>('2026');
  const [editProkerId, setEditProkerId] = useState('');
  const [editTglPosting, setEditTglPosting] = useState('');
  const [editKodeAset, setEditKodeAset] = useState('');
  const [editKodeRekening, setEditKodeRekening] = useState('');
  const [editNomorDoc, setEditNomorDoc] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editNoNde, setEditNoNde] = useState('ACCRUE');
  const [editTipeRealisasi, setEditTipeRealisasi] = useState<RealisasiType>('ACCRUE');
  const [editStatusOgp, setEditStatusOgp] = useState<OgpStatus>('Sudah di OGP');
  const [editBsuRelease, setEditBsuRelease] = useState<number>(0);
  const [editBsuAktual, setEditBsuAktual] = useState<number>(0);
  const [editBulanAktual, setEditBulanAktual] = useState('OKT');
  const [editLokasiAset, setEditLokasiAset] = useState('');
  const [editKodeSubproker, setEditKodeSubproker] = useState('');

  const editModalProkers = useMemo(() => {
    const yr = parseInt(editYear);
    const list = workPrograms.filter(p => p.tahunAnggaran === yr);
    return list.length > 0 ? list : workPrograms;
  }, [workPrograms, editYear]);

  const handleOpenEdit = (record: BudgetRealizationRelease) => {
    setEditTarget(record);
    const yr = (record.tahunAnggaran || getRealizationYear(record)).toString();
    const cat = getRealizationCategory(record);
    setEditYear(yr);
    setEditProkerId(record.prokerId);
    setEditTglPosting(record.tglPosting || `${yr}-03-31`);
    setEditKodeAset(record.kodeAset || '');
    setEditKodeRekening(record.kodeRekening || '');
    setEditNomorDoc(record.nomorDokumen || '');
    setEditKeterangan(record.keteranganRelease || '');
    setEditNoNde(record.noNde || 'ACCRUE');
    setEditTipeRealisasi(record.tipeRealisasi || (cat === 'Accrual' ? 'ACCRUE' : 'NPP'));
    setEditStatusOgp(
      record.statusOgp ||
      (record.statusPembayaran === 'Sudah di OGP' ? 'Sudah di OGP' : 'Belum di OGP')
    );
    setEditBsuRelease(record.bsuRelease || 0);
    setEditBsuAktual(record.bsuAktual || 0);
    setEditBulanAktual(record.bulanAktual || 'OKT');
    setEditLokasiAset(record.lokasiAset || '');
    setEditKodeSubproker(record.kodeSubproker || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setIsSubmitting(true);
    try {
      const selectedP = workPrograms.find(p => p.id === editProkerId);
      const yrNum = parseInt(editYear) || 2026;
      const derivedKategori: KategoriRealisasi =
        editTipeRealisasi === 'ACCRUE'
          ? 'Accrual'
          : editStatusOgp === 'Sudah di OGP'
          ? 'NPP - Sudah di OGP'
          : 'NPP - Belum di OGP';

      await onUpdateRealization(editTarget.id, {
        prokerId: editProkerId,
        kodeProker: selectedP?.kodeProker || editTarget.kodeProker,
        tglPosting: editTglPosting,
        kodeAset: editKodeAset,
        kodeRekening: editKodeRekening,
        nomorDokumen: editNomorDoc,
        keteranganRelease: editKeterangan,
        noNde: editNoNde || (editTipeRealisasi === 'ACCRUE' ? 'ACCRUE' : 'NPP'),
        tipeRealisasi: editTipeRealisasi,
        statusOgp: editStatusOgp,
        kategoriRealisasi: derivedKategori,
        bsuRelease: Number(editBsuRelease),
        bsuAktual: Number(editBsuAktual),
        statusPembayaran: editStatusOgp,
        bulanAktual: editBulanAktual,
        lokasiAset: editLokasiAset,
        kodeSubproker: editKodeSubproker || selectedP?.kodeProker || '-',
        tahunAnggaran: yrNum
      });
      setEditTarget(null);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await onDeleteRealization(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = ['Administrator', 'VP/Manager', 'PIC Proker'].includes(currentUser.role);
  const canDelete = ['Administrator'].includes(currentUser.role);

  // CSV Export for filtered year
  const handleExportCSV = () => {
    const headers = [
      'ID RELEASE',
      'TAHUN ANGGARAN',
      'KATEGORI REALISASI',
      'TIPE',
      'STATUS OGP',
      'TGL POSTING',
      'KODE PROKER',
      'KODE ASET',
      'KODE REKENING',
      'NOMOR DOKUMEN',
      'KETERANGAN RELEASE',
      'NO NDE',
      'BSU RELEASE',
      'BSU AKTUAL',
      'BULAN AKTUAL',
      'LOKASI ASET'
    ];

    const rows = filteredList.map(r => [
      r.idRelease,
      getRealizationYear(r),
      `"${getRealizationCategory(r)}"`,
      `"${r.tipeRealisasi || '-'}"`,
      `"${r.statusOgp || r.statusPembayaran || '-'}"`,
      r.tglPosting,
      `"${r.kodeProker}"`,
      `"${r.kodeAset}"`,
      `"${r.kodeRekening}"`,
      `"${r.nomorDokumen}"`,
      `"${(r.keteranganRelease || '').replace(/"/g, '""')}"`,
      `"${r.noNde}"`,
      r.bsuRelease,
      r.bsuAktual,
      r.bulanAktual,
      `"${r.lokasiAset}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `realisasi_capex_pos_indonesia_${activeYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Modul Realisasi Keuangan & Release CAPEX</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold font-mono">
                {activeYear === 'Semua' ? 'Semua Tahun' : `Tahun ${activeYear}`}
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pencatatan realisasi aktual terpisah antara <strong>Accrual (Beban Akrual)</strong>, <strong>NPP Sudah di OGP</strong>, dan <strong>NPP Belum di OGP</strong> per Tahun Anggaran PT Pos Indonesia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-[#18294e] hover:bg-[#203666] border border-[#2b447e] text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Ekspor CSV ({activeYear})</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-[#18294e] hover:bg-[#203666] border border-[#2b447e] text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Cetak Rekap</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Input Transaksi Realisasi</span>
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC YEAR SELECTOR STRIP */}
      <div className="bg-[#111e3f] border border-[#203463] p-3 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-300">Pilih Tahun Anggaran Realisasi:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleYearSelect('Semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeYear === 'Semua'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-[#18294e] text-slate-300 hover:text-white hover:bg-[#223869]'
              }`}
            >
              Semua Tahun ({realizations.length})
            </button>

            {availableYears.map((yr) => {
              const yrStr = yr.toString();
              const count = countPerYear[yrStr] || 0;
              const isSelected = activeYear === yrStr;
              return (
                <button
                  key={yr}
                  onClick={() => handleYearSelect(yrStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-[#18294e] text-slate-300 hover:text-white hover:bg-[#223869]'
                  }`}
                >
                  <span>{yr}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-orange-700/60 text-white' : 'bg-[#0d1733] text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {onOpenAddYearModal && (
              <button
                onClick={onOpenAddYearModal}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#142347] hover:bg-[#1f3468] text-amber-400 border border-amber-500/30 flex items-center gap-1 transition-all"
                title="Tambah Tahun Anggaran Baru"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tahun</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Strip - SEPARATING ACCRUAL, NPP SUDAH OGP, NPP BELUM OGP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Total BSU Release */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
              Total BSU Release
            </p>
            <span className="p-1 rounded bg-blue-500/10 text-blue-400">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-white font-mono mt-1 tabular-nums">
            {formatRupiah(kpiMetrics.totalBsuRelease, 'rupiah')}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Alokasi rilis dana tahun {activeYear}</p>
        </div>

        {/* Total Realisasi Aktual */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-4 shadow-md bg-gradient-to-b from-[#13203c] to-[#0c1833]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-tight">
              Total Realisasi Aktual
            </p>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <Receipt className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-emerald-400 font-mono mt-1 tabular-nums">
            {formatRupiah(kpiMetrics.totalBsuAktual, 'rupiah')}
          </h3>
          <p className="text-[10px] text-emerald-400/80 mt-0.5 font-semibold">
            {kpiMetrics.serapanPersen.toFixed(2)}% dari Rilis
          </p>
        </div>

        {/* Accrual (Accrue) */}
        <div className="bg-[#13203c] border border-blue-500/30 rounded-2xl p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-tight flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Accrual (Accrue)</span>
            </p>
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
              {kpiMetrics.countAccrual} Transaksi
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-blue-300 font-mono mt-1 tabular-nums">
            {formatRupiah(kpiMetrics.totalAccrual, 'rupiah')}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Pencatatan beban akrual proyek</p>
        </div>

        {/* NPP Sudah di OGP */}
        <div className="bg-[#13203c] border border-emerald-500/30 rounded-2xl p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-tight flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>NPP Sudah OGP</span>
            </p>
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              {kpiMetrics.countNppSudahOgp} Tuntas
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-emerald-300 font-mono mt-1 tabular-nums">
            {formatRupiah(kpiMetrics.totalNppSudahOgp, 'rupiah')}
          </h3>
          <p className="text-[10px] text-emerald-400/80 mt-0.5">Order Giral Pembayaran terbit</p>
        </div>

        {/* NPP Belum di OGP */}
        <div className="bg-[#13203c] border border-amber-500/30 rounded-2xl p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-tight flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>NPP Belum OGP</span>
            </p>
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              {kpiMetrics.countNppBelumOgp} Antrean
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-amber-300 font-mono mt-1 tabular-nums">
            {formatRupiah(kpiMetrics.totalNppBelumOgp, 'rupiah')}
          </h3>
          <p className="text-[10px] text-amber-400/80 mt-0.5">Menunggu penerbitan OGP</p>
        </div>

        {/* Sisa Accrue / Sisa Alokasi */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
              Sisa Accrue
            </p>
            <span className="p-1 rounded bg-purple-500/10 text-purple-400">
              <RotateCcw className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-purple-300 font-mono mt-1 tabular-nums">
            {formatRupiah(kpiMetrics.sisaAccrue, 'rupiah')}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Accrue belum terlunasi OGP</p>
        </div>
      </div>

      {/* QUICK CATEGORY FILTER TABS: ACCRUAL vs NPP SUDAH OGP vs NPP BELUM OGP */}
      <div className="bg-[#111e3f] border border-[#203463] p-2.5 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-orange-500/10 text-orange-400">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-200">Kategori Realisasi Aktual:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterKategori('Semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterKategori === 'Semua'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-[#18294e] text-slate-300 hover:text-white hover:bg-[#203666]'
              }`}
            >
              <span>Semua Kategori</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0d1733] font-mono">
                {kpiMetrics.totalCount}
              </span>
            </button>

            <button
              onClick={() => setFilterKategori('Accrual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterKategori === 'Accrual'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-[#18294e] text-blue-300 hover:text-white hover:bg-[#1e3566]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Accrual (Accrue)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950/80 font-mono text-blue-200">
                {kpiMetrics.countAccrual} · {formatRupiah(kpiMetrics.totalAccrual)}
              </span>
            </button>

            <button
              onClick={() => setFilterKategori('NPP - Sudah di OGP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterKategori === 'NPP - Sudah di OGP'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-[#18294e] text-emerald-300 hover:text-white hover:bg-[#163a3d]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>NPP Sudah di OGP</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 font-mono text-emerald-200">
                {kpiMetrics.countNppSudahOgp} · {formatRupiah(kpiMetrics.totalNppSudahOgp)}
              </span>
            </button>

            <button
              onClick={() => setFilterKategori('NPP - Belum di OGP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterKategori === 'NPP - Belum di OGP'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                  : 'bg-[#18294e] text-amber-300 hover:text-white hover:bg-[#382c16]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>NPP Belum di OGP</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950/80 font-mono text-amber-200">
                {kpiMetrics.countNppBelumOgp} · {formatRupiah(kpiMetrics.totalNppBelumOgp)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Cari proker, nomor dokumen, NDE, lokasi pada Tahun ${activeYear}...`}
              className="w-full bg-[#0d1733] border border-[#213565] text-white rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-orange-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#0d1733] border border-[#213565] px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 font-medium">Status Pembayaran:</span>
            <select
              value={filterOgp}
              onChange={(e) => setFilterOgp(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="Semua" className="bg-[#0d1733]">Semua Status</option>
              <option value="Sudah di OGP" className="bg-[#0d1733]">Sudah di OGP</option>
              <option value="Belum di OGP" className="bg-[#0d1733]">Belum di OGP</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0d1733] border border-[#213565] px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 font-medium">Bulan:</span>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="Semua" className="bg-[#0d1733]">Semua Bulan</option>
              {['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'].map(b => (
                <option key={b} value={b} className="bg-[#0d1733]">{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: Reference Design with Explicit Category Column */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0b1b3b] text-slate-200 border-b border-[#203666] uppercase font-bold tracking-tight select-none">
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">ID RELEASE</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">TAHUN</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">KATEGORI REALISASI</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">TGL POSTING</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">KODE PROKER</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">NOMOR DOKUMEN</th>
                <th className="py-2.5 px-2.5 min-w-[200px]">KETERANGAN RELEASE</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">NO NDE</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">BSU RELEASE</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">BSU AKTUAL</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">STATUS OGP</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">BULAN</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">LOKASI ASET</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2c54]/60 text-slate-200">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-500 opacity-60" />
                      <p className="font-semibold text-slate-300">
                        Tidak ada transaksi realisasi keuangan yang cocok dengan filter ({filterKategori}, Tahun {activeYear}).
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pilih kategori lain di atas atau klik "Input Transaksi Realisasi" untuk menambahkan pencatatan baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((r) => {
                  const rYear = getRealizationYear(r);
                  const rCat = getRealizationCategory(r);
                  const isPaid = (r.statusOgp === 'Sudah di OGP' || r.statusPembayaran === 'Sudah di OGP');

                  return (
                    <tr key={r.id} className="hover:bg-[#18294e]/70 transition-colors">
                      <td className="py-3 px-2.5 text-center font-mono font-bold text-white">
                        {r.idRelease}
                      </td>
                      <td className="py-3 px-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-[10px] font-bold">
                          {rYear}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            rCat === 'Accrual'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : rCat === 'NPP - Sudah di OGP'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rCat === 'Accrual'
                                ? 'bg-blue-400'
                                : rCat === 'NPP - Sudah di OGP'
                                ? 'bg-emerald-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          {rCat}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 font-mono text-slate-300 whitespace-nowrap">
                        {formatDateIndo(r.tglPosting)}
                      </td>
                      <td className="py-3 px-2.5 font-mono font-bold text-blue-400 whitespace-nowrap">
                        {r.kodeProker}
                      </td>
                      <td className="py-3 px-2.5 font-mono text-slate-200 whitespace-nowrap text-[11px]">
                        {r.nomorDokumen}
                      </td>
                      <td className="py-3 px-2.5 text-white max-w-xs font-medium">
                        <div className="line-clamp-2">{r.keteranganRelease}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {r.kodeAset} · {r.kodeRekening}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-center font-mono text-slate-300">
                        <span className="px-1.5 py-0.5 bg-[#0d1733] border border-[#213565] rounded text-[10px]">
                          {r.noNde}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-slate-200 font-semibold tabular-nums whitespace-nowrap">
                        {formatRupiahExact(r.bsuRelease)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                        {formatRupiahExact(r.bsuAktual)}
                      </td>
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isPaid ? 'Sudah di OGP' : 'Belum di OGP'}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-center font-mono text-slate-300 font-bold">
                        {r.bulanAktual}
                      </td>
                      <td className="py-3 px-2.5 text-slate-300 text-[11px] whitespace-nowrap">
                        {r.lokasiAset}
                      </td>
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailTarget(r)}
                            title="Lihat Detail Transaksi"
                            className="p-1 rounded hover:bg-[#203666] text-blue-400 hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(r)}
                              title="Edit Transaksi Realisasi"
                              className="p-1 rounded hover:bg-[#203666] text-amber-400 hover:text-white transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(r)}
                              title="Hapus Transaksi Realisasi"
                              className="p-1 rounded hover:bg-[#203666] text-red-400 hover:text-white transition-colors"
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
            {filteredList.length > 0 && (
              <tfoot>
                <tr className="bg-[#0b162e] border-t-2 border-[#203463] text-white font-bold">
                  <td colSpan={8} className="py-3 px-3 text-right text-xs">
                    TOTAL AKUMULASI ({filteredList.length} Transaksi Terpilih):
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-blue-300 whitespace-nowrap">
                    {formatRupiahExact(filteredList.reduce((acc, r) => acc + (r.bsuRelease || 0), 0))}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-emerald-300 whitespace-nowrap">
                    {formatRupiahExact(filteredList.reduce((acc, r) => acc + (r.bsuAktual || 0), 0))}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* CREATE REALIZATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Input Realisasi Release Anggaran Baru</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {/* Classification Pill Selection */}
              <div className="p-3 rounded-xl bg-[#091226] border border-[#1f3363] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-400 uppercase tracking-tight text-[11px]">
                    1. Klasifikasi Realisasi Keuangan PT Pos Indonesia
                  </span>
                  <span className="text-[10px] text-slate-400">Pemisahan Accrual vs NPP OGP</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tipe Realisasi */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tipe Realisasi *</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateTipeRealisasi('ACCRUE');
                          setCreateNoNde('ACCRUE');
                        }}
                        className={`p-2 rounded-lg font-bold text-center border transition-all ${
                          createTipeRealisasi === 'ACCRUE'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                            : 'bg-[#121f3f] text-slate-300 border-[#243a6d] hover:text-white'
                        }`}
                      >
                        ACCRUE (Akrual)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateTipeRealisasi('NPP');
                          setCreateNoNde('NPP');
                        }}
                        className={`p-2 rounded-lg font-bold text-center border transition-all ${
                          createTipeRealisasi === 'NPP'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                            : 'bg-[#121f3f] text-slate-300 border-[#243a6d] hover:text-white'
                        }`}
                      >
                        NPP (Bayar)
                      </button>
                    </div>
                  </div>

                  {/* Status OGP */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Status OGP *</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCreateStatusOgp('Sudah di OGP')}
                        className={`p-2 rounded-lg font-bold text-center border transition-all ${
                          createStatusOgp === 'Sudah di OGP'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                            : 'bg-[#121f3f] text-slate-300 border-[#243a6d] hover:text-white'
                        }`}
                      >
                        Sudah di OGP
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateStatusOgp('Belum di OGP')}
                        className={`p-2 rounded-lg font-bold text-center border transition-all ${
                          createStatusOgp === 'Belum di OGP'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30'
                            : 'bg-[#121f3f] text-slate-300 border-[#243a6d] hover:text-white'
                        }`}
                      >
                        Belum di OGP
                      </button>
                    </div>
                  </div>
                </div>

                {/* Derived Category Preview Banner */}
                <div className="p-2 rounded-lg bg-[#142347] border border-blue-500/30 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">Hasil Kategori:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-blue-600/40 border border-blue-400/50">
                    {createTipeRealisasi === 'ACCRUE'
                      ? 'Accrual (Beban Akrual)'
                      : createStatusOgp === 'Sudah di OGP'
                      ? 'NPP - Sudah di OGP (Siap Bayar / Cair)'
                      : 'NPP - Belum di OGP (Menunggu OGP)'}
                  </span>
                </div>
              </div>

              {/* Tahun Anggaran & Tanggal Posting */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tahun Anggaran *</label>
                  <select
                    value={createYear}
                    onChange={(e) => {
                      const yr = e.target.value;
                      setCreateYear(yr);
                      setCreateTglPosting(`${yr}-03-31`);
                    }}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-bold"
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr.toString()}>{yr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal Posting *</label>
                  <input
                    type="date"
                    required
                    value={createTglPosting}
                    onChange={(e) => setCreateTglPosting(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Program Kerja */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Program Kerja Terkait Tahun {createYear} *
                </label>
                <select
                  value={createProkerId}
                  onChange={(e) => setCreateProkerId(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-semibold text-blue-200"
                >
                  {createModalProkers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kodeProker} - {p.namaProker.length > 50 ? p.namaProker.substring(0, 50) + '...' : p.namaProker}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nomor Document & NDE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Document *</label>
                  <input
                    type="text"
                    required
                    value={createNomorDoc}
                    onChange={(e) => setCreateNomorDoc(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">No NDE / Tipe</label>
                  <input
                    type="text"
                    value={createNoNde}
                    onChange={(e) => setCreateNoNde(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Keterangan Release */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Keterangan Release *</label>
                <input
                  type="text"
                  required
                  value={createKeterangan}
                  onChange={(e) => setCreateKeterangan(e.target.value)}
                  placeholder="Accrue pembayaran termin / Lisensi pengadaan..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              {/* Kode Aset & Rekening */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Aset</label>
                  <input
                    type="text"
                    value={createKodeAset}
                    onChange={(e) => setCreateKodeAset(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Rekening</label>
                  <input
                    type="text"
                    value={createKodeRekening}
                    onChange={(e) => setCreateKodeRekening(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* BSU Release & BSU Aktual */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">BSU Release (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={createBsuRelease}
                    onChange={(e) => setCreateBsuRelease(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    {formatRupiahExact(createBsuRelease)}
                  </span>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">BSU Aktual (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={createBsuAktual}
                    onChange={(e) => setCreateBsuAktual(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                  <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">
                    {formatRupiahExact(createBsuAktual)}
                  </span>
                </div>
              </div>

              {/* Bulan & Lokasi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bulan Aktual</label>
                  <select
                    value={createBulanAktual}
                    onChange={(e) => setCreateBulanAktual(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-bold"
                  >
                    {['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lokasi Aset</label>
                  <input
                    type="text"
                    value={createLokasiAset}
                    onChange={(e) => setCreateLokasiAset(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT REALIZATION MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Edit Transaksi Realisasi Release #{editTarget.idRelease}</span>
              </h3>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              {/* Classification Pill Selection */}
              <div className="p-3 rounded-xl bg-[#091226] border border-[#1f3363] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-400 uppercase tracking-tight text-[11px]">
                    1. Klasifikasi Realisasi Keuangan PT Pos Indonesia
                  </span>
                  <span className="text-[10px] text-slate-400">Pemisahan Accrual vs NPP OGP</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tipe Realisasi */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tipe Realisasi *</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTipeRealisasi('ACCRUE');
                          setEditNoNde('ACCRUE');
                        }}
                        className={`p-2 rounded-lg font-bold text-center border transition-all ${
                          editTipeRealisasi === 'ACCRUE'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                            : 'bg-[#121f3f] text-slate-300 border-[#243a6d] hover:text-white'
                        }`}
                      >
                        ACCRUE (Akrual)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTipeRealisasi('NPP');
                          setEditNoNde('NPP');
                        }}
                        className={`p-2 rounded-lg font-bold text-center border transition-all ${
                          editTipeRealisasi === 'NPP'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                            : 'bg-[#121f3f] text-slate-300 border-[#243a6d] hover:text-white'
                        }`}
                      >
                        NPP (Bayar)
                      </button>
                    </div>
                  </div>

                  {/* Status OGP */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Status OGP *</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditStatusOgp('Sudah di OGP')}
                        className={`p-2 rounded-lg font-bold text-center border transition-all ${
                          editStatusOgp === 'Sudah di OGP'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                            : 'bg-[#121f3f] text-slate-300 border-[#243a6d] hover:text-white'
                        }`}
                      >
                        Sudah di OGP
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatusOgp('Belum di OGP')}
                        className={`p-2 rounded-lg font-bold text-center border transition-all ${
                          editStatusOgp === 'Belum di OGP'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30'
                            : 'bg-[#121f3f] text-slate-300 border-[#243a6d] hover:text-white'
                        }`}
                      >
                        Belum di OGP
                      </button>
                    </div>
                  </div>
                </div>

                {/* Derived Category Preview Banner */}
                <div className="p-2 rounded-lg bg-[#142347] border border-blue-500/30 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">Hasil Kategori:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-blue-600/40 border border-blue-400/50">
                    {editTipeRealisasi === 'ACCRUE'
                      ? 'Accrual (Beban Akrual)'
                      : editStatusOgp === 'Sudah di OGP'
                      ? 'NPP - Sudah di OGP (Siap Bayar / Cair)'
                      : 'NPP - Belum di OGP (Menunggu OGP)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tahun Anggaran *</label>
                  <select
                    value={editYear}
                    onChange={(e) => {
                      const yr = e.target.value;
                      setEditYear(yr);
                      setEditTglPosting(`${yr}-03-31`);
                    }}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-bold"
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr.toString()}>{yr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal Posting *</label>
                  <input
                    type="date"
                    required
                    value={editTglPosting}
                    onChange={(e) => setEditTglPosting(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Program Kerja *</label>
                <select
                  value={editProkerId}
                  onChange={(e) => setEditProkerId(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-semibold text-blue-200"
                >
                  {editModalProkers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kodeProker} - {p.namaProker.length > 50 ? p.namaProker.substring(0, 50) + '...' : p.namaProker}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Document *</label>
                  <input
                    type="text"
                    required
                    value={editNomorDoc}
                    onChange={(e) => setEditNomorDoc(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">No NDE / Tipe</label>
                  <input
                    type="text"
                    value={editNoNde}
                    onChange={(e) => setEditNoNde(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Keterangan Release *</label>
                <input
                  type="text"
                  required
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Aset</label>
                  <input
                    type="text"
                    value={editKodeAset}
                    onChange={(e) => setEditKodeAset(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Rekening</label>
                  <input
                    type="text"
                    value={editKodeRekening}
                    onChange={(e) => setEditKodeRekening(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">BSU Release (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={editBsuRelease}
                    onChange={(e) => setEditBsuRelease(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    {formatRupiahExact(editBsuRelease)}
                  </span>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">BSU Aktual (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={editBsuAktual}
                    onChange={(e) => setEditBsuAktual(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                  <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">
                    {formatRupiahExact(editBsuAktual)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bulan Aktual</label>
                  <select
                    value={editBulanAktual}
                    onChange={(e) => setEditBulanAktual(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-bold"
                  >
                    {['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lokasi Aset</label>
                  <input
                    type="text"
                    value={editLokasiAset}
                    onChange={(e) => setEditLokasiAset(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">
                  Detail Transaksi Realisasi Release #{detailTarget.idRelease}
                </h3>
              </div>
              <button onClick={() => setDetailTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0a142c] border border-[#1e325c] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Kategori Realisasi:</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {getRealizationCategory(detailTarget)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    getRealizationCategory(detailTarget) === 'Accrual'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : getRealizationCategory(detailTarget) === 'NPP - Sudah di OGP'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {getRealizationCategory(detailTarget)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="p-2.5 rounded-lg bg-[#0d1733]">
                  <span className="text-[10px] text-slate-400 block">Tahun Anggaran:</span>
                  <span className="font-bold text-white">{getRealizationYear(detailTarget)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1733]">
                  <span className="text-[10px] text-slate-400 block">Tanggal Posting:</span>
                  <span className="font-bold text-white">{formatDateIndo(detailTarget.tglPosting)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1733]">
                  <span className="text-[10px] text-slate-400 block">Kode Proker:</span>
                  <span className="font-bold text-blue-400 font-mono">{detailTarget.kodeProker}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1733]">
                  <span className="text-[10px] text-slate-400 block">Nomor Dokumen:</span>
                  <span className="font-bold text-white font-mono">{detailTarget.nomorDokumen}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0d1733]">
                <span className="text-[10px] text-slate-400 block">Keterangan Release:</span>
                <span className="font-medium text-white">{detailTarget.keteranganRelease}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-[#0d1733] border border-[#1e325c]">
                  <span className="text-[10px] text-slate-400 block">BSU Release:</span>
                  <span className="font-bold text-base text-white font-mono">
                    {formatRupiahExact(detailTarget.bsuRelease)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#0d1733] border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 block">BSU Aktual:</span>
                  <span className="font-bold text-base text-emerald-400 font-mono">
                    {formatRupiahExact(detailTarget.bsuAktual)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="p-2.5 rounded-lg bg-[#0d1733]">
                  <span className="text-[10px] text-slate-400 block">Status Pembayaran / OGP:</span>
                  <span className="font-bold text-white">{detailTarget.statusOgp || detailTarget.statusPembayaran}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1733]">
                  <span className="text-[10px] text-slate-400 block">Bulan / Lokasi Aset:</span>
                  <span className="font-bold text-white">{detailTarget.bulanAktual} · {detailTarget.lokasiAset}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#1c2c54]">
              <button
                onClick={() => setDetailTarget(null)}
                className="px-4 py-1.5 bg-[#18294e] hover:bg-[#203666] text-white rounded-lg text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-red-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white">Hapus Transaksi Realisasi?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tindakan ini permanen dan akan langsung memperbarui kalkulasi proker terkait.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#0d1733] border border-[#213565] rounded-xl text-xs space-y-1">
              <p className="text-slate-300">
                <strong className="text-white">Release ID:</strong> {deleteTarget.idRelease}
              </p>
              <p className="text-slate-300">
                <strong className="text-white">Proker:</strong> {deleteTarget.kodeProker}
              </p>
              <p className="text-slate-300">
                <strong className="text-white">Kategori:</strong> {getRealizationCategory(deleteTarget)}
              </p>
              <p className="text-emerald-400 font-mono font-bold">
                Rp {deleteTarget.bsuAktual.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 bg-[#18294e] text-slate-300 rounded-lg hover:text-white text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

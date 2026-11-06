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
  Check
} from 'lucide-react';
import { BudgetRealizationRelease, WorkProgram, User } from '../types';
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
  onCreateRealization
}) => {
  // Local active year filter (synced with selectedYear if provided)
  const [activeYear, setActiveYear] = useState<string>(selectedYear || '2026');
  const [search, setSearch] = useState('');
  const [filterOgp, setFilterOgp] = useState('Semua');
  const [filterBulan, setFilterBulan] = useState('Semua');
  const [showModal, setShowModal] = useState(false);

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

  // Search & Secondary filter list
  const filteredList = useMemo(() => {
    return yearFilteredList.filter((r) => {
      const matchOgp = filterOgp === 'Semua' || r.statusPembayaran === filterOgp;
      const matchBulan = filterBulan === 'Semua' || r.bulanAktual.toUpperCase() === filterBulan.toUpperCase();
      const matchSearch =
        !search ||
        r.kodeProker.toLowerCase().includes(search.toLowerCase()) ||
        r.nomorDokumen.toLowerCase().includes(search.toLowerCase()) ||
        r.keteranganRelease.toLowerCase().includes(search.toLowerCase()) ||
        r.lokasiAset.toLowerCase().includes(search.toLowerCase()) ||
        r.kodeAset.toLowerCase().includes(search.toLowerCase()) ||
        r.noNde.toLowerCase().includes(search.toLowerCase());
      return matchOgp && matchBulan && matchSearch;
    });
  }, [yearFilteredList, filterOgp, filterBulan, search]);

  // Dynamic Year-specific KPI Summaries
  const totalBsuRelease = yearFilteredList.reduce((acc, r) => acc + (r.bsuRelease || 0), 0);
  const totalBsuAktual = yearFilteredList.reduce((acc, r) => acc + (r.bsuAktual || 0), 0);
  const serapanPersen = totalBsuRelease > 0 ? (totalBsuAktual / totalBsuRelease) * 100 : 0;
  const sudahOgpList = yearFilteredList.filter(r => r.statusPembayaran === 'Sudah di OGP');
  const belumOgpList = yearFilteredList.filter(r => r.statusPembayaran === 'Belum di OGP');
  const totalSudahOgp = sudahOgpList.reduce((acc, r) => acc + (r.bsuAktual || 0), 0);
  const totalBelumOgp = belumOgpList.reduce((acc, r) => acc + (r.bsuRelease || 0), 0);

  // Form State for Creating Realization
  const modalDefaultYear = activeYear === 'Semua' ? '2026' : activeYear;
  const [modalYear, setModalYear] = useState<string>(modalDefaultYear);
  const [prokerId, setProkerId] = useState('');
  const [tglPosting, setTglPosting] = useState(`${modalDefaultYear}-03-31`);
  const [kodeAset, setKodeAset] = useState('3201, Gedung Kantor');
  const [kodeRekening, setKodeRekening] = useState('1204010102, Gedung');
  const [nomorDoc, setNomorDoc] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [noNde, setNoNde] = useState('ACCRUE');
  const [bsuRelease, setBsuRelease] = useState<number>(100_000_000);
  const [bsuAktual, setBsuAktual] = useState<number>(100_000_000);
  const [statusBayar, setStatusBayar] = useState<'Sudah di OGP' | 'Belum di OGP'>('Sudah di OGP');
  const [bulanAktual, setBulanAktual] = useState('MAR');
  const [lokasiAset, setLokasiAset] = useState('40005, Kantor Pusat');
  const [kodeSubproker, setKodeSubproker] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update prokers selectable in modal based on modalYear
  const modalProkers = useMemo(() => {
    const yr = parseInt(modalYear);
    const list = workPrograms.filter(p => p.tahunAnggaran === yr);
    return list.length > 0 ? list : workPrograms;
  }, [workPrograms, modalYear]);

  // Set initial prokerId when modal opens or modalYear changes
  React.useEffect(() => {
    if (modalProkers.length > 0) {
      setProkerId(modalProkers[0].id);
    }
  }, [modalProkers]);

  const handleOpenModal = () => {
    const yr = activeYear === 'Semua' ? '2026' : activeYear;
    setModalYear(yr);
    setTglPosting(`${yr}-03-31`);
    setNomorDoc(`68000000${Math.floor(Math.random() * 90) + 10}`);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedP = workPrograms.find(p => p.id === prokerId);
      const yrNum = parseInt(modalYear) || 2026;
      await onCreateRealization({
        prokerId,
        kodeProker: selectedP?.kodeProker || '',
        idRelease: (realizations.length + 1).toString(),
        tglPosting,
        kodeAset,
        kodeRekening,
        nomorDokumen: nomorDoc || `${Date.now()}`,
        keteranganRelease: keterangan,
        noNde,
        bsuRelease: Number(bsuRelease),
        bsuAktual: Number(bsuAktual),
        statusPembayaran: statusBayar,
        bulanAktual,
        lokasiAset,
        kodeSubproker: kodeSubproker || selectedP?.kodeProker || '-',
        tahunAnggaran: yrNum
      });
      setShowModal(false);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = ['Administrator', 'VP/Manager', 'PIC Proker'].includes(currentUser.role);

  // CSV Export for filtered year
  const handleExportCSV = () => {
    const headers = [
      'ID RELEASE',
      'TAHUN ANGGARAN',
      'TGL POSTING',
      'KODE PROKER',
      'KODE ASET',
      'KODE REKENING',
      'NOMOR DOKUMEN',
      'KETERANGAN RELEASE',
      'NO NDE',
      'BSU RELEASE',
      'STATUS PEMBAYARAN',
      'BSU AKTUAL',
      'BULAN AKTUAL',
      'LOKASI ASET'
    ];

    const rows = filteredList.map(r => [
      r.idRelease,
      getRealizationYear(r),
      r.tglPosting,
      `"${r.kodeProker.replace(/"/g, '""')}"`,
      `"${r.kodeAset.replace(/"/g, '""')}"`,
      `"${r.kodeRekening.replace(/"/g, '""')}"`,
      r.nomorDokumen,
      `"${r.keteranganRelease.replace(/"/g, '""')}"`,
      r.noNde,
      r.bsuRelease,
      r.statusPembayaran,
      r.bsuAktual,
      r.bulanAktual,
      `"${r.lokasiAset.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Realisasi_Keuangan_${activeYear === 'Semua' ? 'Semua_Tahun' : activeYear}.csv`);
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
            Pencatatan BSU Release, BSU Aktual, Accrue, dan Status OGP (Out of Good Practice / Pembayaran) per Tahun Anggaran
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

          {canCreate && (
            <button
              onClick={handleOpenModal}
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

      {/* KPI Cards Strip (Recalculated specifically for activeYear) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total BSU Release */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-4 shadow-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
            Total BSU Release ({activeYear === 'Semua' ? 'Semua' : activeYear})
          </p>
          <h3 className="text-xl font-extrabold text-white font-mono mt-1 tabular-nums">
            {formatRupiah(totalBsuRelease, 'rupiah')}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Alokasi rilis dana anggaran</p>
        </div>

        {/* Total BSU Aktual */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-4 shadow-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
            Total BSU Aktual ({activeYear === 'Semua' ? 'Semua' : activeYear})
          </p>
          <h3 className="text-xl font-extrabold text-emerald-400 font-mono mt-1 tabular-nums">
            {formatRupiah(totalBsuAktual, 'rupiah')}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Realisasi pembayaran terserap</p>
        </div>

        {/* Serapan % */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-4 shadow-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
            Serapan Realisasi (%)
          </p>
          <h3 className="text-xl font-extrabold text-orange-400 font-mono mt-1 tabular-nums">
            {formatPercentage(serapanPersen)}
          </h3>
          <div className="w-full bg-[#0d1733] h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-orange-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, serapanPersen)}%` }}
            />
          </div>
        </div>

        {/* Sudah di OGP */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-4 shadow-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
            Sudah di OGP
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-xl font-extrabold text-blue-400 font-mono tabular-nums">
              {sudahOgpList.length} Rilis
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              ({formatRupiah(totalSudahOgp, 'rupiah')})
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Pembayaran resmi terealisasi</p>
        </div>

        {/* Belum di OGP */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-4 shadow-md">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
            Belum di OGP (Accrue)
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-xl font-extrabold text-amber-400 font-mono tabular-nums">
              {belumOgpList.length} Rilis
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              ({formatRupiah(totalBelumOgp, 'rupiah')})
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Pending verifikasi pembayaran</p>
        </div>
      </div>

      {/* Toolbar Filter & Search */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor dokumen, kode proker, keterangan release, lokasi..."
            className="w-full bg-[#0d1733] border border-[#213565] text-white text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bulan Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Bulan:</span>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="bg-[#0d1733] border border-[#213565] text-white text-xs rounded-lg px-2 py-1 focus:border-orange-500"
            >
              <option value="Semua">Semua Bulan</option>
              {['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Status OGP Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status OGP:</span>
            {['Semua', 'Sudah di OGP', 'Belum di OGP'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterOgp(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterOgp === st
                    ? 'bg-amber-500 text-white font-semibold'
                    : 'bg-[#18294e] text-slate-300 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Section: exact matching image_a15c3cf4.png */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-3 bg-[#0d1733] border-b border-[#1c2c54] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Daftar Rilis & Transaksi Realisasi Keuangan Tahun {activeYear === 'Semua' ? 'Seluruh Tahun' : activeYear} ({filteredList.length} Data)
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Format Resmi SAP COPA / ERP PT Pos Indonesia
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Green Header Row matching image_a15c3cf4.png */}
              <tr className="bg-[#5a7d28] text-white select-none">
                <th className="py-2.5 px-2.5 font-bold text-center">ID RELEASE</th>
                <th className="py-2.5 px-2.5 font-bold text-center">TAHUN</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">TGL POSTING</th>
                <th className="py-2.5 px-2.5 font-bold">KODE PROKER</th>
                <th className="py-2.5 px-2.5 font-bold">KODE ASET</th>
                <th className="py-2.5 px-2.5 font-bold">KODE REKENING</th>
                <th className="py-2.5 px-2.5 font-bold">NOMOR DOCUMENT</th>
                <th className="py-2.5 px-2.5 font-bold min-w-[200px]">KETERANGAN RELEASE</th>
                <th className="py-2.5 px-2.5 font-bold text-center">NO NDE</th>
                <th className="py-2.5 px-2.5 font-bold text-right">BSU RELEASE</th>
                <th className="py-2.5 px-2.5 font-bold text-center">STATUS PEMBAYARAN</th>
                <th className="py-2.5 px-2.5 font-bold text-right">BSU AKTUAL</th>
                <th className="py-2.5 px-2.5 font-bold text-center">BULAN AKTUAL</th>
                <th className="py-2.5 px-2.5 font-bold">LOKASI ASET</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2c54]/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300">
                        Tidak ada transaksi realisasi keuangan untuk Tahun {activeYear}.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pilih tahun lain di atas atau klik "Input Transaksi Realisasi" untuk menambahkan rilis baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((r) => {
                  const rYear = getRealizationYear(r);
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
                      <td className="py-3 px-2.5 font-mono text-slate-300 whitespace-nowrap">
                        {formatDateIndo(r.tglPosting)}
                      </td>
                      <td className="py-3 px-2.5 font-mono font-bold text-blue-400 whitespace-nowrap">
                        {r.kodeProker}
                      </td>
                      <td className="py-3 px-2.5 text-slate-300 whitespace-nowrap text-[11px]">
                        {r.kodeAset}
                      </td>
                      <td className="py-3 px-2.5 font-mono text-slate-400 whitespace-nowrap">
                        {r.kodeRekening}
                      </td>
                      <td className="py-3 px-2.5 font-mono text-slate-200 whitespace-nowrap">
                        {r.nomorDokumen}
                      </td>
                      <td className="py-3 px-2.5 text-white max-w-xs font-medium">
                        {r.keteranganRelease}
                      </td>
                      <td className="py-3 px-2.5 text-center font-mono text-slate-300">
                        {r.noNde}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-slate-200 font-semibold tabular-nums whitespace-nowrap">
                        {formatRupiahExact(r.bsuRelease)}
                      </td>
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            r.statusPembayaran === 'Sudah di OGP'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {r.statusPembayaran}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                        {formatRupiahExact(r.bsuAktual)}
                      </td>
                      <td className="py-3 px-2.5 text-center font-mono text-slate-300 font-bold">
                        {r.bulanAktual}
                      </td>
                      <td className="py-3 px-2.5 text-slate-300 text-[11px] whitespace-nowrap">
                        {r.lokasiAset}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RELEASE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Input Realisasi Release Anggaran</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* Tahun Anggaran Selector inside modal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tahun Anggaran *</label>
                  <select
                    value={modalYear}
                    onChange={(e) => {
                      const yr = e.target.value;
                      setModalYear(yr);
                      setTglPosting(`${yr}-03-31`);
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
                    value={tglPosting}
                    onChange={(e) => setTglPosting(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Program Kerja (Filtered by chosen modalYear) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Program Kerja Terkait Tahun {modalYear} *
                </label>
                <select
                  value={prokerId}
                  onChange={(e) => setProkerId(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-semibold text-blue-200"
                >
                  {modalProkers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kodeProker} - {p.namaProker} (CAPEX: Rp {p.nilaiCapexRkap.toFixed(2)} M)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Dokumen *</label>
                  <input
                    type="text"
                    required
                    value={nomorDoc}
                    onChange={(e) => setNomorDoc(e.target.value)}
                    placeholder="Contoh: 6800000088"
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">No NDE / Tipe</label>
                  <input
                    type="text"
                    value={noNde}
                    onChange={(e) => setNoNde(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Keterangan Release *</label>
                <input
                  type="text"
                  required
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Accrue pembayaran termin / pengadaan..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Aset</label>
                  <input
                    type="text"
                    value={kodeAset}
                    onChange={(e) => setKodeAset(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Rekening</label>
                  <input
                    type="text"
                    value={kodeRekening}
                    onChange={(e) => setKodeRekening(e.target.value)}
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
                    value={bsuRelease}
                    onChange={(e) => setBsuRelease(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    {formatRupiahExact(bsuRelease)}
                  </span>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">BSU Aktual (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={bsuAktual}
                    onChange={(e) => setBsuAktual(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                  <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">
                    {formatRupiahExact(bsuAktual)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Pembayaran</label>
                  <select
                    value={statusBayar}
                    onChange={(e) => setStatusBayar(e.target.value as any)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-semibold"
                  >
                    <option value="Sudah di OGP">Sudah di OGP</option>
                    <option value="Belum di OGP">Belum di OGP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bulan Aktual</label>
                  <select
                    value={bulanAktual}
                    onChange={(e) => setBulanAktual(e.target.value)}
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
                    value={lokasiAset}
                    onChange={(e) => setLokasiAset(e.target.value)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
    </div>
  );
};

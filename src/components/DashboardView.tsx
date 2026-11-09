import React, { useMemo } from 'react';
import {
  FolderKanban,
  TrendingUp,
  Coins,
  AlertTriangle,
  Clock,
  FileWarning,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { DashboardStats, WorkProgram } from '../types';
import { formatRupiah, formatPercentage } from '../utils/formatters';

import { YearSummary } from '../types';

interface DashboardViewProps {
  stats: DashboardStats;
  workPrograms: WorkProgram[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
  availableYears: number[];
  onOpenAddYearModal: () => void;
  multiYearSummaries: YearSummary[];
  selectedOwner: string;
  onSelectOwner: (owner: string) => void;
  selectedBosie: string;
  onSelectBosie: (bosie: string) => void;
  onViewProker: (proker: WorkProgram) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  workPrograms,
  selectedYear,
  onSelectYear,
  availableYears,
  onOpenAddYearModal,
  multiYearSummaries,
  selectedOwner,
  onSelectOwner,
  selectedBosie,
  onSelectBosie,
  onViewProker,
  onNavigateToTab
}) => {
  const [dashboardMode, setDashboardMode] = React.useState<'single' | 'multi-year'>('single');

  // Multi-Year Bar Chart Data
  const multiYearChartData = multiYearSummaries.map(s => ({
    tahun: s.tahun.toString(),
    'RKAP (M)': s.totalAnggaranCapex,
    'Realisasi (M)': s.totalRealisasi,
    'Serapan (%)': s.persentaseSerapan,
    'Progres (%)': s.rataRataProgres,
    'Total Proker': s.totalProker
  }));

  // Chart A: Status Proker Data
  const statusData = [
    { name: 'Belum Mulai', value: stats.statusProker.belumMulai, color: '#64748b' },
    { name: 'Proses', value: stats.statusProker.proses, color: '#3b82f6' },
    { name: 'Selesai', value: stats.statusProker.selesai, color: '#10b981' }
  ].filter(d => d.value > 0);

  // Chart B: Waktu Pelaksanaan Data
  const waktuData = [
    { name: 'Terdepan', value: stats.waktuPelaksanaan.terdepan, color: '#10b981' },
    { name: 'Sesuai', value: stats.waktuPelaksanaan.sesuai, color: '#3b82f6' },
    { name: 'Terlambat', value: stats.waktuPelaksanaan.terlambat, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Chart C: Distribusi Owner Data
  const ownerData = [
    { name: 'Induk', value: stats.distribusiOwner.induk, color: '#f97316' },
    { name: 'Poslog', value: stats.distribusiOwner.poslog, color: '#8b5cf6' },
    { name: 'Posdig', value: stats.distribusiOwner.posdig, color: '#06b6d4' },
    { name: 'Pospro', value: stats.distribusiOwner.pospro, color: '#ec4899' }
  ].filter(d => d.value > 0);

  // Chart D: Realisasi per BOSIE Data
  const bosieChartData = stats.realisasiPerBosie.map(b => ({
    name: b.bosie + ' (' + b.namaBosie.split(' ')[0] + ')',
    rkap: b.rkap,
    realisasi: b.realisasi,
    fullName: b.namaBosie
  }));

  // Chart E: CAPEX vs Realisasi Quarter Data
  const quarterChartData = stats.capexVsRealisasiQuarter.map(q => ({
    name: q.quarter,
    'Target Anggaran': q.targetAnggaran,
    'Prognosa': q.prognosa,
    'Realisasi Aktual': q.realisasiAktual
  }));

  // Top delayed / high alert prokers
  const delayedProkers = workPrograms
    .filter(p => p.statusJadwal === 'Terlambat' || p.progresFisik < p.targetProgresFisik - 5)
    .slice(0, 5);

  // Pemisahan Realisasi Aktual CAPEX: Accrual vs NPP Sudah di OGP vs NPP Belum di OGP
  const financialBreakdown = useMemo(() => {
    let accrual = 0;
    let nppSudahOgp = 0;
    let nppBelumOgp = 0;
    let totalAktual = 0;
    let sisaAccrue = 0;

    workPrograms.forEach((p) => {
      accrual += p.nilaiAccrue || 0;
      nppSudahOgp += p.nilaiOgp || 0;
      nppBelumOgp += p.belumOgp || 0;
      totalAktual += p.nilaiAktual || 0;
      sisaAccrue += p.sisaAccrue || 0;
    });

    const accrualPct = totalAktual > 0 ? (accrual / totalAktual) * 100 : 0;
    const sudahOgpPct = totalAktual > 0 ? (nppSudahOgp / totalAktual) * 100 : 0;
    const belumOgpPct = totalAktual > 0 ? (nppBelumOgp / totalAktual) * 100 : 0;

    return {
      accrual,
      nppSudahOgp,
      nppBelumOgp,
      totalAktual,
      sisaAccrue,
      accrualPct,
      sudahOgpPct,
      belumOgpPct
    };
  }, [workPrograms]);

  return (
    <div className="space-y-6">
      {/* Simulation Banner & Mode Switcher */}
      <div className="bg-[#122144] border border-[#233a6b] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h3 className="font-bold text-white text-sm">
              Dashboard Pengendalian CAPEX Multi-Tahun PT Pos Indonesia
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Menampilkan data komprehensif tahun anggaran 2022, 2023, 2024, 2025, 2026, dan tahun mendatang.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-[#091124] p-1 rounded-xl border border-[#1e325c] self-start md:self-auto">
          <button
            onClick={() => setDashboardMode('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dashboardMode === 'single'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dashboard Tahunan ({selectedYear})
          </button>
          <button
            onClick={() => setDashboardMode('multi-year')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dashboardMode === 'multi-year'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tren Multi-Tahun (2022 - {Math.max(...availableYears, 2026)})
          </button>
        </div>
      </div>

      {/* Quick Year Navigation Chips */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-semibold mr-1">Tahun Anggaran:</span>
          <button
            onClick={() => {
              onSelectYear('Semua');
              setDashboardMode('single');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedYear === 'Semua' && dashboardMode === 'single'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow'
                : 'bg-[#18294e] text-slate-300 hover:text-white'
            }`}
          >
            Semua Tahun
          </button>
          {availableYears.map(yr => (
            <button
              key={yr}
              onClick={() => {
                onSelectYear(yr.toString());
                setDashboardMode('single');
              }}
              className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                selectedYear === yr.toString() && dashboardMode === 'single'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow'
                  : 'bg-[#18294e] text-slate-300 hover:text-white'
              }`}
            >
              {yr}
            </button>
          ))}
          <button
            onClick={onOpenAddYearModal}
            className="px-3 py-1.5 bg-[#18294e] hover:bg-orange-500 text-orange-400 hover:text-white border border-dashed border-orange-500/50 rounded-lg font-bold flex items-center gap-1 transition-all"
          >
            <span>+ Tambah Tahun</span>
          </button>
        </div>

        <div className="text-slate-400 text-[11px] font-mono">
          Aktif: <strong className="text-white">{selectedYear === 'Semua' ? 'Seluruh Tahun' : `TA ${selectedYear}`}</strong> ({workPrograms.length} Proker Tersedia)
        </div>
      </div>

      {/* RENDER MULTI-YEAR COMPARISON IF MODE === 'multi-year' */}
      {dashboardMode === 'multi-year' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Multi-Year Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: CAPEX vs Realisasi per Tahun */}
            <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Total Anggaran CAPEX RKAP vs Realisasi per Tahun
                  </h4>
                  <p className="text-xs text-slate-400">Tren nominal anggaran investasi (Miliar Rp)</p>
                </div>
                <span className="text-xs text-orange-400 font-mono font-medium">2022 - {Math.max(...availableYears, 2026)}</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={multiYearChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="tahun" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={11} unit=" M" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1733', borderColor: '#233a6b', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`Rp ${Number(val).toFixed(2)} M`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="RKAP (M)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Realisasi (M)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Persentase Serapan & Progres Fisik per Tahun */}
            <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Tren Serapan Anggaran & Rata-rata Progres Fisik
                  </h4>
                  <p className="text-xs text-slate-400">Efektivitas eksekusi program kerja per tahun (%)</p>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-medium">Persentase</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={multiYearChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="tahun" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={11} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1733', borderColor: '#233a6b', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`${Number(val).toFixed(2)}%`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Serapan (%)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Progres (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Multi-Year Summary Matrix Table */}
          <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 bg-[#0d1733] border-b border-[#1c2c54] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Matriks Perbandingan Kinerja Investasi Antar Tahun Anggaran
                </h4>
                <p className="text-xs text-slate-400">
                  Ringkasan komprehensif CAPEX RKAP, realisasi, serapan, dan status penyelesaian proyek
                </p>
              </div>
              <button
                onClick={onOpenAddYearModal}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all"
              >
                + Tambah Tahun Baru
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0b142b] border-b border-[#1c2c54] text-slate-400">
                    <th className="py-3 px-4 font-bold">TAHUN ANGGARAN</th>
                    <th className="py-3 px-4 font-bold text-center">TOTAL PROKER</th>
                    <th className="py-3 px-4 font-bold text-right">CAPEX RKAP (M)</th>
                    <th className="py-3 px-4 font-bold text-right">REALISASI AKTUAL (M)</th>
                    <th className="py-3 px-4 font-bold text-center">SERAPAN %</th>
                    <th className="py-3 px-4 font-bold text-center">RATA-RATA PROGRES</th>
                    <th className="py-3 px-4 font-bold text-center">STATUS PROYEK</th>
                    <th className="py-3 px-4 font-bold text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2c54]/60">
                  {multiYearSummaries.map((s) => (
                    <tr key={s.tahun} className="hover:bg-[#18294e]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-extrabold text-base text-white">
                        TA {s.tahun}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-400">
                        {s.totalProker} Program
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white tabular-nums">
                        {formatRupiah(s.totalAnggaranCapex)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                        {formatRupiah(s.totalRealisasi)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            s.persentaseSerapan > 80
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : s.persentaseSerapan > 20
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-500/20 text-slate-300'
                          }`}
                        >
                          {s.persentaseSerapan}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white tabular-nums">
                        {s.rataRataProgres}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono">
                          <span className="text-emerald-400 font-semibold">{s.prokerSelesai} Selesai</span>
                          <span>·</span>
                          <span className="text-blue-400 font-semibold">{s.prokerProses} Proses</span>
                          {s.prokerBelumMulai > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-slate-400 font-semibold">{s.prokerBelumMulai} Belum</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            onSelectYear(s.tahun.toString());
                            setDashboardMode('single');
                          }}
                          className="px-3 py-1 bg-[#18294e] hover:bg-orange-500 hover:text-white text-orange-400 border border-[#273e75] rounded-lg font-semibold transition-colors"
                        >
                          Buka Dashboard TA {s.tahun}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER STANDARD YEAR DASHBOARD IF MODE === 'single' */}
      {dashboardMode === 'single' && (
        <div className="space-y-6">

      {/* Row 1: KPI Cards matching image_7f0fcb0f.png */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Proker */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg flex items-center justify-between transition-transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Proker
            </p>
            <h3 className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight tabular-nums">
              {stats.totalProker}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Program Kerja Aktif ({formatRupiah(stats.totalAnggaranCapex)})
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

        {/* Rata-rata Progres */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg flex items-center justify-between transition-transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Rata-rata Progres
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-1 font-mono tracking-tight tabular-nums">
              {formatPercentage(stats.rataRataProgresFisik)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Kumulatif Progres Fisik
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Realisasi Anggaran */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg flex items-center justify-between transition-transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Realisasi Anggaran
            </p>
            <h3 className="text-3xl font-extrabold text-amber-400 mt-1 font-mono tracking-tight tabular-nums">
              {formatPercentage(stats.persentaseSerapan)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
              {formatRupiah(stats.realisasiAnggaran)} dari {formatRupiah(stats.totalAnggaranCapex)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Proker Terlambat (Highlight Red Warning Card matching screenshot) */}
        <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl p-5 shadow-xl shadow-red-900/20 flex items-center justify-between text-white transition-transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-red-100 uppercase tracking-wider">
              Proker Terlambat
            </p>
            <h3 className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight tabular-nums">
              {stats.proyekTerlambatCount}
            </h3>
            <p className="text-xs text-red-200 mt-1">
              Perlu Perhatian & Evaluasi
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Row 1.2: Pemisahan Realisasi Aktual CAPEX (Accrual vs NPP Sudah OGP vs NPP Belum OGP) */}
      <div className="bg-[#111e3f] border border-[#203463] rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c2c54] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Coins className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pemisahan Realisasi Aktual CAPEX PT Pos Indonesia</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                  {selectedYear === 'Semua' ? 'Seluruh Tahun' : `Tahun ${selectedYear}`}
                </span>
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Rincian akuntansi: Beban Akrual (Accrue) vs NPP yang telah diterbitkan OGP vs NPP dalam antrean OGP
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400 font-mono">
              Total: {formatRupiah(financialBreakdown.totalAktual)} Miliar
            </span>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-[#0b162e] border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-blue-300 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Accrual (Accrue)</span>
              </span>
              <span className="text-[10px] text-blue-400 font-mono font-bold">
                {financialBreakdown.accrualPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-lg font-extrabold text-blue-300 font-mono tabular-nums">
              {financialBreakdown.accrual.toFixed(3)} <span className="text-xs font-semibold">M</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Pencatatan beban akrual proyek</p>
          </div>

          <div className="bg-[#0b162e] border border-emerald-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-300 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>NPP Sudah di OGP</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                {financialBreakdown.sudahOgpPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-lg font-extrabold text-emerald-400 font-mono tabular-nums">
              {financialBreakdown.nppSudahOgp.toFixed(3)} <span className="text-xs font-semibold">M</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Sudah terbit OGP (siap bayar/cair)</p>
          </div>

          <div className="bg-[#0b162e] border border-amber-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-300 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>NPP Belum di OGP</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {financialBreakdown.belumOgpPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-lg font-extrabold text-amber-400 font-mono tabular-nums">
              {financialBreakdown.nppBelumOgp.toFixed(3)} <span className="text-xs font-semibold">M</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Menunggu penerbitan OGP</p>
          </div>

          <div className="bg-[#0b162e] border border-purple-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-purple-300 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Sisa Accrue</span>
              </span>
            </div>
            <div className="text-lg font-extrabold text-purple-300 font-mono tabular-nums">
              {financialBreakdown.sisaAccrue.toFixed(3)} <span className="text-xs font-semibold">M</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Accrue - Sudah OGP</p>
          </div>
        </div>

        {/* Proportional Stacked Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${Math.min(financialBreakdown.accrualPct, 100)}%` }}
              className="h-full bg-blue-500 transition-all duration-300"
              title={`Accrual: ${financialBreakdown.accrual.toFixed(2)} M (${financialBreakdown.accrualPct.toFixed(1)}%)`}
            />
            <div
              style={{ width: `${Math.min(financialBreakdown.sudahOgpPct, 100)}%` }}
              className="h-full bg-emerald-500 transition-all duration-300"
              title={`NPP Sudah OGP: ${financialBreakdown.nppSudahOgp.toFixed(2)} M (${financialBreakdown.sudahOgpPct.toFixed(1)}%)`}
            />
            <div
              style={{ width: `${Math.min(financialBreakdown.belumOgpPct, 100)}%` }}
              className="h-full bg-amber-500 transition-all duration-300"
              title={`NPP Belum OGP: ${financialBreakdown.nppBelumOgp.toFixed(2)} M (${financialBreakdown.belumOgpPct.toFixed(1)}%)`}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Accrual</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>NPP Sudah di OGP</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>NPP Belum di OGP</span>
            </span>
          </div>
        </div>
      </div>

      {/* Row 1.5: Secondary KPIs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0f1b35] border border-[#1c2c54] rounded-xl p-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-[11px] text-slate-400">Belum Dimulai</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums">{stats.proyekBelumMulaiCount} Proker</p>
          </div>
        </div>
        <div className="bg-[#0f1b35] border border-[#1c2c54] rounded-xl p-3 flex items-center gap-3">
          <FileWarning className="w-4 h-4 text-amber-400" />
          <div>
            <p className="text-[11px] text-slate-400">Dokumen Belum Lengkap</p>
            <p className="text-sm font-bold text-amber-400 font-mono tabular-nums">{stats.dokumenBelumLengkapCount} Proker</p>
          </div>
        </div>
        <div className="bg-[#0f1b35] border border-[#1c2c54] rounded-xl p-3 flex items-center gap-3">
          <Building2 className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-[11px] text-slate-400">Distribusi Induk</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums">{stats.distribusiOwner.induk} Proker</p>
          </div>
        </div>
        <div className="bg-[#0f1b35] border border-[#1c2c54] rounded-xl p-3 flex items-center gap-3">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-[11px] text-slate-400">Selesai 100%</p>
            <p className="text-sm font-bold text-emerald-400 font-mono tabular-nums">{stats.statusProker.selesai} Proker</p>
          </div>
        </div>
      </div>

      {/* Quick Filter Bar */}
      <div className="bg-[#111e3c] border border-[#1e325c] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium">Filter Owner:</span>
          {['Semua', 'Induk', 'Poslog', 'Posdig', 'Pospro'].map((owner) => (
            <button
              key={owner}
              onClick={() => onSelectOwner(owner)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedOwner === owner
                  ? 'bg-orange-500 text-white font-semibold'
                  : 'bg-[#18294e] text-slate-300 hover:text-white'
              }`}
            >
              {owner}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium">Jenis BOSIE:</span>
          {[
            { key: 'Semua', label: 'Semua' },
            { key: 'B', label: 'B - BizDev' },
            { key: 'O', label: 'O - Ops' },
            { key: 'S', label: 'S - System' },
            { key: 'I', label: 'I - IT' },
            { key: 'E', label: 'E - Enabler' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => onSelectBosie(item.key)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedBosie === item.key
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-[#18294e] text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: 3 Donut Charts matching image_7f0fcb0f.png */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Chart A: Status Program Kerja */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white tracking-tight">Status Program Kerja</h4>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1733', borderColor: '#233a6b', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#64748b]" />
              <span className="text-slate-300">Belum Mulai ({stats.statusProker.belumMulai})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
              <span className="text-slate-300">Proses ({stats.statusProker.proses})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10b981]" />
              <span className="text-slate-300">Selesai ({stats.statusProker.selesai})</span>
            </div>
          </div>
        </div>

        {/* Chart B: Waktu Pelaksanaan */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white tracking-tight">Waktu Pelaksanaan</h4>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={waktuData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {waktuData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1733', borderColor: '#233a6b', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10b981]" />
              <span className="text-slate-300">Terdepan ({stats.waktuPelaksanaan.terdepan})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
              <span className="text-slate-300">Sesuai ({stats.waktuPelaksanaan.sesuai})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
              <span className="text-slate-300">Terlambat ({stats.waktuPelaksanaan.terlambat})</span>
            </div>
          </div>
        </div>

        {/* Chart C: Distribusi Owner */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white tracking-tight">Distribusi Owner</h4>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ownerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ownerData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1733', borderColor: '#233a6b', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f97316]" />
              <span className="text-slate-300">Induk ({stats.distribusiOwner.induk})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
              <span className="text-slate-300">Poslog ({stats.distribusiOwner.poslog})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#06b6d4]" />
              <span className="text-slate-300">Posdig ({stats.distribusiOwner.posdig})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ec4899]" />
              <span className="text-slate-300">Pospro ({stats.distribusiOwner.pospro})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: 2 Bar Charts matching image_7f0fcb0f.png */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart D: Realisasi per BOSIE */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">Realisasi per BOSIE</h4>
              <p className="text-xs text-slate-400">Perbandingan RKAP vs Realisasi (Miliar Rp)</p>
            </div>
            <span className="text-xs text-orange-400 font-mono font-medium">5 Pilar</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bosieChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1733', borderColor: '#233a6b', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`Rp ${Number(val).toFixed(2)} M`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="rkap" name="Anggaran RKAP" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realisasi" name="Realisasi Aktual" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart E: CAPEX vs Realisasi per Quarter */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">CAPEX vs Realisasi per Quarter</h4>
              <p className="text-xs text-slate-400">Target, Prognosa, dan Aktual Triwulan (Miliar Rp)</p>
            </div>
            <span className="text-xs text-blue-400 font-mono font-medium">Q1 - Q4 2026</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1733', borderColor: '#233a6b', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`Rp ${Number(val).toFixed(2)} M`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Target Anggaran" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prognosa" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Realisasi Aktual" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Priority Action Proker Watchlist */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              Program Kerja Prioritas / Perlu Tindak Lanjut
            </h4>
            <p className="text-xs text-slate-400">
              Daftar proker dengan status jadwal terlambat atau deviasi progres fisik
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('proker')}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
          >
            Lihat Semua Proker ({workPrograms.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1c2c54] text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Kode Proker</th>
                <th className="py-2.5 px-3 font-semibold">Nama Program Kerja</th>
                <th className="py-2.5 px-3 font-semibold">Owner</th>
                <th className="py-2.5 px-3 font-semibold text-right">CAPEX RKAP</th>
                <th className="py-2.5 px-3 font-semibold text-center">Progres Fisik</th>
                <th className="py-2.5 px-3 font-semibold text-center">Jadwal</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2c54]/60">
              {delayedProkers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    Semua program kerja saat ini berjalan sesuai jadwal.
                  </td>
                </tr>
              ) : (
                delayedProkers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#18294e]/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-orange-400 whitespace-nowrap">
                      {p.kodeProker}
                    </td>
                    <td className="py-3 px-3 text-white font-medium max-w-xs truncate">
                      {p.namaProker}
                    </td>
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {p.ownerPic} ({p.ownerCategory})
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-200 tabular-nums">
                      {formatRupiah(p.nilaiCapexRkap)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-mono tabular-nums font-semibold text-white">
                          {p.progresFisik}%
                        </span>
                        <div className="w-16 bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              p.statusJadwal === 'Terlambat' ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(p.progresFisik, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.statusJadwal === 'Terlambat'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : p.statusJadwal === 'Terdepan'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {p.statusJadwal}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onViewProker(p)}
                        className="px-2.5 py-1 rounded bg-[#182a55] hover:bg-orange-500 hover:text-white text-orange-400 border border-[#273e75] font-medium transition-all inline-flex items-center gap-1"
                      >
                        <span>Detail</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};


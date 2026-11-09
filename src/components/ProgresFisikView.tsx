import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  X,
  Search,
  Filter,
  BarChart3,
  Layers,
  Building,
  User as UserIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ListFilter,
  Edit2,
  Trash2,
  Eye,
  Check,
  CalendarRange,
  FileText,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { PhysicalProgressRecord, WorkProgram, User, QuarterType } from '../types';
import { formatDateIndo } from '../utils/formatters';

interface ProgresFisikViewProps {
  workPrograms: WorkProgram[];
  progressRecords: PhysicalProgressRecord[];
  currentUser: User;
  availableYears?: number[];
  selectedYear?: string;
  onYearChange?: (year: string) => void;
  onOpenAddYearModal?: () => void;
  onRefresh: () => void;
  onLogProgress: (data: Partial<PhysicalProgressRecord>) => Promise<void>;
  onUpdateProgress?: (id: string, data: Partial<PhysicalProgressRecord>) => Promise<void>;
  onDeleteProgress?: (id: string) => Promise<void>;
}

// Helper: Weekly definitions per Quarter
export const QUARTER_WEEKS: Record<QuarterType, { min: number; max: number; label: string; months: string[] }> = {
  Q1: { min: 1, max: 13, label: 'Triwulan I (Q1)', months: ['Januari', 'Februari', 'Maret'] },
  Q2: { min: 14, max: 26, label: 'Triwulan II (Q2)', months: ['April', 'Mei', 'Juni'] },
  Q3: { min: 27, max: 39, label: 'Triwulan III (Q3)', months: ['Juli', 'Agustus', 'September'] },
  Q4: { min: 40, max: 52, label: 'Triwulan IV (Q4)', months: ['Oktober', 'November', 'Desember'] }
};

export function getQuarterFromWeek(weekNum: number): QuarterType {
  if (weekNum <= 13) return 'Q1';
  if (weekNum <= 26) return 'Q2';
  if (weekNum <= 39) return 'Q3';
  return 'Q4';
}

export const ProgresFisikView: React.FC<ProgresFisikViewProps> = ({
  workPrograms,
  progressRecords,
  currentUser,
  availableYears = [2022, 2023, 2024, 2025, 2026],
  selectedYear,
  onYearChange,
  onOpenAddYearModal,
  onRefresh,
  onLogProgress,
  onUpdateProgress,
  onDeleteProgress
}) => {
  // Filter States
  const [filterTahun, setFilterTahun] = useState<string>(selectedYear || 'Semua');
  const [selectedQuarter, setSelectedQuarter] = useState<'Semua' | QuarterType>('Semua');
  const [searchProker, setSearchProker] = useState('');
  const [selectedProkerId, setSelectedProkerId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'detail' | 'matrix' | 'quarter-breakdown'>('detail');

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PhysicalProgressRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Sync when selectedYear from top navigation changes
  useEffect(() => {
    if (selectedYear) {
      setFilterTahun(selectedYear);
    }
  }, [selectedYear]);

  // Handle year filter change
  const handleSelectYear = (yr: string) => {
    setFilterTahun(yr);
    if (onYearChange && yr !== 'Semua') {
      onYearChange(yr);
    }
  };

  // 1. Prokers filtered by chosen Year
  const prokersInYear = useMemo(() => {
    if (filterTahun === 'Semua') return workPrograms;
    return workPrograms.filter((p) => p.tahunAnggaran.toString() === filterTahun);
  }, [workPrograms, filterTahun]);

  // 2. Searchable prokers in current year
  const searchFilteredProkers = useMemo(() => {
    if (!searchProker.trim()) return prokersInYear;
    const q = searchProker.toLowerCase();
    return prokersInYear.filter(
      (p) =>
        p.kodeProker.toLowerCase().includes(q) ||
        p.namaProker.toLowerCase().includes(q) ||
        p.ownerPic.toLowerCase().includes(q) ||
        p.direktorat.toLowerCase().includes(q) ||
        p.divisiUnitKerja.toLowerCase().includes(q)
    );
  }, [prokersInYear, searchProker]);

  // 3. Keep selectedProkerId synced with available prokers
  useEffect(() => {
    if (prokersInYear.length > 0) {
      const exists = prokersInYear.some((p) => p.id === selectedProkerId);
      if (!exists) {
        setSelectedProkerId(prokersInYear[0].id);
      }
    } else {
      setSelectedProkerId('');
    }
  }, [prokersInYear, selectedProkerId]);

  // Selected Proker Details
  const selectedProker = useMemo(() => {
    return (
      workPrograms.find((p) => p.id === selectedProkerId) ||
      prokersInYear[0] ||
      workPrograms[0] ||
      null
    );
  }, [workPrograms, selectedProkerId, prokersInYear]);

  // Records for currently selected proker (sorted by week or date)
  const prokerRecords = useMemo(() => {
    if (!selectedProker) return [];
    return progressRecords
      .filter((r) => r.prokerId === selectedProker.id)
      .sort((a, b) => {
        const weekA = a.mingguKe || 0;
        const weekB = b.mingguKe || 0;
        if (weekA !== weekB) return weekA - weekB;
        return new Date(a.tanggalPelaporan).getTime() - new Date(b.tanggalPelaporan).getTime();
      });
  }, [progressRecords, selectedProker]);

  // Filtered by Selected Quarter
  const filteredProkerRecords = useMemo(() => {
    if (selectedQuarter === 'Semua') return prokerRecords;
    return prokerRecords.filter((r) => {
      if (r.quarter) return r.quarter === selectedQuarter;
      const q = r.mingguKe ? getQuarterFromWeek(r.mingguKe) : 'Q4';
      return q === selectedQuarter;
    });
  }, [prokerRecords, selectedQuarter]);

  // Quarter Grouping & Realization Aggregates for Selected Proker
  const quarterStats = useMemo(() => {
    const quarters: QuarterType[] = ['Q1', 'Q2', 'Q3', 'Q4'];
    const result: Record<QuarterType, {
      quarter: QuarterType;
      label: string;
      targetRata: number;
      realisasiRata: number;
      targetAkhir: number;
      realisasiAkhir: number;
      deviasi: number;
      count: number;
      status: 'Terdepan' | 'Sesuai' | 'Terlambat';
      records: PhysicalProgressRecord[];
    }> = {} as any;

    quarters.forEach((q) => {
      const qRecs = prokerRecords.filter((r) => {
        if (r.quarter) return r.quarter === q;
        const wk = r.mingguKe || 0;
        return getQuarterFromWeek(wk) === q;
      });

      if (qRecs.length === 0) {
        // Fallback estimated baseline based on proker's overall milestones
        const baseTarget = q === 'Q1' ? 25 : q === 'Q2' ? 50 : q === 'Q3' ? 75 : 100;
        result[q] = {
          quarter: q,
          label: QUARTER_WEEKS[q].label,
          targetRata: 0,
          realisasiRata: 0,
          targetAkhir: baseTarget,
          realisasiAkhir: 0,
          deviasi: 0,
          count: 0,
          status: 'Sesuai',
          records: []
        };
      } else {
        const sumTarget = qRecs.reduce((acc, r) => acc + (r.targetProgres || 0), 0);
        const sumReal = qRecs.reduce((acc, r) => acc + (r.realisasiProgres || 0), 0);
        const latestRec = qRecs[qRecs.length - 1];
        const deviasi = +(latestRec.realisasiProgres - latestRec.targetProgres).toFixed(1);

        let status: 'Terdepan' | 'Sesuai' | 'Terlambat' = 'Sesuai';
        if (deviasi < -3) status = 'Terlambat';
        else if (deviasi > 3) status = 'Terdepan';

        result[q] = {
          quarter: q,
          label: QUARTER_WEEKS[q].label,
          targetRata: +(sumTarget / qRecs.length).toFixed(1),
          realisasiRata: +(sumReal / qRecs.length).toFixed(1),
          targetAkhir: latestRec.targetProgres,
          realisasiAkhir: latestRec.realisasiProgres,
          deviasi,
          count: qRecs.length,
          status,
          records: qRecs
        };
      }
    });

    return result;
  }, [prokerRecords]);

  // Overall Year KPI Summary
  const yearKpis = useMemo(() => {
    const total = prokersInYear.length;
    if (total === 0) {
      return {
        total: 0,
        avgRealisasi: 0,
        avgTarget: 0,
        terdepan: 0,
        sesuai: 0,
        terlambat: 0,
        totalCapex: 0
      };
    }
    const sumRealisasi = prokersInYear.reduce((acc, p) => acc + (p.progresFisik || 0), 0);
    const sumTarget = prokersInYear.reduce((acc, p) => acc + (p.targetProgresFisik || 0), 0);
    const terdepan = prokersInYear.filter((p) => p.statusJadwal === 'Terdepan').length;
    const sesuai = prokersInYear.filter((p) => p.statusJadwal === 'Sesuai').length;
    const terlambat = prokersInYear.filter((p) => p.statusJadwal === 'Terlambat').length;
    const totalCapex = prokersInYear.reduce((acc, p) => acc + (p.nilaiCapexRkap || 0), 0);

    return {
      total,
      avgRealisasi: +(sumRealisasi / total).toFixed(1),
      avgTarget: +(sumTarget / total).toFixed(1),
      terdepan,
      sesuai,
      terlambat,
      totalCapex
    };
  }, [prokersInYear]);

  // Dynamic Weekly S-Curve Data combining real logged records & baseline curve
  const chartData = useMemo(() => {
    if (!selectedProker) return [];

    const targetEnd = selectedProker.targetProgresFisik || 100;
    const realisasiEnd = selectedProker.progresFisik || 0;

    // Determine week range based on selectedQuarter
    const minWk = selectedQuarter === 'Semua' ? 1 : QUARTER_WEEKS[selectedQuarter].min;
    const maxWk = selectedQuarter === 'Semua' ? 52 : QUARTER_WEEKS[selectedQuarter].max;
    const step = selectedQuarter === 'Semua' ? 2 : 1; // sample every 2 weeks if all year for clean visual

    const points = [];
    const recMap = new Map<number, PhysicalProgressRecord>();
    prokerRecords.forEach((r) => {
      if (r.mingguKe) recMap.set(r.mingguKe, r);
    });

    for (let wk = minWk; wk <= maxWk; wk += step) {
      const factor = wk / 52;
      // S-Curve standard target
      const sCurveTarget = Math.round(targetEnd * (1 / (1 + Math.exp(-6 * (factor - 0.5)))));

      let realisasiVal: number | null = null;
      let deviasiVal: number | null = null;

      // Check if actual weekly record exists
      if (recMap.has(wk)) {
        const exact = recMap.get(wk)!;
        realisasiVal = exact.realisasiProgres;
        deviasiVal = exact.selisih;
      } else {
        // Interpolate or project up to current realisasi
        if (wk <= 43) {
          const projectedReal = Math.min(
            100,
            Math.round(realisasiEnd * (1 / (1 + Math.exp(-6 * (factor - 0.45)))))
          );
          realisasiVal = projectedReal;
          deviasiVal = +(realisasiVal - sCurveTarget).toFixed(1);
        }
      }

      points.push({
        name: `W${wk}`,
        mingguKe: wk,
        target: Math.min(100, Math.max(0, sCurveTarget)),
        realisasi: realisasiVal,
        deviasi: deviasiVal
      });
    }

    return points;
  }, [selectedProker, prokerRecords, selectedQuarter]);

  // Form State for Create & Edit Modal
  const [formTahun, setFormTahun] = useState<number>(selectedProker?.tahunAnggaran || 2026);
  const [formProkerId, setFormProkerId] = useState<string>(selectedProker?.id || '');
  const [formQuarter, setFormQuarter] = useState<QuarterType>('Q4');
  const [formMingguKe, setFormMingguKe] = useState<number>(43);
  const [formBulan, setFormBulan] = useState<string>('Oktober');
  const [formTanggal, setFormTanggal] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formTarget, setFormTarget] = useState<number>(selectedProker?.targetProgresFisik || 50);
  const [formRealisasi, setFormRealisasi] = useState<number>(selectedProker?.progresFisik || 45);
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formKendala, setFormKendala] = useState('');
  const [formTindakLanjut, setFormTindakLanjut] = useState('');
  const [formBuktiUrl, setFormBuktiUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync modal when opening for Create
  const handleOpenCreateModal = (prokerToLog?: WorkProgram, defaultQuarter?: QuarterType) => {
    const target = prokerToLog || selectedProker;
    if (target) {
      setFormTahun(target.tahunAnggaran);
      setFormProkerId(target.id);
      setFormTarget(target.targetProgresFisik || 50);
      setFormRealisasi(target.progresFisik || 45);
    }
    const q = defaultQuarter || (selectedQuarter !== 'Semua' ? selectedQuarter : 'Q4');
    setFormQuarter(q);
    setFormMingguKe(QUARTER_WEEKS[q].min);
    setFormBulan(QUARTER_WEEKS[q].months[0]);
    setFormTanggal(new Date().toISOString().substring(0, 10));
    setFormDeskripsi('');
    setFormKendala('');
    setFormTindakLanjut('');
    setFormBuktiUrl('');
    setEditingRecord(null);
    setShowLogModal(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (rec: PhysicalProgressRecord) => {
    setEditingRecord(rec);
    const p = workPrograms.find((w) => w.id === rec.prokerId) || selectedProker;
    setFormTahun(rec.tahunAnggaran || p?.tahunAnggaran || 2026);
    setFormProkerId(rec.prokerId);
    setFormQuarter(rec.quarter || (rec.mingguKe ? getQuarterFromWeek(rec.mingguKe) : 'Q4'));
    setFormMingguKe(rec.mingguKe || 1);
    setFormBulan(rec.bulan || 'Oktober');
    setFormTanggal(rec.tanggalPelaporan);
    setFormTarget(rec.targetProgres);
    setFormRealisasi(rec.realisasiProgres);
    setFormDeskripsi(rec.deskripsiPekerjaan || '');
    setFormKendala(rec.kendala || '');
    setFormTindakLanjut(rec.tindakLanjut || '');
    setFormBuktiUrl(rec.buktiUrl || '');
    setShowLogModal(true);
  };

  // Filter prokers for modal selector based on formTahun
  const prokersForFormTahun = useMemo(() => {
    return workPrograms.filter((p) => p.tahunAnggaran === formTahun);
  }, [workPrograms, formTahun]);

  // Handle Form Submission (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProkerId) {
      alert('Pilih program kerja terlebih dahulu');
      return;
    }

    const targetProkerObj = workPrograms.find((p) => p.id === formProkerId);
    if (!targetProkerObj) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<PhysicalProgressRecord> = {
        prokerId: targetProkerObj.id,
        kodeProker: targetProkerObj.kodeProker,
        tahunAnggaran: formTahun,
        quarter: formQuarter,
        mingguKe: Number(formMingguKe),
        labelMinggu: `W${formMingguKe}`,
        bulan: formBulan,
        periode: `Minggu ${formMingguKe} (${formQuarter}) - ${formBulan} ${formTahun}`,
        tanggalPelaporan: formTanggal,
        targetProgres: Number(formTarget),
        realisasiProgres: Number(formRealisasi),
        selisih: Number(formRealisasi) - Number(formTarget),
        deskripsiPekerjaan: formDeskripsi.trim(),
        kendala: formKendala.trim(),
        tindakLanjut: formTindakLanjut.trim(),
        buktiUrl: formBuktiUrl.trim(),
        picPelapor: currentUser.name
      };

      if (editingRecord && onUpdateProgress) {
        await onUpdateProgress(editingRecord.id, payload);
        setActionSuccessMsg(`Catatan progres ${payload.labelMinggu} (${payload.quarter}) berhasil diperbarui!`);
      } else {
        await onLogProgress(payload);
        setActionSuccessMsg(`Catatan progres mingguan ${payload.labelMinggu} (${payload.quarter}) berhasil disimpan!`);
      }

      setShowLogModal(false);
      setEditingRecord(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert('Gagal menyimpan progres: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId || !onDeleteProgress) return;
    try {
      await onDeleteProgress(deleteConfirmId);
      setActionSuccessMsg('Catatan progres fisik berhasil dihapus.');
      setDeleteConfirmId(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert('Gagal menghapus catatan progres: ' + err.message);
    }
  };

  const canLog = ['Administrator', 'VP/Manager', 'PIC Proker', 'Reviewer Dokumen'].includes(currentUser.role);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Modul Progres Fisik Pekerjaan Investasi</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold font-mono">
                Mingguan & Triwulanan
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pengendalian target mingguan (W1, W2, W3, dst.), realisasi aktual, deviasi Kurva S, dan pengelompokan capaian per Triwulan (Q1, Q2, Q3, Q4)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0d1733] border border-[#213565] p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('detail')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'detail'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Kurva S & Detail</span>
            </button>
            <button
              onClick={() => setViewMode('quarter-breakdown')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'quarter-breakdown'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Rekap Triwulan (Q1-Q4)</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Matriks Semua Proker ({prokersInYear.length})</span>
            </button>
          </div>

          {canLog && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Progres Fisik</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER TAHUN BAR (Pilihan Tahun Anggaran) */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0 mr-1">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <span>Tahun Anggaran:</span>
          </span>
          <button
            onClick={() => handleSelectYear('Semua')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              filterTahun === 'Semua'
                ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                : 'bg-[#0d1733] hover:bg-[#1a2c52] text-slate-300 border border-[#213565]'
            }`}
          >
            Semua Tahun ({workPrograms.length})
          </button>
          {availableYears.map((yr) => {
            const countInYr = workPrograms.filter((p) => p.tahunAnggaran === yr).length;
            return (
              <button
                key={yr}
                onClick={() => handleSelectYear(yr.toString())}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  filterTahun === yr.toString()
                    ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                    : 'bg-[#0d1733] hover:bg-[#1a2c52] text-slate-300 border border-[#213565]'
                }`}
              >
                <span>TA {yr}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    filterTahun === yr.toString() ? 'bg-orange-700/80 text-white' : 'bg-[#18294e] text-slate-400'
                  }`}
                >
                  {countInYr}
                </span>
              </button>
            );
          })}
          {onOpenAddYearModal && (
            <button
              onClick={onOpenAddYearModal}
              className="px-2.5 py-1.5 rounded-lg text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 font-semibold transition-all shrink-0"
            >
              + Tambah Tahun
            </button>
          )}
        </div>

        <div className="text-slate-400 text-[11px] font-mono">
          Filter TA: <span className="text-white font-bold">{filterTahun === 'Semua' ? 'Seluruh Tahun' : `TA ${filterTahun}`}</span> ({prokersInYear.length} Proker Terfilter)
        </div>
      </div>

      {/* 3. QUARTER SELECTOR BAR (Kelompokan Realisasi Berdasarkan Q1, Q2, Q3, Q4) */}
      <div className="bg-[#111e3f] border border-[#203463] rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c2c54] pb-2.5">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Pengelompokan Triwulan (Quarter):
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Klik triwulan di bawah untuk memfilter grafik dan riwayat pelaporan mingguan
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <button
            onClick={() => setSelectedQuarter('Semua')}
            className={`p-2.5 rounded-xl font-bold transition-all text-left border flex flex-col justify-between ${
              selectedQuarter === 'Semua'
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                : 'bg-[#0d1733] text-slate-300 border-[#213565] hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold">Semua Triwulan</span>
              <span className="text-[10px] font-mono opacity-80">Q1 - Q4</span>
            </div>
            <span className="text-[10px] opacity-75 mt-1 block">Tahun Penuh (W1 s/d W52)</span>
          </button>

          {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterType[]).map((q) => {
            const stat = quarterStats[q];
            const isSelected = selectedQuarter === q;
            return (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`p-2.5 rounded-xl transition-all text-left border flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-orange-600 to-amber-600 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                    : 'bg-[#0d1733] text-slate-300 border-[#213565] hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold tracking-wide">{QUARTER_WEEKS[q].label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-[#18294e] text-slate-300'
                  }`}>
                    {stat.count} Log
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-[11px]">
                  <span className="opacity-80">W{QUARTER_WEEKS[q].min} - W{QUARTER_WEEKS[q].max}</span>
                  <span className="font-mono font-bold">
                    Real: {stat.realisasiAkhir > 0 ? `${stat.realisasiAkhir}%` : '-'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 4 Cards: Detail Summary per Triwulan (Q1, Q2, Q3, Q4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterType[]).map((q) => {
            const info = quarterStats[q];
            const isCurrentQ = selectedQuarter === q;
            return (
              <div
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isCurrentQ
                    ? 'bg-[#16274e] border-orange-500 shadow-md ring-1 ring-orange-500/50'
                    : 'bg-[#0d1733] border-[#213565] hover:bg-[#142347]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                    <span>{QUARTER_WEEKS[q].label}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      info.status === 'Terdepan'
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : info.status === 'Terlambat'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {info.status}
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-[#111e3f] p-1.5 rounded-lg border border-[#213565]">
                    <span className="text-[10px] text-slate-400 block">Target</span>
                    <span className="font-mono font-bold text-blue-400 text-xs">
                      {info.targetAkhir}%
                    </span>
                  </div>
                  <div className="bg-[#111e3f] p-1.5 rounded-lg border border-[#213565]">
                    <span className="text-[10px] text-slate-400 block">Realisasi</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {info.realisasiAkhir > 0 ? `${info.realisasiAkhir}%` : '-'}
                    </span>
                  </div>
                  <div className="bg-[#111e3f] p-1.5 rounded-lg border border-[#213565]">
                    <span className="text-[10px] text-slate-400 block">Deviasi</span>
                    <span className={`font-mono font-bold text-xs ${
                      info.deviasi < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {info.deviasi > 0 ? `+${info.deviasi}%` : `${info.deviasi}%`}
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#1c2c54] flex items-center justify-between text-[10px] text-slate-400">
                  <span>Bulan: {QUARTER_WEEKS[q].months.join(', ')}</span>
                  <span className="font-mono text-orange-300 font-semibold">
                    {info.count} Catatan Mingguan
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. PROKER SELECTOR TOOLBAR */}
      <div className="bg-[#111e3f] border border-[#203463] rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-orange-400" />
            <label className="font-bold text-white">Pilih Program Kerja yang Dipantau:</label>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchProker}
              onChange={(e) => setSearchProker(e.target.value)}
              placeholder="Cari kode / nama proker..."
              className="w-full bg-[#0d1733] border border-[#213565] text-white text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Proker Dropdown Selector */}
        <select
          value={selectedProkerId}
          onChange={(e) => setSelectedProkerId(e.target.value)}
          className="w-full bg-[#0d1733] border border-[#213565] text-white text-xs font-semibold rounded-xl p-2.5 focus:outline-none focus:border-orange-500 text-blue-200"
        >
          {searchFilteredProkers.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#0d1733]">
              [{p.tahunAnggaran}] {p.kodeProker} - {p.namaProker} (Realisasi: {p.progresFisik}%, Target: {p.targetProgresFisik}%)
            </option>
          ))}
        </select>

        {/* Selected Proker Highlights Strip */}
        {selectedProker && (
          <div className="pt-2.5 border-t border-[#1c2c54] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono font-bold text-[11px] border border-orange-500/30">
                {selectedProker.kodeProker}
              </span>
              <span className="font-semibold text-white truncate max-w-md">
                {selectedProker.namaProker}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                · {selectedProker.direktorat} ({selectedProker.ownerPic})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                Jadwal: <span className="font-semibold text-white">{formatDateIndo(selectedProker.tanggalMulai)} s/d {formatDateIndo(selectedProker.targetSelesai)}</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                  selectedProker.statusJadwal === 'Terlambat'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : selectedProker.statusJadwal === 'Terdepan'
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {selectedProker.statusJadwal}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. VIEW MODE CONTENT */}
      {viewMode === 'detail' && (
        <div className="space-y-5">
          {/* S-Curve Chart + Metric Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* S-Curve Chart (2 cols) */}
            <div className="lg:col-span-2 bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Kurva S Mingguan: {selectedProker?.kodeProker}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                      {selectedQuarter === 'Semua' ? 'W1 - W52 (Semua Triwulan)' : `${QUARTER_WEEKS[selectedQuarter].label}`}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target Fisik Rencana (Biru) vs Realisasi Aktual Mingguan (Hijau) vs Deviasi (Abu-abu)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-xs text-slate-400 block">Realisasi Fisik</span>
                    <span className="text-2xl font-extrabold font-mono text-emerald-400">
                      {selectedProker?.progresFisik}%
                    </span>
                  </div>
                  <div className="border-l border-[#1c2c54] pl-4">
                    <span className="text-xs text-slate-400 block">Target Rencana</span>
                    <span className="text-2xl font-extrabold font-mono text-blue-400">
                      {selectedProker?.targetProgresFisik}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e325c" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[-20, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d1733',
                        borderColor: '#233a6b',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(val: any, name: any) => [
                        val !== null ? `${val}%` : '-',
                        name === 'target'
                          ? 'Target Fisik'
                          : name === 'realisasi'
                          ? 'Realisasi Fisik'
                          : 'Deviasi (+/-)'
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      formatter={(value) => {
                        if (value === 'target') return 'Target Fisik Rencana (%)';
                        if (value === 'realisasi') return 'Realisasi Fisik Aktual (%)';
                        return 'Deviasi Garis Dasar (%)';
                      }}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="realisasi"
                      stroke="#10b981"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="deviasi"
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={{ r: 2 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Proker Detail KPI Cards (1 col) */}
            <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight mb-3 flex items-center justify-between">
                  <span>Kondisi Lapangan & Status</span>
                  <span className="text-[10px] text-orange-400 font-mono">TA {selectedProker?.tahunAnggaran}</span>
                </h4>
                <div className="space-y-3 text-xs">
                  {/* Deviasi */}
                  <div className="p-3 bg-[#0d1733] border border-[#213565] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Selisih Deviasi Total</span>
                      <span className={`text-xl font-bold font-mono ${
                        (selectedProker?.progresFisik || 0) >= (selectedProker?.targetProgresFisik || 0)
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}>
                        {((selectedProker?.progresFisik || 0) - (selectedProker?.targetProgresFisik || 0)) > 0 ? '+' : ''}
                        {((selectedProker?.progresFisik || 0) - (selectedProker?.targetProgresFisik || 0)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Jadwal Proyek</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        selectedProker?.statusJadwal === 'Terlambat'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {selectedProker?.statusJadwal}
                      </span>
                    </div>
                  </div>

                  {/* Summary of Triwulan for this proker */}
                  <div className="p-3 bg-[#0d1733] border border-[#213565] rounded-xl space-y-1.5">
                    <span className="text-slate-400 text-[11px] font-semibold block mb-1">
                      Distribusi Log Mingguan per Triwulan:
                    </span>
                    {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterType[]).map((q) => (
                      <div key={q} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium">{QUARTER_WEEKS[q].label}:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-bold">
                            {quarterStats[q].realisasiAkhir > 0 ? `${quarterStats[q].realisasiAkhir}%` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({quarterStats[q].count} Log)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1c2c54] flex items-center justify-between text-[11px] text-slate-400">
                <span>Update Terakhir: <strong className="text-white font-mono">{selectedProker?.terakhirDiperbarui}</strong></span>
                {canLog && (
                  <button
                    onClick={() => handleOpenCreateModal(selectedProker || undefined)}
                    className="text-orange-400 hover:text-orange-300 font-semibold"
                  >
                    + Catat Log Mingguan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Log History Table for Selected Proker */}
          <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0d1733] border-b border-[#1c2c54] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    Catatan Progres Mingguan: {selectedProker?.kodeProker} ({filteredProkerRecords.length} Catatan)
                  </span>
                  {selectedQuarter !== 'Semua' && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">
                      {QUARTER_WEEKS[selectedQuarter].label}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tersimpan berdasarkan target mingguan (W1, W2, dst.), realisasi fisik aktual, dan pengelompokan triwulan
                </p>
              </div>

              {canLog && (
                <button
                  onClick={() => handleOpenCreateModal(selectedProker || undefined)}
                  className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Log Mingguan</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1c2c54] text-slate-400 bg-[#0d1733]/50">
                    <th className="py-2.5 px-3">Triwulan</th>
                    <th className="py-2.5 px-3">Minggu (W)</th>
                    <th className="py-2.5 px-3">Periode & Tanggal</th>
                    <th className="py-2.5 px-3 text-center">Target (%)</th>
                    <th className="py-2.5 px-3 text-center">Realisasi (%)</th>
                    <th className="py-2.5 px-3 text-center">Selisih Deviasi</th>
                    <th className="py-2.5 px-3">Catatan / Uraian Pekerjaan</th>
                    <th className="py-2.5 px-3">Pelapor</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2c54]/60">
                  {filteredProkerRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Belum ada catatan progres fisik tersimpan pada periode triwulan yang dipilih.
                        <div className="mt-2">
                          <button
                            onClick={() => handleOpenCreateModal(selectedProker || undefined)}
                            className="px-3 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 font-semibold text-xs"
                          >
                            + Input Log Mingguan Sekarang
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProkerRecords.map((r) => {
                      const qLabel = r.quarter || (r.mingguKe ? getQuarterFromWeek(r.mingguKe) : 'Q4');
                      const wLabel = r.labelMinggu || (r.mingguKe ? `W${r.mingguKe}` : 'W1');
                      return (
                        <tr key={r.id} className="hover:bg-[#18294e]/70 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold font-mono text-[10px]">
                              {qLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-extrabold font-mono text-[11px]">
                              {wLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <p className="font-semibold text-white">{r.periode}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{formatDateIndo(r.tanggalPelaporan)}</p>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-blue-400 font-semibold">{r.targetProgres}%</td>
                          <td className="py-3 px-3 text-center font-mono text-emerald-400 font-extrabold text-sm">{r.realisasiProgres}%</td>
                          <td className="py-3 px-3 text-center font-mono font-bold whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded ${
                              r.selisih < 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {r.selisih > 0 ? `+${r.selisih}%` : `${r.selisih}%`}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-sm">
                            <p className="text-white font-medium">{r.deskripsiPekerjaan}</p>
                            {r.kendala && (
                              <p className="text-red-300 text-[11px] mt-0.5">⚠️ Kendala: {r.kendala}</p>
                            )}
                            {r.tindakLanjut && (
                              <p className="text-teal-300 text-[11px] mt-0.5">💡 Tindak Lanjut: {r.tindakLanjut}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap">{r.picPelapor}</td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold">
                              {r.statusVerifikasi}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(r)}
                                title="Edit catatan progres fisik"
                                className="p-1.5 rounded-lg bg-[#18294e] hover:bg-orange-500 hover:text-white text-orange-400 border border-[#2b447e] transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(r.id)}
                                title="Hapus catatan progres fisik"
                                className="p-1.5 rounded-lg bg-[#18294e] hover:bg-red-500 hover:text-white text-red-400 border border-[#2b447e] transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5B. REKAPITULASI TRIWULAN VIEW (Q1, Q2, Q3, Q4 Comparison) */}
      {viewMode === 'quarter-breakdown' && (
        <div className="space-y-5">
          <div className="bg-[#111e3f] border border-[#203463] p-5 rounded-2xl shadow-xl">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-orange-400" />
              <span>Rekapitulasi Realisasi Progres Fisik per Triwulan: {selectedProker?.kodeProker}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Evaluasi target vs realisasi setiap triwulan (Q1, Q2, Q3, Q4) beserta akumulasi deviasi
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterType[]).map((q) => {
                const stat = quarterStats[q];
                return (
                  <div key={q} className="bg-[#0d1733] border border-[#1f3360] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white">{QUARTER_WEEKS[q].label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          stat.status === 'Terdepan' ? 'bg-teal-500/20 text-teal-400' :
                          stat.status === 'Terlambat' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {stat.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Bulan: {QUARTER_WEEKS[q].months.join(' - ')}</p>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Target Akhir:</span>
                          <span className="font-mono font-bold text-blue-400">{stat.targetAkhir}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Realisasi Fisik:</span>
                          <span className="font-mono font-extrabold text-emerald-400 text-sm">
                            {stat.realisasiAkhir > 0 ? `${stat.realisasiAkhir}%` : 'Belum Ada'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Deviasi:</span>
                          <span className={`font-mono font-bold ${stat.deviasi < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {stat.deviasi > 0 ? `+${stat.deviasi}%` : `${stat.deviasi}%`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1c2c54] flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">{stat.count} Log Tercatat</span>
                      <button
                        onClick={() => {
                          setSelectedQuarter(q);
                          setViewMode('detail');
                        }}
                        className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
                      >
                        Buka Detail →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5C. MATRIX VIEW: ALL PROKERS TABLE */}
      {viewMode === 'matrix' && (
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-[#0d1733] border-b border-[#1c2c54] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-orange-400" />
                <span>
                  Matriks Progres Fisik Seluruh Proker {filterTahun === 'Semua' ? 'Semua Tahun' : `Tahun Anggaran ${filterTahun}`} ({searchFilteredProkers.length} Proker)
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring komprehensif capaian target vs realisasi dan deviasi fisik
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0b1429] border-b border-[#1c2c54] text-slate-300 select-none">
                  <th className="py-3 px-3 font-bold text-center w-12">TA</th>
                  <th className="py-3 px-3 font-bold">KODE & PROGRAM KERJA</th>
                  <th className="py-3 px-3 font-bold">DIREKTORAT / PIC</th>
                  <th className="py-3 px-3 font-bold text-center">TARGET</th>
                  <th className="py-3 px-3 font-bold text-center">REALISASI</th>
                  <th className="py-3 px-3 font-bold min-w-[160px]">PROGRESS BAR</th>
                  <th className="py-3 px-3 font-bold text-center">DEVIASI</th>
                  <th className="py-3 px-3 font-bold text-center">STATUS</th>
                  <th className="py-3 px-3 font-bold text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2c54]/70">
                {searchFilteredProkers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Tidak ada program kerja yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  searchFilteredProkers.map((p) => {
                    const deviasi = +((p.progresFisik || 0) - (p.targetProgresFisik || 0)).toFixed(1);
                    return (
                      <tr key={p.id} className="hover:bg-[#18294e]/70 transition-colors">
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                          {p.tahunAnggaran}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-blue-400 block">{p.kodeProker}</span>
                          <span className="text-white font-medium max-w-xs truncate block">{p.namaProker}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-300 block">{p.direktorat}</span>
                          <span className="text-[11px] text-slate-400 block">{p.ownerPic}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-blue-400 font-bold">
                          {p.targetProgresFisik}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold text-sm">
                          {p.progresFisik}%
                        </td>
                        <td className="py-3 px-3">
                          <div className="w-full bg-[#0d1733] rounded-full h-2.5 overflow-hidden border border-[#213565]">
                            <div
                              className="bg-emerald-500 h-2.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, p.progresFisik || 0)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={deviasi < 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {deviasi > 0 ? `+${deviasi}%` : `${deviasi}%`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            p.statusJadwal === 'Terlambat'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {p.statusJadwal}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedProkerId(p.id);
                              setViewMode('detail');
                            }}
                            className="px-2.5 py-1 rounded bg-[#18294e] hover:bg-orange-500 hover:text-white text-blue-300 text-[11px] font-semibold transition-colors"
                          >
                            Detail Progres
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. CREATE / EDIT MODAL (Input Target Mingguan W1..W52 & Realisasi per Triwulan) */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>{editingRecord ? 'Edit Catatan Progres Fisik' : 'Catat Laporan Progres Fisik Mingguan'}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Input target mingguan (W1, W2, dst.) dan realisasi fisik yang dikelompokkan per triwulan
                </p>
              </div>
              <button
                onClick={() => {
                  setShowLogModal(false);
                  setEditingRecord(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              {/* Year & Cascading Proker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0d1733] border border-[#213565] p-3 rounded-xl">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tahun Anggaran *</label>
                  <select
                    value={formTahun}
                    onChange={(e) => {
                      const yr = parseInt(e.target.value);
                      setFormTahun(yr);
                      const matching = workPrograms.filter((p) => p.tahunAnggaran === yr);
                      if (matching.length > 0) {
                        setFormProkerId(matching[0].id);
                        setFormTarget(matching[0].targetProgresFisik || 50);
                        setFormRealisasi(matching[0].progresFisik || 45);
                      }
                    }}
                    className="w-full bg-[#111e3f] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Tahun {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Program Kerja *</label>
                  <select
                    value={formProkerId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setFormProkerId(pid);
                      const p = workPrograms.find((w) => w.id === pid);
                      if (p) {
                        setFormTarget(p.targetProgresFisik || 50);
                        setFormRealisasi(p.progresFisik || 45);
                      }
                    }}
                    className="w-full bg-[#111e3f] border border-[#213565] rounded-lg p-2 text-white"
                  >
                    {prokersForFormTahun.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.kodeProker} - {p.namaProker}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Triwulan (Quarter), Minggu Ke-, dan Bulan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0d1733] border border-[#213565] p-3 rounded-xl">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Triwulan (Quarter) *</label>
                  <select
                    value={formQuarter}
                    onChange={(e) => {
                      const q = e.target.value as QuarterType;
                      setFormQuarter(q);
                      setFormMingguKe(QUARTER_WEEKS[q].min);
                      setFormBulan(QUARTER_WEEKS[q].months[0]);
                    }}
                    className="w-full bg-[#111e3f] border border-[#213565] rounded-lg p-2 text-white font-bold text-orange-400"
                  >
                    <option value="Q1">Q1 (Triwulan I · Jan-Mar)</option>
                    <option value="Q2">Q2 (Triwulan II · Apr-Jun)</option>
                    <option value="Q3">Q3 (Triwulan III · Jul-Sep)</option>
                    <option value="Q4">Q4 (Triwulan IV · Okt-Des)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minggu Ke- (W) *</label>
                  <select
                    value={formMingguKe}
                    onChange={(e) => {
                      const wk = parseInt(e.target.value);
                      setFormMingguKe(wk);
                      setFormQuarter(getQuarterFromWeek(wk));
                    }}
                    className="w-full bg-[#111e3f] border border-[#213565] rounded-lg p-2 text-white font-mono font-bold"
                  >
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((wk) => {
                      const q = getQuarterFromWeek(wk);
                      return (
                        <option key={wk} value={wk}>
                          W{wk} ({q})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bulan Pelaporan *</label>
                  <select
                    value={formBulan}
                    onChange={(e) => setFormBulan(e.target.value)}
                    className="w-full bg-[#111e3f] border border-[#213565] rounded-lg p-2 text-white font-semibold"
                  >
                    {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tanggal Pelaporan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tanggal Pelaporan *</label>
                <input
                  type="date"
                  required
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                />
              </div>

              {/* Target & Realisasi Mingguan dengan Live Deviasi */}
              <div className="grid grid-cols-3 gap-3 bg-[#0d1733] border border-[#213565] p-3 rounded-xl items-center">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Fisik (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={formTarget}
                    onChange={(e) => setFormTarget(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111e3f] border border-[#213565] rounded-lg p-2 text-blue-400 font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Realisasi Fisik (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={formRealisasi}
                    onChange={(e) => setFormRealisasi(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111e3f] border border-[#213565] rounded-lg p-2 text-emerald-400 font-mono font-extrabold text-center text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Selisih Deviasi</label>
                  <div className={`p-2 rounded-lg font-mono font-bold text-center border ${
                    (formRealisasi - formTarget) < 0
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {(formRealisasi - formTarget) > 0 ? '+' : ''}{(formRealisasi - formTarget).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Uraian / Deskripsi Pekerjaan Fisik *</label>
                <textarea
                  rows={2}
                  required
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  placeholder="Rincian pekerjaan fisik yang dicapai pada minggu ini (W1, W2, dst.)..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kendala di Lapangan</label>
                  <input
                    type="text"
                    value={formKendala}
                    onChange={(e) => setFormKendala(e.target.value)}
                    placeholder="Kendala cuaca, suplai material, perizinan..."
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tindak Lanjut / Solusi</label>
                  <input
                    type="text"
                    value={formTindakLanjut}
                    onChange={(e) => setFormTindakLanjut(e.target.value)}
                    placeholder="Rencana tindak lanjut percepatan..."
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tautan / Nama Berkas Dokumentasi (Opsional)</label>
                <input
                  type="text"
                  value={formBuktiUrl}
                  onChange={(e) => setFormBuktiUrl(e.target.value)}
                  placeholder="Contoh: Laporan_Mingguan_W4_Selesai.pdf atau foto dokumentasi..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => {
                    setShowLogModal(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg hover:bg-[#203666]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingRecord ? 'Perbarui Progres' : 'Simpan Progres Fisik'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-red-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-full bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Catatan Progres Fisik?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Apakah Anda yakin ingin menghapus data pelaporan progres fisik ini? Persentase progres terakhir pada program kerja akan disesuaikan otomatis dengan catatan sebelumnya.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1c2c54]">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-[#18294e] hover:bg-[#223a6d] text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                Ya, Hapus Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

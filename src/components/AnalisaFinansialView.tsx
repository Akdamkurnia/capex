import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  CheckCircle,
  AlertCircle,
  XCircle,
  Save,
  RotateCcw,
  Sparkles,
  Download,
  Printer,
  Table as TableIcon,
  Calculator,
  Layers,
  HelpCircle,
  Search,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Percent,
  Clock,
  Coins,
  Check,
  Building2,
  FileCheck2,
  BarChart3
} from 'lucide-react';
import { FinancialAnalysisFSBC, WorkProgram, User, FeasibilityStatus } from '../types';
import { formatRupiah, formatRupiahExact, formatPercentage } from '../utils/formatters';

interface AnalisaFinansialViewProps {
  analyses: FinancialAnalysisFSBC[];
  workPrograms: WorkProgram[];
  currentUser: User;
  onRefresh: () => void;
  onSaveAnalysis: (data: Partial<FinancialAnalysisFSBC>) => Promise<void>;
  onViewDocument?: (docId: string) => void;
}

// Numerical IRR Solver (Bisection method)
function calculateIRR(cfs: number[]): number {
  if (!cfs || cfs.length < 2) return 0;
  const initial = cfs[0];
  const inflows = cfs.slice(1);
  const hasPositive = inflows.some((c) => c > 0);
  if (initial >= 0 || !hasPositive) return 0;

  const npvAt = (r: number): number => {
    let sum = initial;
    for (let t = 0; t < inflows.length; t++) {
      sum += inflows[t] / Math.pow(1 + r, t + 1);
    }
    return sum;
  };

  let low = -0.90;
  let high = 5.0;
  let npvLow = npvAt(low);
  let npvHigh = npvAt(high);

  if (npvLow * npvHigh > 0) {
    high = 15.0;
    npvHigh = npvAt(high);
    if (npvLow * npvHigh > 0) {
      return 0;
    }
  }

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const npvMid = npvAt(mid);
    if (Math.abs(npvMid) < 1) return mid * 100;
    if (npvMid > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return ((low + high) / 2) * 100;
}

export const AnalisaFinansialView: React.FC<AnalisaFinansialViewProps> = ({
  analyses,
  workPrograms,
  currentUser,
  onRefresh,
  onSaveAnalysis
}) => {
  // Navigation / View modes
  const [activeTab, setActiveTab] = useState<'excel-input' | 'dashboard-eval' | 'all-prokers'>('excel-input');

  // Filter & Proker selection
  const [yearFilter, setYearFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProkerId, setSelectedProkerId] = useState<string>(
    workPrograms[0]?.id || ''
  );

  // Available years from workPrograms
  const availableYears = useMemo(() => {
    const yrs = Array.from(new Set(workPrograms.map(p => p.tahunAnggaran))).sort((a, b) => b - a);
    return yrs;
  }, [workPrograms]);

  // Filtered prokers
  const filteredProkers = useMemo(() => {
    return workPrograms.filter(p => {
      const matchYear = yearFilter === 'Semua' || p.tahunAnggaran.toString() === yearFilter;
      const matchQuery = !searchQuery || 
        p.kodeProker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.namaProker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ownerPic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.direktorat.toLowerCase().includes(searchQuery.toLowerCase());
      return matchYear && matchQuery;
    });
  }, [workPrograms, yearFilter, searchQuery]);

  const selectedProker = useMemo(() => {
    return workPrograms.find(p => p.id === selectedProkerId) || workPrograms[0];
  }, [workPrograms, selectedProkerId]);

  // Find saved analysis for selected proker
  const savedAnalysis = useMemo(() => {
    return analyses.find(a => a.prokerId === selectedProker?.id);
  }, [analyses, selectedProker]);

  // FORM / CALCULATION STATE (per proker)
  const [investasiAwal, setInvestasiAwal] = useState<number>(100_000_000);
  const [discountRate, setDiscountRate] = useState<number>(10.0);
  const [periodeAnalisis, setPeriodeAnalisis] = useState<number>(5);
  const [biayaTetap, setBiayaTetap] = useState<number>(20_000_000);
  const [hargaJualPerUnit, setHargaJualPerUnit] = useState<number>(100_000);
  const [biayaVariabelPerUnit, setBiayaVariabelPerUnit] = useState<number>(60_000);
  const [arusKasTahunan, setArusKasTahunan] = useState<number[]>([
    30_000_000, 30_000_000, 30_000_000, 30_000_000, 30_000_000, 0, 0, 0, 0, 0
  ]);
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [manualStatusOverride, setManualStatusOverride] = useState<FeasibilityStatus | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Initialize form whenever selectedProker or savedAnalysis changes
  useEffect(() => {
    if (!selectedProker) return;

    if (savedAnalysis) {
      setInvestasiAwal(savedAnalysis.investasiAwal || (savedAnalysis.biayaInvestasiTotal * 1_000_000_000) || 100_000_000);
      setDiscountRate(savedAnalysis.discountRate || 10.0);
      setPeriodeAnalisis(savedAnalysis.periodeAnalisis || 5);
      setBiayaTetap(savedAnalysis.biayaTetap || 20_000_000);
      setHargaJualPerUnit(savedAnalysis.hargaJualPerUnit || 100_000);
      setBiayaVariabelPerUnit(savedAnalysis.biayaVariabelPerUnit || 60_000);
      if (Array.isArray(savedAnalysis.arusKasTahunan) && savedAnalysis.arusKasTahunan.length > 0) {
        const full10 = [...savedAnalysis.arusKasTahunan];
        while (full10.length < 10) full10.push(0);
        setArusKasTahunan(full10.slice(0, 10));
      } else if (savedAnalysis.proyeksiArusKas && savedAnalysis.proyeksiArusKas.length > 0) {
        const mapped = savedAnalysis.proyeksiArusKas.map(c => (c.arusKasBersih > 0 ? c.arusKasBersih * 1_000_000_000 : c.arusKasMasuk * 1_000_000_000));
        while (mapped.length < 10) mapped.push(0);
        setArusKasTahunan(mapped.slice(0, 10));
      } else {
        setArusKasTahunan([30_000_000, 30_000_000, 30_000_000, 30_000_000, 30_000_000, 0, 0, 0, 0, 0]);
      }
      setReviewerNotes(savedAnalysis.catatanReviewer || '');
      setManualStatusOverride(savedAnalysis.statusKelayakan);
    } else {
      // Initialize smartly based on proker CAPEX
      const capexInRp = Math.round((selectedProker.nilaiCapexRkap || 0.1) * 1_000_000_000);
      const initialInvest = capexInRp > 0 ? capexInRp : 100_000_000;
      setInvestasiAwal(initialInvest);
      setDiscountRate(10.0);
      setPeriodeAnalisis(5);

      // Reasonable default operational assumptions
      const defaultBiayaTetap = Math.round(initialInvest * 0.15);
      const defaultHarga = 100_000;
      const defaultBiayaVar = 60_000;
      setBiayaTetap(defaultBiayaTetap);
      setHargaJualPerUnit(defaultHarga);
      setBiayaVariabelPerUnit(defaultBiayaVar);

      // Default yearly cashflow: ~30% of investment per year for 5 years
      const yearlyCF = Math.round(initialInvest * 0.30);
      setArusKasTahunan([yearlyCF, yearlyCF, yearlyCF, yearlyCF, yearlyCF, 0, 0, 0, 0, 0]);
      setReviewerNotes('');
      setManualStatusOverride(null);
    }
  }, [selectedProker?.id, savedAnalysis]);

  // LIVE CALCULATIONS
  const calculations = useMemo(() => {
    const P = Math.min(Math.max(1, periodeAnalisis), 10);
    const validArusKas = arusKasTahunan.slice(0, P);

    // 1. Total Arus Kas Masuk
    const totalArusKasMasuk = validArusKas.reduce((acc, val) => acc + (val || 0), 0);

    // 2. ROI Total = (Total Arus Kas Masuk - Investasi Awal) / Investasi Awal
    const roiTotal = investasiAwal > 0 
      ? ((totalArusKasMasuk - investasiAwal) / investasiAwal) * 100 
      : 0;

    // 3. Cash Flow & PV Table
    // PV Factor = 1 / (1 + r)^t
    const r = discountRate / 100;
    const pvRows = [];

    // Year 0
    pvRows.push({
      tahun: 0,
      cashFlow: -investasiAwal,
      pvFactor: 1.0000,
      pv: -investasiAwal
    });

    let totalPVInflows = 0;
    for (let t = 1; t <= P; t++) {
      const cf = validArusKas[t - 1] || 0;
      const factor = 1 / Math.pow(1 + r, t);
      const pv = cf * factor;
      totalPVInflows += pv;
      pvRows.push({
        tahun: t,
        cashFlow: cf,
        pvFactor: factor,
        pv: pv
      });
    }

    // 4. NPV = Total PV Inflows - Investasi Awal
    const npv = totalPVInflows - investasiAwal;

    // 5. IRR
    const irrFlows = [-investasiAwal, ...validArusKas];
    const irr = calculateIRR(irrFlows);

    // 6. Payback sederhana (tahun) = Investasi Awal / (Total Arus Kas Masuk / P)
    const avgYearlyInflow = P > 0 ? totalArusKasMasuk / P : 0;
    const paybackSederhana = avgYearlyInflow > 0 ? (investasiAwal / avgYearlyInflow) : 0;

    // 7. BEP Calculations
    const marginKontribusi = hargaJualPerUnit - biayaVariabelPerUnit;
    const bepUnit = marginKontribusi > 0 ? biayaTetap / marginKontribusi : 0;
    const rasioMargin = hargaJualPerUnit > 0 ? (1 - (biayaVariabelPerUnit / hargaJualPerUnit)) : 0;
    const bepNilaiPenjualan = rasioMargin > 0 ? biayaTetap / rasioMargin : 0;

    // 8. Evaluation Criteria Matching User Request:
    // ROI: Positif -> Investasi menghasilkan keuntungan bersih menurut periode perhitungan
    const roiPass = roiTotal > 0;
    // NPV: Lebih dari 0 -> Nilai proyek bertambah setelah memperhitungkan discount rate
    const npvPass = npv > 0;
    // IRR: Lebih tinggi dari discount rate -> Tingkat pengembalian proyek melampaui tingkat minimum yang disyaratkan
    const irrPass = irr > discountRate;
    // BEP: Semakin cepat tercapai -> Semakin cepat pendapatan kumulatif menutup biaya atau investasi
    const bepPass = bepUnit > 0 && bepUnit < 1_000_000_000;

    const passedCount = [roiPass, npvPass, irrPass, bepPass].filter(Boolean).length;
    let autoStatus: FeasibilityStatus = 'Tidak Layak';
    if (passedCount === 4 && roiPass && npvPass) {
      autoStatus = 'Layak';
    } else if (roiPass && npvPass) {
      autoStatus = 'Layak dengan Catatan';
    } else if (passedCount >= 2) {
      autoStatus = 'Layak dengan Catatan';
    } else {
      autoStatus = 'Tidak Layak';
    }

    const finalStatus = manualStatusOverride || autoStatus;

    return {
      P,
      totalArusKasMasuk,
      roiTotal,
      npv,
      irr,
      paybackSederhana,
      bepUnit,
      bepNilaiPenjualan,
      pvRows,
      totalPVInflows,
      roiPass,
      npvPass,
      irrPass,
      bepPass,
      passedCount,
      autoStatus,
      finalStatus
    };
  }, [
    investasiAwal,
    discountRate,
    periodeAnalisis,
    biayaTetap,
    hargaJualPerUnit,
    biayaVariabelPerUnit,
    arusKasTahunan,
    manualStatusOverride
  ]);

  // Handle saving this proker's analysis
  const handleSaveCurrentAnalysis = async () => {
    if (!selectedProker) return;
    setIsSaving(true);
    setSaveSuccessMsg(false);

    try {
      const payload: Partial<FinancialAnalysisFSBC> = {
        prokerId: selectedProker.id,
        kodeProker: selectedProker.kodeProker,
        namaProker: selectedProker.namaProker,
        investasiAwal,
        discountRate,
        periodeAnalisis,
        biayaTetap,
        hargaJualPerUnit,
        biayaVariabelPerUnit,
        bepUnit: Math.round(calculations.bepUnit),
        bepNilaiPenjualan: Math.round(calculations.bepNilaiPenjualan),
        arusKasTahunan,
        totalArusKasMasuk: calculations.totalArusKasMasuk,
        roi: parseFloat(calculations.roiTotal.toFixed(2)),
        npv: Math.round(calculations.npv),
        irr: parseFloat(calculations.irr.toFixed(2)),
        paybackPeriodTahun: parseFloat(calculations.paybackSederhana.toFixed(2)),
        breakEvenPoint: Math.round(calculations.bepNilaiPenjualan),
        biayaInvestasiTotal: investasiAwal / 1_000_000_000,
        totalManfaatFinansial: calculations.totalArusKasMasuk / 1_000_000_000,
        statusKelayakan: calculations.finalStatus,
        catatanReviewer: reviewerNotes,
        asumsiBisnis: [
          `Investasi awal Rp ${formatRupiahExact(investasiAwal)} dengan discount rate ${discountRate}%`,
          `Target BEP: ${Math.round(calculations.bepUnit).toLocaleString('id-ID')} unit (Rp ${formatRupiahExact(calculations.bepNilaiPenjualan)})`,
          `Estimasi arus kas masuk rata-rata Rp ${formatRupiahExact(calculations.totalArusKasMasuk / periodeAnalisis)} per tahun`
        ],
        risikoInvestasi: [
          'Sensitivitas tingkat suku bunga dan discount rate WACC',
          'Ketercapaian volume transaksi dan penyerapan pasar'
        ],
        proyeksiArusKas: calculations.pvRows.map(r => ({
          tahun: selectedProker.tahunAnggaran + r.tahun,
          arusKasMasuk: r.cashFlow > 0 ? r.cashFlow / 1_000_000_000 : 0,
          arusKasKeluar: r.cashFlow < 0 ? Math.abs(r.cashFlow) / 1_000_000_000 : 0,
          arusKasBersih: r.cashFlow / 1_000_000_000,
          arusKasKumulatif: 0,
          pvFactor: r.pvFactor,
          pv: r.pv
        }))
      };

      await onSaveAnalysis(payload);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
      onRefresh();
    } catch (err) {
      console.error('Error saving analysis:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: Synchronize with Proker's CAPEX
  const handleSyncWithCapex = () => {
    if (!selectedProker) return;
    const capexInRp = Math.round((selectedProker.nilaiCapexRkap || 0) * 1_000_000_000);
    if (capexInRp > 0) {
      setInvestasiAwal(capexInRp);
      const defaultBiayaTetap = Math.round(capexInRp * 0.15);
      setBiayaTetap(defaultBiayaTetap);
      const yearlyCF = Math.round(capexInRp * 0.28);
      const newCFs = [...arusKasTahunan];
      for (let i = 0; i < periodeAnalisis; i++) {
        newCFs[i] = yearlyCF;
      }
      setArusKasTahunan(newCFs);
    }
  };

  // Preset: Template Excel (Rp 100 Jt, Rp 30 Jt CF)
  const handleApplyExcelTemplatePreset = () => {
    setInvestasiAwal(100_000_000);
    setDiscountRate(10.0);
    setPeriodeAnalisis(5);
    setBiayaTetap(20_000_000);
    setHargaJualPerUnit(100_000);
    setBiayaVariabelPerUnit(60_000);
    setArusKasTahunan([30_000_000, 30_000_000, 30_000_000, 30_000_000, 30_000_000, 0, 0, 0, 0, 0]);
  };

  // Preset: Bertumbuh +5% per tahun
  const handleApplyGrowthPreset = () => {
    const baseCF = arusKasTahunan[0] || Math.round(investasiAwal * 0.25);
    const newCFs = [...arusKasTahunan];
    let current = baseCF;
    for (let i = 0; i < periodeAnalisis; i++) {
      newCFs[i] = Math.round(current);
      current *= 1.05;
    }
    setArusKasTahunan(newCFs);
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['ANALISA FINANSIAL FS-BC PROGRAM KERJA INVESTASI PT POS INDONESIA'],
      ['Program Kerja', selectedProker?.namaProker || ''],
      ['Kode Proker', selectedProker?.kodeProker || ''],
      ['Tahun Anggaran', selectedProker?.tahunAnggaran?.toString() || ''],
      ['Investasi Awal (Rp)', investasiAwal.toString()],
      ['Discount Rate (%)', discountRate.toString()],
      ['Periode Analisis (Tahun)', periodeAnalisis.toString()],
      ['Biaya Tetap (Rp)', biayaTetap.toString()],
      ['Harga Jual per Unit (Rp)', hargaJualPerUnit.toString()],
      ['Biaya Variabel per Unit (Rp)', biayaVariabelPerUnit.toString()],
      ['BEP Unit', calculations.bepUnit.toFixed(2)],
      ['BEP Penjualan (Rp)', calculations.bepNilaiPenjualan.toFixed(2)],
      ['Total Arus Kas Masuk (Rp)', calculations.totalArusKasMasuk.toString()],
      ['ROI Total (%)', calculations.roiTotal.toFixed(2)],
      ['NPV (Rp)', calculations.npv.toFixed(2)],
      ['IRR (%)', calculations.irr.toFixed(2)],
      ['Payback Sederhana (Tahun)', calculations.paybackSederhana.toFixed(2)],
      ['Status Kelayakan', calculations.finalStatus],
      [],
      ['Tahun', 'Cash Flow (Rp)', 'PV Factor', 'PV (Rp)']
    ];

    calculations.pvRows.forEach(r => {
      rows.push([
        r.tahun.toString(),
        r.cashFlow.toString(),
        r.pvFactor.toFixed(4),
        r.pv.toFixed(2)
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Analisa_Finansial_${selectedProker?.kodeProker || 'Proker'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Proker Selection Card */}
      <div className="bg-[#111e3f] border border-[#203463] p-5 rounded-2xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#203463]/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Calculator className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Modul Input Analisa Finansial FS-BC</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">
                    Hitungan per Proker
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Input asumsi investasi, proyeksi arus kas 1–10 tahun, perhitungan BEP, evaluasi kelayakan (ROI, NPV, IRR, BEP) sesuai standar PT Pos Indonesia
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncWithCapex}
              title="Gunakan nilai CAPEX RKAP program kerja ini sebagai investasi awal"
              className="px-3 py-2 rounded-xl bg-[#18294e] hover:bg-[#203666] border border-[#2b447e] text-xs font-semibold text-blue-300 inline-flex items-center gap-1.5 transition-all"
            >
              <Coins className="w-3.5 h-3.5 text-orange-400" />
              <span>Gunakan Nilai CAPEX Proker</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-[#18294e] hover:bg-[#203666] border border-[#2b447e] text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Unduh CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-[#18294e] hover:bg-[#203666] border border-[#2b447e] text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={handleSaveCurrentAnalysis}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saveSuccessMsg ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saveSuccessMsg ? 'Tersimpan!' : 'Simpan Analisa Proker'}</span>
            </button>
          </div>
        </div>

        {/* Proker Selector & Filter Toolbar */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Year Filter */}
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tahun Anggaran</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full bg-[#142347] border border-[#223766] text-white text-xs rounded-xl p-2 font-medium focus:border-orange-500"
            >
              <option value="Semua">Semua Tahun</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr.toString()}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Search Proker */}
          <div className="md:col-span-3">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Cari Program Kerja</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Kode / nama / owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#142347] border border-[#223766] text-white text-xs rounded-xl focus:border-orange-500"
              />
            </div>
          </div>

          {/* Proker Dropdown */}
          <div className="md:col-span-7">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Pilih Program Kerja yang Dianalisa ({filteredProkers.length} Proker Tersedia):
            </label>
            <select
              value={selectedProkerId}
              onChange={(e) => setSelectedProkerId(e.target.value)}
              className="w-full bg-[#142347] border border-[#223766] text-white text-xs rounded-xl p-2 font-semibold text-blue-200 focus:border-orange-500"
            >
              {filteredProkers.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.tahunAnggaran}] {p.kodeProker} - {p.namaProker} (CAPEX: Rp {p.nilaiCapexRkap.toFixed(2)} M)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Proker Detail Banner */}
        {selectedProker && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#0d1733] border border-[#1b2b54] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono font-bold">
                  {selectedProker.kodeProker}
                </span>
                <span className="font-bold text-white text-sm">
                  {selectedProker.namaProker}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1e325c] text-slate-300 font-semibold">
                  Tahun {selectedProker.tahunAnggaran}
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">
                  BOSIE: {selectedProker.jenisBosie}
                </span>
              </div>
              <div className="text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                <span>Direktorat: <strong className="text-slate-200">{selectedProker.direktorat}</strong></span>
                <span>Owner: <strong className="text-slate-200">{selectedProker.ownerPic} ({selectedProker.ownerCategory})</strong></span>
                <span>Progres Fisik: <strong className="text-emerald-400">{selectedProker.progresFisik}%</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-[#142347] px-4 py-2 rounded-xl border border-[#223766] shrink-0">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Nilai CAPEX (RKAP)</p>
                <p className="text-sm font-extrabold text-orange-400 font-mono">
                  {formatRupiah(selectedProker.nilaiCapexRkap, 'miliar')}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  (Rp {formatRupiahExact(selectedProker.nilaiCapexRkap * 1_000_000_000)})
                </p>
              </div>
              <div className="border-l border-[#223766] pl-4">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Status Kelayakan</p>
                <div className="mt-0.5">
                  {calculations.finalStatus === 'Layak' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold inline-flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>LAYAK</span>
                    </span>
                  ) : calculations.finalStatus === 'Layak dengan Catatan' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold inline-flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>CATATAN</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold inline-flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>TIDAK LAYAK</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-[#203463] gap-2">
        <button
          onClick={() => setActiveTab('excel-input')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x ${
            activeTab === 'excel-input'
              ? 'bg-[#142347] border-[#223766] text-white border-b-transparent shadow'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <TableIcon className="w-4 h-4 text-amber-400" />
          <span>1. Input Asumsi & Proyeksi Arus Kas (Model Excel)</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard-eval')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x ${
            activeTab === 'dashboard-eval'
              ? 'bg-[#142347] border-[#223766] text-white border-b-transparent shadow'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>2. Tabel Cash Flow & PV, BEP & Kesimpulan Kelayakan</span>
        </button>

        <button
          onClick={() => setActiveTab('all-prokers')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x ${
            activeTab === 'all-prokers'
              ? 'bg-[#142347] border-[#223766] text-white border-b-transparent shadow'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>3. Rekapitulasi Analisa Finansial Semua Proker ({workPrograms.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODEL EXCEL (INPUT ASUMSI DAN PROYEKSI ARUS KAS - Images 1 & 2)     */}
      {/* ========================================================================= */}
      {activeTab === 'excel-input' && (
        <div className="space-y-6">
          {/* Quick Helper Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111e3f] p-3 rounded-xl border border-[#203463] text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Helper Proyeksi Cepat:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleApplyExcelTemplatePreset}
                className="px-2.5 py-1.5 rounded-lg bg-[#18294e] hover:bg-[#223869] border border-[#263e75] text-[11px] font-medium text-amber-300 transition-all"
              >
                Template Standar Excel (100 Jt / CF 30 Jt)
              </button>
              <button
                onClick={handleSyncWithCapex}
                className="px-2.5 py-1.5 rounded-lg bg-[#18294e] hover:bg-[#223869] border border-[#263e75] text-[11px] font-medium text-blue-300 transition-all"
              >
                Gunakan Nilai CAPEX Proker
              </button>
              <button
                onClick={handleApplyGrowthPreset}
                className="px-2.5 py-1.5 rounded-lg bg-[#18294e] hover:bg-[#223869] border border-[#263e75] text-[11px] font-medium text-emerald-300 transition-all"
              >
                Terapkan Pertumbuhan CF +5%/Tahun
              </button>
            </div>
          </div>

          {/* Main Excel Sheet Layout Container */}
          <div className="bg-[#ffffff] text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-300">
            {/* Excel Sheet Banner */}
            <div className="bg-[#0b1d46] text-white py-3.5 px-6 text-center border-b-2 border-[#f59e0b]">
              <h3 className="text-base sm:text-lg font-black tracking-wider uppercase font-sans">
                INPUT ASUMSI DAN PROYEKSI ARUS KAS
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Model Finansial Investasi Proker: {selectedProker?.kodeProker} - {selectedProker?.namaProker}
              </p>
            </div>

            {/* Excel Sheet Grid */}
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50">
              
              {/* LEFT COLUMN: Input Investasi, Proyeksi Arus Kas Bersih, Hasil Analisis */}
              <div className="space-y-6">
                
                {/* 1. INPUT INVESTASI */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="bg-[#0b1d46] text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wide">
                    INPUT INVESTASI
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 w-1/2">
                          Investasi awal (Rp)
                        </td>
                        <td className="py-2 px-3 bg-[#fef9c3] border-l border-slate-200 text-right">
                          <input
                            type="number"
                            value={investasiAwal}
                            onChange={(e) => setInvestasiAwal(parseFloat(e.target.value) || 0)}
                            className="w-full text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                          />
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {formatRupiahExact(investasiAwal)}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          Discount rate per tahun
                        </td>
                        <td className="py-2 px-3 bg-[#fef9c3] border-l border-slate-200 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={discountRate}
                              onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                              className="w-24 text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                            />
                            <span className="font-mono font-bold text-slate-700">%</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          Periode analisis (tahun)
                        </td>
                        <td className="py-2 px-3 bg-[#fef9c3] border-l border-slate-200 text-right">
                          <select
                            value={periodeAnalisis}
                            onChange={(e) => setPeriodeAnalisis(parseInt(e.target.value) || 5)}
                            className="font-mono font-bold text-slate-900 bg-transparent focus:outline-none text-right cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => (
                              <option key={y} value={y}>{y} Tahun</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. PROYEKSI ARUS KAS BERSIH (0 to 10) */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="bg-[#0b1d46] text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wide flex justify-between items-center">
                    <span>PROYEKSI ARUS KAS BERSIH</span>
                    <span className="text-[11px] font-normal text-amber-300">Sel Kuning = Input Editable</span>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200/80 text-slate-700 font-bold border-b border-slate-300">
                        <th className="py-2 px-4 text-center w-24">Periode</th>
                        <th className="py-2 px-4 text-right">Arus kas bersih (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {/* Periode 0 (Outflow -Investasi Awal) */}
                      <tr className="bg-slate-50">
                        <td className="py-2.5 px-4 text-center font-mono font-extrabold text-slate-900 border-r border-slate-200">
                          0
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-red-600">
                          -{formatRupiahExact(investasiAwal)}
                        </td>
                      </tr>

                      {/* Periode 1 s.d. 10 */}
                      {Array.from({ length: 10 }, (_, idx) => {
                        const yearNum = idx + 1;
                        const isActive = yearNum <= periodeAnalisis;
                        return (
                          <tr
                            key={yearNum}
                            className={isActive ? 'bg-white hover:bg-amber-50/50' : 'bg-slate-100/60 opacity-60'}
                          >
                            <td className="py-2 px-4 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                              {yearNum}
                            </td>
                            <td className={`py-1.5 px-3 text-right border-l border-slate-200 ${isActive ? 'bg-[#fef9c3]' : 'bg-slate-200/40'}`}>
                              <input
                                type="number"
                                value={arusKasTahunan[idx] ?? 0}
                                disabled={!isActive}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const next = [...arusKasTahunan];
                                  next[idx] = val;
                                  setArusKasTahunan(next);
                                }}
                                className="w-full text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                              />
                              <span className="block text-[9px] text-slate-500 font-mono">
                                {formatRupiahExact(arusKasTahunan[idx] ?? 0)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 3. HASIL ANALISIS INVESTASI */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="bg-[#0b1d46] text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wide">
                    HASIL ANALISIS INVESTASI
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 w-1/2">
                          Total arus kas masuk (Rp)
                        </td>
                        <td className="py-2 px-4 bg-[#dcfce7] border-l border-slate-200 text-right font-mono font-bold text-emerald-900">
                          {formatRupiahExact(calculations.totalArusKasMasuk)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          ROI total
                        </td>
                        <td className="py-2 px-4 bg-[#dcfce7] border-l border-slate-200 text-right font-mono font-bold text-emerald-900">
                          {calculations.roiTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          NPV (Rp)
                        </td>
                        <td className="py-2 px-4 bg-[#dcfce7] border-l border-slate-200 text-right font-mono font-bold text-emerald-900">
                          {formatRupiahExact(calculations.npv)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          IRR
                        </td>
                        <td className="py-2 px-4 bg-[#dcfce7] border-l border-slate-200 text-right font-mono font-bold text-emerald-900">
                          {calculations.irr.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          Payback sederhana (tahun)
                        </td>
                        <td className="py-2 px-4 bg-[#dcfce7] border-l border-slate-200 text-right font-mono font-bold text-emerald-900">
                          {calculations.paybackSederhana.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Thn
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

              {/* RIGHT COLUMN: Input BEP, Petunjuk, & Reviewer Decision */}
              <div className="space-y-6">
                
                {/* 1. INPUT BEP */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="bg-[#0b1d46] text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wide">
                    INPUT BEP (BREAK-EVEN POINT)
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 w-1/2">
                          Biaya tetap (Rp)
                        </td>
                        <td className="py-2 px-3 bg-[#fef9c3] border-l border-slate-200 text-right">
                          <input
                            type="number"
                            value={biayaTetap}
                            onChange={(e) => setBiayaTetap(parseFloat(e.target.value) || 0)}
                            className="w-full text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                          />
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {formatRupiahExact(biayaTetap)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          Harga jual per unit (Rp)
                        </td>
                        <td className="py-2 px-3 bg-[#fef9c3] border-l border-slate-200 text-right">
                          <input
                            type="number"
                            value={hargaJualPerUnit}
                            onChange={(e) => setHargaJualPerUnit(parseFloat(e.target.value) || 0)}
                            className="w-full text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                          />
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {formatRupiahExact(hargaJualPerUnit)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          Biaya variabel per unit (Rp)
                        </td>
                        <td className="py-2 px-3 bg-[#fef9c3] border-l border-slate-200 text-right">
                          <input
                            type="number"
                            value={biayaVariabelPerUnit}
                            onChange={(e) => setBiayaVariabelPerUnit(parseFloat(e.target.value) || 0)}
                            className="w-full text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                          />
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {formatRupiahExact(biayaVariabelPerUnit)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          BEP unit (unit)
                        </td>
                        <td className="py-2 px-4 bg-[#dcfce7] border-l border-slate-200 text-right font-mono font-bold text-emerald-900">
                          {calculations.bepUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Unit
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          BEP penjualan (Rp)
                        </td>
                        <td className="py-2 px-4 bg-[#dcfce7] border-l border-slate-200 text-right font-mono font-bold text-emerald-900">
                          {formatRupiahExact(calculations.bepNilaiPenjualan)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. PETUNJUK (Standard Reference from Excel template) */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="bg-[#0b1d46] text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>PETUNJUK PENGISIAN & RUMUS</span>
                  </div>
                  <div className="p-4 space-y-2.5 text-xs text-slate-700 bg-slate-50 leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="inline-block w-4 h-4 bg-[#fef9c3] border border-slate-400 rounded shrink-0 mt-0.5" />
                      <span><strong>Sel kuning</strong> = input yang dapat diubah sesuai proyeksi program kerja.</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 text-[11px] space-y-1.5">
                      <p>• <strong>Arus kas Tahun 1–10</strong> dapat disesuaikan per tahun proyeksi.</p>
                      <p>• <strong>Ubah periode analisis</strong> (maksimal 10 tahun) untuk mengatur batas waktu investasi.</p>
                      <p>• <strong>NPV memakai arus kas</strong> pada akhir tiap tahun yang didiskonto sesuai discount rate.</p>
                      <p>• <strong>ROI total</strong> = (total arus kas masuk – investasi awal) / investasi awal.</p>
                      <p>• <strong>Payback sederhana</strong> di sini adalah estimasi berbasis rata-rata arus kas, bukan payback kumulatif presisi.</p>
                      <p>• <strong>BEP memakai biaya tetap</strong> dan margin kontribusi per unit.</p>
                    </div>
                  </div>
                </div>

                {/* 3. Reviewer Notes & Action Box */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center justify-between">
                    <span>Catatan Telaah / Review FS-BC</span>
                    <span className="text-[10px] text-slate-500 font-normal">Disimpan bersama proker</span>
                  </h4>
                  <textarea
                    rows={3}
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Masukkan catatan kajian risiko, justifikasi WACC, atau rekomendasi komite investasi..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600 font-medium">Override Status:</span>
                      <select
                        value={manualStatusOverride || calculations.autoStatus}
                        onChange={(e) => setManualStatusOverride(e.target.value as FeasibilityStatus)}
                        className="text-xs p-1.5 border border-slate-300 rounded-md font-semibold bg-white"
                      >
                        <option value="Layak">Layak</option>
                        <option value="Layak dengan Catatan">Layak dengan Catatan</option>
                        <option value="Tidak Layak">Tidak Layak</option>
                      </select>
                    </div>

                    <button
                      onClick={handleSaveCurrentAnalysis}
                      disabled={isSaving}
                      className="px-4 py-2 bg-[#0b1d46] hover:bg-[#163172] text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isSaving ? 'Menyimpan...' : 'Simpan Analisa Proker'}</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TABEL CASH FLOW & PV, PERHITUNGAN BEP, & KESIMPULAN (Image 3)      */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard-eval' && (
        <div className="space-y-6">
          {/* Top 3 Columns: Tabel Cash Flow & PV | Perhitungan BEP | Rumus Yang Digunakan */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* COLUMN 1: TABEL CASH FLOW & PV (lg:col-span-6) */}
            <div className="lg:col-span-6 bg-[#111e3f] border border-[#203463] rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-5 py-3.5 bg-[#0d1733] border-b border-[#203463] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      TABEL CASH FLOW & PV
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-orange-400">
                    Discount: {discountRate}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#142347] border-b border-[#203463] text-slate-300 font-bold">
                        <th className="py-2.5 px-4 text-center">Tahun</th>
                        <th className="py-2.5 px-4 text-right">Cash Flow (Rp)</th>
                        <th className="py-2.5 px-4 text-right">PV Factor ({discountRate}%)</th>
                        <th className="py-2.5 px-4 text-right">PV (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#203463]/70 font-mono">
                      {calculations.pvRows.map((r) => {
                        const isZero = r.tahun === 0;
                        return (
                          <tr
                            key={r.tahun}
                            className={isZero ? 'bg-[#0d1733]/90 font-bold' : 'hover:bg-[#18294e]/60'}
                          >
                            <td className="py-2 px-4 text-center text-white">
                              {r.tahun}
                            </td>
                            <td className={`py-2 px-4 text-right tabular-nums ${r.cashFlow < 0 ? 'text-red-400' : 'text-slate-100'}`}>
                              {formatRupiahExact(r.cashFlow)}
                            </td>
                            <td className="py-2 px-4 text-right text-slate-300 tabular-nums">
                              {r.pvFactor.toFixed(4).replace('.', ',')}
                            </td>
                            <td className={`py-2 px-4 text-right tabular-nums ${r.pv < 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                              {formatRupiahExact(r.pv)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Summary Bar for PV */}
              <div className="p-3.5 bg-[#0b142c] border-t border-[#203463] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-slate-400 italic">
                  Catatan: PV menggunakan discount rate {discountRate}% (dapat disesuaikan).
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-semibold">Total PV:</span>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    {formatRupiahExact(calculations.totalPVInflows)}
                  </span>
                </div>
              </div>
            </div>

            {/* COLUMN 2: PERHITUNGAN BEP (lg:col-span-3) */}
            <div className="lg:col-span-3 bg-[#111e3f] border border-[#203463] rounded-2xl shadow-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-[#203463]">
                  <LineChartIcon className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    PERHITUNGAN BEP
                  </h3>
                </div>

                <div className="mt-4 space-y-5">
                  {/* BEP Unit Card */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-200">BEP Unit</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      = Biaya Tetap / (Harga Jual - Biaya Variabel)
                    </p>
                    <div className="mt-2 py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center">
                      <span className="text-2xl font-black text-emerald-400 font-mono">
                        {Math.round(calculations.bepUnit).toLocaleString('id-ID')} Unit
                      </span>
                    </div>
                  </div>

                  {/* BEP Nilai Penjualan Card */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-200">BEP Nilai Penjualan</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      = Biaya Tetap / (1 - (Biaya Variabel / Harga Jual))
                    </p>
                    <div className="mt-2 py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center">
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {formatRupiahExact(calculations.bepNilaiPenjualan)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-[#0d1733] border border-[#1d2e58] text-[10px] text-slate-400 leading-tight">
                Margin Kontribusi per unit: <strong className="text-emerald-400 font-mono">Rp {formatRupiahExact(hargaJualPerUnit - biayaVariabelPerUnit)}</strong>
              </div>
            </div>

            {/* COLUMN 3: RUMUS YANG DIGUNAKAN (lg:col-span-3) */}
            <div className="lg:col-span-3 bg-[#111e3f] border border-[#203463] rounded-2xl shadow-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-[#203463]">
                  <Calculator className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    RUMUS YANG DIGUNAKAN
                  </h3>
                </div>

                <div className="mt-3 space-y-2.5 text-[11px] text-slate-300">
                  <div className="p-2 rounded-lg bg-[#0d1733] border border-[#1d2e58]">
                    <span className="font-bold text-amber-400 block mb-0.5">ROI</span>
                    <span className="font-mono text-slate-300 text-[10px] block">
                      = (Total Cash Flow - Investasi Awal) / Investasi Awal
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#0d1733] border border-[#1d2e58]">
                    <span className="font-bold text-emerald-400 block mb-0.5">NPV</span>
                    <span className="font-mono text-slate-300 text-[10px] block">
                      = NPV(Discount Rate; Cash Flow) - Investasi Awal
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#0d1733] border border-[#1d2e58]">
                    <span className="font-bold text-blue-400 block mb-0.5">IRR</span>
                    <span className="font-mono text-slate-300 text-[10px] block">
                      = IRR(Arus Kas Bersih 0..T)
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#0d1733] border border-[#1d2e58]">
                    <span className="font-bold text-cyan-400 block mb-0.5">PV Factor</span>
                    <span className="font-mono text-slate-300 text-[10px] block">
                      = Cash Flow / (1 + Discount Rate)^T
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#0d1733] border border-[#1d2e58]">
                    <span className="font-bold text-orange-400 block mb-0.5">BEP Unit & Nilai</span>
                    <span className="font-mono text-slate-300 text-[10px] block">
                      BEP Unit = Biaya Tetap / (Harga Jual - Biaya Var)
                    </span>
                    <span className="font-mono text-slate-300 text-[10px] block mt-0.5">
                      BEP Nilai = Biaya Tetap / (1 - (Biaya Var / Harga))
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM FULL-WIDTH CARD: KESIMPULAN KELAYAKAN INVESTASI (Image 3 Bottom)   */}
          {/* ========================================================================= */}
          <div className="bg-[#111e3f] border border-[#203463] rounded-2xl shadow-2xl p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>KESIMPULAN KELAYAKAN INVESTASI</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left Decision Badge & Text (col-span-5) */}
              <div className="md:col-span-5 flex items-center gap-4 p-4 rounded-2xl bg-[#0d1733] border border-[#1e325c]">
                {calculations.finalStatus === 'Layak' ? (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                ) : calculations.finalStatus === 'Layak dengan Catatan' ? (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-red-400 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                    <XCircle className="w-10 h-10" />
                  </div>
                )}

                <div>
                  <h4 className={`text-2xl font-black tracking-tight ${
                    calculations.finalStatus === 'Layak' 
                      ? 'text-emerald-400' 
                      : calculations.finalStatus === 'Layak dengan Catatan'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {calculations.finalStatus.toUpperCase()}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {calculations.finalStatus === 'Layak'
                      ? 'Berdasarkan hasil perhitungan, proyek ini dinyatakan layak untuk dijalankan.'
                      : calculations.finalStatus === 'Layak dengan Catatan'
                      ? 'Proyek berpotensi layak namun memerlukan mitigasi risiko pada periode pengembalian modal.'
                      : 'Proyek tidak memenuhi ambang batas kelayakan investasi (NPV negatif atau ROI belum tercapai).'}
                  </p>
                </div>
              </div>

              {/* Right Checklist: 4 Exact Criteria from Prompt (col-span-7) */}
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* 1. ROI */}
                <div className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  calculations.roiPass 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className={`p-1 rounded-full shrink-0 mt-0.5 ${
                    calculations.roiPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {calculations.roiPass ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-xs">ROI positif</span>
                      <span className={`font-mono font-bold text-xs ${calculations.roiPass ? 'text-emerald-400' : 'text-red-400'}`}>
                        ({calculations.roiTotal.toFixed(2)}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Investasi menghasilkan keuntungan bersih menurut periode perhitungan
                    </p>
                  </div>
                </div>

                {/* 2. NPV */}
                <div className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  calculations.npvPass 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className={`p-1 rounded-full shrink-0 mt-0.5 ${
                    calculations.npvPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {calculations.npvPass ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-xs">NPV &gt; 0</span>
                      <span className={`font-mono font-bold text-xs ${calculations.npvPass ? 'text-emerald-400' : 'text-red-400'}`}>
                        ({formatRupiahExact(calculations.npv)})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Nilai proyek bertambah setelah memperhitungkan discount rate
                    </p>
                  </div>
                </div>

                {/* 3. IRR */}
                <div className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  calculations.irrPass 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className={`p-1 rounded-full shrink-0 mt-0.5 ${
                    calculations.irrPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {calculations.irrPass ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-xs">IRR &gt; Discount Rate</span>
                      <span className={`font-mono font-bold text-xs ${calculations.irrPass ? 'text-emerald-400' : 'text-red-400'}`}>
                        ({calculations.irr.toFixed(2)}% &gt; {discountRate}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Tingkat pengembalian proyek melampaui tingkat minimum yang disyaratkan
                    </p>
                  </div>
                </div>

                {/* 4. BEP */}
                <div className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  calculations.bepPass 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className={`p-1 rounded-full shrink-0 mt-0.5 ${
                    calculations.bepPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {calculations.bepPass ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-xs">BEP tercapai</span>
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        ({Math.round(calculations.bepUnit).toLocaleString('id-ID')} unit / {formatRupiahExact(calculations.bepNilaiPenjualan)})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Semakin cepat pendapatan kumulatif menutup biaya atau investasi
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REKAPITULASI ANALISA FINANSIAL SEMUA PROGRAM KERJA                 */}
      {/* ========================================================================= */}
      {activeTab === 'all-prokers' && (
        <div className="space-y-4">
          <div className="bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-300">
              Menampilkan <strong className="text-white">{filteredProkers.length}</strong> program kerja investasi. Klik salah satu proker untuk melihat atau menyunting kajian finansialnya.
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Filter Tahun:</span>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-[#142347] border border-[#223766] text-white text-xs rounded-xl p-1.5 font-medium"
              >
                <option value="Semua">Semua Tahun</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr.toString()}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[#111e3f] border border-[#203463] rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0d1733] border-b border-[#203463] text-slate-300 font-bold">
                    <th className="py-3 px-4">Kode Proker</th>
                    <th className="py-3 px-4">Nama Program Kerja</th>
                    <th className="py-3 px-4 text-center">Tahun</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4 text-right">Nilai CAPEX (RKAP)</th>
                    <th className="py-3 px-4 text-center">Status Kelayakan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#203463]/70">
                  {filteredProkers.map((p) => {
                    const analysis = analyses.find(a => a.prokerId === p.id);
                    const isSelected = p.id === selectedProker?.id;
                    const status = analysis?.statusKelayakan || 'Layak';

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-[#18294e]/70 transition-all ${isSelected ? 'bg-blue-500/10' : ''}`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                          {p.kodeProker}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white max-w-xs truncate">
                          {p.namaProker}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">
                          {p.tahunAnggaran}
                        </td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {p.ownerPic}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-orange-400 whitespace-nowrap">
                          {formatRupiah(p.nilaiCapexRkap, 'miliar')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {status === 'Layak' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              LAYAK
                            </span>
                          ) : status === 'Layak dengan Catatan' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              CATATAN
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                              TIDAK LAYAK
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedProkerId(p.id);
                              setActiveTab('excel-input');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#18294e] hover:bg-orange-500 hover:text-white border border-[#2b447e] text-blue-300 text-[11px] font-semibold transition-all"
                          >
                            Buka Analisa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

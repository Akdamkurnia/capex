import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { PhysicalProgressRecord, WorkProgram, User } from '../types';
import { formatDateIndo } from '../utils/formatters';

interface ProgresFisikViewProps {
  workPrograms: WorkProgram[];
  progressRecords: PhysicalProgressRecord[];
  currentUser: User;
  onRefresh: () => void;
  onLogProgress: (data: Partial<PhysicalProgressRecord>) => Promise<void>;
}

export const ProgresFisikView: React.FC<ProgresFisikViewProps> = ({
  workPrograms,
  progressRecords,
  currentUser,
  onRefresh,
  onLogProgress
}) => {
  const [selectedProkerId, setSelectedProkerId] = useState<string>(workPrograms[0]?.id || '');
  const [showLogModal, setShowLogModal] = useState(false);

  // Form State
  const [targetProgres, setTargetProgres] = useState<number>(50);
  const [realisasiProgres, setRealisasiProgres] = useState<number>(45);
  const [periode, setPeriode] = useState('Minggu 4 - Oktober 2026');
  const [deskripsi, setDeskripsi] = useState('');
  const [kendala, setKendala] = useState('');
  const [tindakLanjut, setTindakLanjut] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProker = workPrograms.find(p => p.id === selectedProkerId) || workPrograms[0];
  const prokerRecords = progressRecords.filter(r => r.prokerId === selectedProkerId);

  // Chart data: Target vs Realisasi trend
  const chartData = [
    { name: 'Jan', target: 10, realisasi: 8 },
    { name: 'Feb', target: 20, realisasi: 18 },
    { name: 'Mar', target: 35, realisasi: 30 },
    { name: 'Apr', target: 45, realisasi: 42 },
    { name: 'Mei', target: 60, realisasi: 55 },
    { name: 'Jun', target: 70, realisasi: 68 },
    { name: 'Jul', target: 80, realisasi: 75 },
    { name: 'Agt', target: 90, realisasi: 85 },
    { name: 'Sep', target: 95, realisasi: 92 },
    { name: 'Okt', target: selectedProker?.targetProgresFisik || 98, realisasi: selectedProker?.progresFisik || 90 }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onLogProgress({
        prokerId: selectedProker.id,
        kodeProker: selectedProker.kodeProker,
        periode,
        targetProgres: Number(targetProgres),
        realisasiProgres: Number(realisasiProgres),
        deskripsiPekerjaan: deskripsi,
        kendala,
        tindakLanjut,
        picPelapor: currentUser.name
      });
      setShowLogModal(false);
      setDeskripsi('');
      setKendala('');
      setTindakLanjut('');
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canLog = ['Administrator', 'VP/Manager', 'PIC Proker'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Modul Progres Fisik Pekerjaan Investasi
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pencatatan progres berkala, kurva target vs realisasi, dan deteksi otomatis keterlambatan baseline
          </p>
        </div>

        {canLog && (
          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Laporan Progres</span>
          </button>
        )}
      </div>

      {/* Proker Selector Bar */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Pilih Program Kerja:</span>
          <select
            value={selectedProkerId}
            onChange={(e) => setSelectedProkerId(e.target.value)}
            className="bg-[#0d1733] border border-[#213565] text-white rounded-lg px-3 py-1.5 font-medium focus:border-orange-500"
          >
            {workPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kodeProker} - {p.namaProker}
              </option>
            ))}
          </select>
        </div>

        {selectedProker && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Jadwal: <span className="font-semibold text-white">{formatDateIndo(selectedProker.tanggalMulai)} s/d {formatDateIndo(selectedProker.targetSelesai)}</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                selectedProker.statusJadwal === 'Terlambat'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {selectedProker.statusJadwal}
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Chart + KPI Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Chart (2 cols) */}
        <div className="lg:col-span-2 bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Kurva S / Trend Progres Fisik: {selectedProker?.kodeProker}
              </h4>
              <p className="text-xs text-slate-400">Perbandingan Target Rencana vs Realisasi Aktual</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-emerald-400">
                {selectedProker?.progresFisik}%
              </span>
              <p className="text-[10px] text-slate-400">Target: {selectedProker?.targetProgresFisik}%</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e325c" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1733', borderColor: '#233a6b', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}%`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target Rencana"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="realisasi"
                  name="Realisasi Aktual"
                  stroke="#10b981"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Milestone Summary (1 col) */}
        <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight mb-3">
              Kondisi Lapangan Terkini
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#0d1733] border border-[#213565] rounded-xl">
                <span className="text-slate-400 block text-[11px]">Selisih Deviasi:</span>
                <span
                  className={`text-base font-extrabold font-mono ${
                    (selectedProker?.progresFisik || 0) < (selectedProker?.targetProgresFisik || 0)
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {((selectedProker?.progresFisik || 0) - (selectedProker?.targetProgresFisik || 0)).toFixed(1)}%
                </span>
              </div>

              <div className="p-3 bg-[#0d1733] border border-[#213565] rounded-xl">
                <span className="text-slate-400 block text-[11px]">Status Keterlambatan:</span>
                <span className="text-white font-semibold mt-0.5 block">
                  {selectedProker?.statusJadwal === 'Terlambat'
                    ? '⚠️ Proyek mengalami deviasi negatif terhadap jadwal baseline'
                    : '✅ Proyek berjalan normal sesuai jadwal yang disetujui'}
                </span>
              </div>

              <div className="p-3 bg-[#0d1733] border border-[#213565] rounded-xl">
                <span className="text-slate-400 block text-[11px]">PIC Penanggung Jawab:</span>
                <span className="text-white font-semibold mt-0.5 block">{selectedProker?.ownerPic}</span>
                <span className="text-slate-400 text-[10px]">{selectedProker?.direktorat}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-[#1c2c54] pt-3">
            Terakhir diperbarui: <span className="font-mono text-white">{selectedProker?.terakhirDiperbarui}</span>
          </div>
        </div>
      </div>

      {/* Log History Table */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[#0d1733] border-b border-[#1c2c54] flex items-center justify-between">
          <h4 className="text-sm font-bold text-white">
            Riwayat Log Pelaporan Progres ({prokerRecords.length} Catatan)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1c2c54] text-slate-400">
                <th className="py-2.5 px-3">Periode</th>
                <th className="py-2.5 px-3">Tanggal Lapor</th>
                <th className="py-2.5 px-3 text-center">Target</th>
                <th className="py-2.5 px-3 text-center">Realisasi</th>
                <th className="py-2.5 px-3 text-center">Selisih</th>
                <th className="py-2.5 px-3">Uraian Pekerjaan & Kendala</th>
                <th className="py-2.5 px-3">Pelapor</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2c54]/60">
              {prokerRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada log progres fisik yang dicatat untuk program kerja ini.
                  </td>
                </tr>
              ) : (
                prokerRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#18294e]/70">
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">{r.periode}</td>
                    <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">{formatDateIndo(r.tanggalPelaporan)}</td>
                    <td className="py-3 px-3 text-center font-mono text-blue-400">{r.targetProgres}%</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">{r.realisasiProgres}%</td>
                    <td className="py-3 px-3 text-center font-mono font-bold whitespace-nowrap">
                      <span className={r.selisih < 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {r.selisih > 0 ? `+${r.selisih}%` : `${r.selisih}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-sm">
                      <p className="text-white font-medium">{r.deskripsiPekerjaan}</p>
                      {r.kendala && (
                        <p className="text-red-300 text-[11px] mt-0.5">Kendala: {r.kendala}</p>
                      )}
                      {r.tindakLanjut && (
                        <p className="text-teal-300 text-[11px] mt-0.5">Tindak Lanjut: {r.tindakLanjut}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">{r.picPelapor}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold">
                        {r.statusVerifikasi}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE LOG MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Catat Laporan Progres Fisik Berkala</span>
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Periode Pelaporan *</label>
                <input
                  type="text"
                  required
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  placeholder="Contoh: Bulan Oktober 2026 / Minggu 4"
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Progres (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={targetProgres}
                    onChange={(e) => setTargetProgres(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Realisasi Progres (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={realisasiProgres}
                    onChange={(e) => setRealisasiProgres(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Uraian / Deskripsi Pekerjaan *</label>
                <textarea
                  rows={2}
                  required
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Pekerjaan teknis yang diselesaikan pada periode ini..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kendala / Isu di Lapangan</label>
                <input
                  type="text"
                  value={kendala}
                  onChange={(e) => setKendala(e.target.value)}
                  placeholder="Kendala teknis, pengadaan, atau vendor..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tindak Lanjut / Action Plan</label>
                <input
                  type="text"
                  value={tindakLanjut}
                  onChange={(e) => setTindakLanjut(e.target.value)}
                  placeholder="Upaya mitigasi dan percepatan..."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg hover:bg-[#203666]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

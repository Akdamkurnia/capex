import React, { useState } from 'react';
import {
  Settings,
  ShieldAlert,
  Search,
  Database,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { AuditLog, User } from '../types';

interface PengaturanViewProps {
  auditLogs: AuditLog[];
  currentUser: User;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({ auditLogs, currentUser }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('Semua');

  // Configuration form state
  const [defaultYear, setDefaultYear] = useState('2026');
  const [varianceTolerance, setVarianceTolerance] = useState(10);
  const [retentionYears, setRetentionYears] = useState(10);
  const [isSaved, setIsSaved] = useState(false);

  const filteredLogs = auditLogs.filter((log) => {
    const matchAction = actionFilter === 'Semua' || log.action === actionFilter;
    const matchSearch =
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase());
    return matchAction && matchSearch;
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Pengaturan Sistem & Audit Trail Korporasi
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Konfigurasi parameter ambang batas deviasi CAPEX, aturan retensi dokumen, dan pencatatan audit log tak terhapus (immutable)
          </p>
        </div>
      </div>

      {/* System Configurations Form */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-5 shadow-lg space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1c2c54] pb-2">
          <Sliders className="w-4 h-4 text-orange-400" />
          <span>Parameter Kebijakan CAPEX & Dokumen Wajib</span>
        </h4>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tahun Anggaran Berjalan Default</label>
            <select
              value={defaultYear}
              onChange={(e) => setDefaultYear(e.target.value)}
              className="w-full bg-[#0d1733] border border-[#213565] text-white rounded-lg p-2 font-medium focus:border-orange-500"
            >
              <option value="2026">2026 (Aktif)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Ambang Batas Peringatan Deviasi (%)</label>
            <input
              type="number"
              value={varianceTolerance}
              onChange={(e) => setVarianceTolerance(Number(e.target.value))}
              className="w-full bg-[#0d1733] border border-[#213565] text-white rounded-lg p-2 font-mono focus:border-orange-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Notifikasi dikirim jika deviasi serapan &gt; {varianceTolerance}%</span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Masa Retensi Arsip Kontrak (Tahun)</label>
            <input
              type="number"
              value={retentionYears}
              onChange={(e) => setRetentionYears(Number(e.target.value))}
              className="w-full bg-[#0d1733] border border-[#213565] text-white rounded-lg p-2 font-mono focus:border-orange-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Kepatuhan arsip digital BUMN</span>
          </div>

          <div className="md:col-span-3 flex items-center justify-between pt-2 border-t border-[#1c2c54]">
            {isSaved ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Konfigurasi sistem berhasil diperbarui!
              </span>
            ) : <span />}
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </form>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden space-y-3">
        <div className="px-5 py-3.5 bg-[#0d1733] border-b border-[#1c2c54] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Log Audit Aktivitas (Audit Trail Real-Time)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari log audit..."
                className="bg-[#142347] border border-[#213565] text-white text-xs rounded-lg pl-8 pr-3 py-1 focus:border-orange-500"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-[#142347] border border-[#213565] text-white text-xs rounded-lg px-2 py-1"
            >
              <option value="Semua">Semua Aksi</option>
              <option value="CREATE_PROKER">CREATE_PROKER</option>
              <option value="UPDATE_PROKER">UPDATE_PROKER</option>
              <option value="UPLOAD_DOCUMENT">UPLOAD_DOCUMENT</option>
              <option value="VERIFY_DOCUMENT">VERIFY_DOCUMENT</option>
              <option value="LOG_PROGRESS">LOG_PROGRESS</option>
              <option value="CREATE_REALIZATION">CREATE_REALIZATION</option>
              <option value="EXPORT_EXCEL">EXPORT_EXCEL</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1c2c54] text-slate-400 bg-[#0b142b]">
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Timestamp</th>
                <th className="py-2.5 px-3 font-semibold">Pengguna</th>
                <th className="py-2.5 px-3 font-semibold">Peran (Role)</th>
                <th className="py-2.5 px-3 font-semibold">Aksi</th>
                <th className="py-2.5 px-3 font-semibold">Entitas Target</th>
                <th className="py-2.5 px-4 font-semibold min-w-[240px]">Rincian Aktivitas</th>
                <th className="py-2.5 px-3 font-semibold font-mono text-slate-400">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2c54]/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada log audit yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#18294e]/70">
                    <td className="py-2.5 px-4 font-mono text-slate-300 whitespace-nowrap text-[11px]">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold text-[10px]">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-orange-400 whitespace-nowrap text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap text-[11px]">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-2.5 px-4 text-slate-200">
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

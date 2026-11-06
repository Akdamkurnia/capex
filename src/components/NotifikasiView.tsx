import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { SystemNotification, User } from '../types';

interface NotifikasiViewProps {
  notifications: SystemNotification[];
  currentUser: User;
  onMarkRead: (id: string) => void;
  onNavigateToProker: (prokerId?: string) => void;
}

export const NotifikasiView: React.FC<NotifikasiViewProps> = ({
  notifications,
  currentUser,
  onMarkRead,
  onNavigateToProker
}) => {
  const [filterType, setFilterType] = useState<string>('Semua');

  const filtered = notifications.filter(n => {
    if (filterType === 'Semua') return true;
    if (filterType === 'Belum Dibaca') return !n.dibaca;
    return n.tipe === filterType;
  });

  const getIcon = (tipe: string) => {
    switch (tipe) {
      case 'danger':
        return <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Pusat Notifikasi & Early Warning System
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Peringatan dini proyek terlambat, dokumen wajib belum diunggah, deviasi serapan anggaran, dan jadwal jatuh tempo
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {['Semua', 'Belum Dibaca', 'danger', 'warning', 'info'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors capitalize ${
                filterType === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#18294e] text-slate-300 hover:text-white'
              }`}
            >
              {f === 'danger' ? 'Kritis / Terlambat' : f === 'warning' ? 'Perlu Perhatian' : f === 'info' ? 'Informasi' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-12 text-center text-slate-400">
            <p>Tidak ada notifikasi dalam kategori ini.</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all duration-150 flex items-start gap-4 ${
                !n.dibaca
                  ? 'bg-[#142347] border-orange-500/40 shadow-lg'
                  : 'bg-[#111e3f] border-[#1e325c]'
              }`}
            >
              <div className="pt-0.5">{getIcon(n.tipe)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white leading-tight">{n.judul}</h4>
                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">{n.tanggal}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.deskripsi}</p>
                {n.kodeProker && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-[#0d1733] border border-[#213565] text-blue-400 rounded text-[11px] font-mono">
                    Kode: {n.kodeProker}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!n.dibaca && (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    title="Tandai Sudah Dibaca"
                    className="p-1.5 rounded-lg bg-[#18294e] hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {n.prokerId && (
                  <button
                    onClick={() => onNavigateToProker(n.prokerId)}
                    className="px-3 py-1.5 bg-[#18294e] hover:bg-orange-500 hover:text-white text-orange-400 border border-[#2a437d] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Lihat Proker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

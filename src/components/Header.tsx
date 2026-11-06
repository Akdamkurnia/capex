import React, { useState } from 'react';
import {
  Search,
  Download,
  Bell,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { User, UserRole, SystemNotification } from '../types';
import { INITIAL_USERS } from '../server/mockData';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  availableYears: number[];
  onOpenAddYearModal: () => void;
  currentUser: User;
  users?: User[];
  onSwitchUser: (user: User) => void;
  notifications: SystemNotification[];
  onNotificationClick: (notif: SystemNotification) => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  pageSubtitle = 'Monitoring & Evaluasi Real-time',
  searchQuery,
  onSearchChange,
  selectedYear,
  onYearChange,
  availableYears,
  onOpenAddYearModal,
  currentUser,
  users = INITIAL_USERS,
  onSwitchUser,
  notifications,
  onNotificationClick
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const unreadCount = notifications.filter(n => !n.dibaca).length;

  const handleExportExcel = () => {
    setIsExporting(true);
    // Direct link to backend generated .xlsx file
    const url = `/api/export/excel?userId=${currentUser.id}&userName=${encodeURIComponent(currentUser.name)}&userRole=${currentUser.role}`;
    window.location.href = url;
    setTimeout(() => setIsExporting(false), 2000);
  };

  const getNotifIcon = (tipe: string) => {
    switch (tipe) {
      case 'danger':
        return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <header className="h-18 bg-[#0d1733] border-b border-[#1c2c54] px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
      {/* Title & Subtitle */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-white tracking-tight leading-snug">
          {pageTitle}
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          {pageSubtitle}
        </p>
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-3">
        {/* Dynamic Year Filter with + Tambah Tahun */}
        <div className="flex items-center gap-1.5 bg-[#142347] border border-[#213565] px-2.5 py-1.5 rounded-lg text-xs">
          <span className="text-slate-400 font-medium">Tahun:</span>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
          >
            <option value="Semua" className="bg-[#0d1733] text-white">Semua Tahun</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr.toString()} className="bg-[#0d1733] text-white">
                {yr}
              </option>
            ))}
          </select>
          <button
            onClick={onOpenAddYearModal}
            title="Tambah Tahun Anggaran Baru"
            className="ml-1 px-1.5 py-0.5 bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white rounded border border-orange-500/40 text-[10px] font-bold transition-colors"
          >
            + Tahun
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-64 hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari proker, dokumen, kode..."
            className="w-full bg-[#142347] border border-[#213565] text-white placeholder-slate-400 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          />
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#182a55] hover:bg-[#20366b] text-slate-200 hover:text-white border border-[#273e75] text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-orange-400" />
          <span>{isExporting ? 'Mengekspor...' : 'Export Excel'}</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-lg bg-[#142347] hover:bg-[#1a2d59] border border-[#213565] text-slate-300 hover:text-white relative transition-colors"
            aria-label="Pusat Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[10px] flex items-center justify-center font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-84 bg-[#111e3f] border border-[#24396b] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-[#1c2c54] flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifikasi & Early Warning
                </span>
                <span className="text-[11px] text-orange-400 font-mono font-medium">
                  {unreadCount} Baru
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#1c2c54]/60">
                {notifications.length === 0 ? (
                  <p className="p-4 text-xs text-slate-400 text-center">Tidak ada notifikasi baru.</p>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        onNotificationClick(n);
                        setShowNotifDropdown(false);
                      }}
                      className={`p-3 text-xs hover:bg-[#182b57] cursor-pointer flex gap-2.5 transition-colors ${
                        !n.dibaca ? 'bg-[#15254d]/70' : ''
                      }`}
                    >
                      {getNotifIcon(n.tipe)}
                      <div className="flex-1">
                        <p className="font-semibold text-white leading-snug">{n.judul}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-2">{n.deskripsi}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block font-mono">{n.tanggal}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-[#142347] hover:bg-[#1a2d59] border border-[#213565] rounded-xl transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-orange-600/30 border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold text-xs font-mono">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                {currentUser.name.split(',')[0]}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] text-orange-400 font-medium">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-[#111e3f] border border-[#24396b] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-[#1c2c54] mb-1">
                <p className="text-xs font-bold text-white">{currentUser.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-[10px] font-semibold">
                  Role: {currentUser.role}
                </span>
              </div>
              <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ganti Role RBAC (Simulasi):
              </p>
              <div className="space-y-1">
                {users.map((usr) => (
                  <button
                    key={usr.id}
                    onClick={() => {
                      onSwitchUser(usr);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      currentUser.id === usr.id
                        ? 'bg-orange-500/20 text-orange-300 font-semibold'
                        : 'text-slate-300 hover:bg-[#182b57] hover:text-white'
                    }`}
                  >
                    <div>
                      <p className="leading-tight">{usr.name.split(',')[0]}</p>
                      <p className="text-[10px] text-slate-400">{usr.role}</p>
                    </div>
                    {currentUser.id === usr.id && (
                      <span className="text-[10px] text-orange-400 font-mono">Aktif</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

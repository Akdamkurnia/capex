import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Coins,
  LineChart,
  FolderLock,
  FileCheck2,
  FileSignature,
  Receipt,
  FileSpreadsheet,
  FileText,
  Bell,
  Users2,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PosLogo } from './PosLogo';

export type NavTab =
  | 'dashboard'
  | 'proker'
  | 'progres'
  | 'realisasi'
  | 'fs-bc'
  | 'dokumen'
  | 'pks'
  | 'spk'
  | 'invoice'
  | 'bapp'
  | 'fs-bc-docs'
  | 'notifikasi'
  | 'users'
  | 'pengaturan';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadNotifCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  unreadNotifCount
}) => {
  const mainMenus: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    { id: 'proker', label: 'Program Kerja', icon: <Briefcase className="w-5 h-5 shrink-0" /> },
    { id: 'progres', label: 'Progres Fisik', icon: <TrendingUp className="w-5 h-5 shrink-0" /> },
    { id: 'realisasi', label: 'Realisasi Keuangan', icon: <Coins className="w-5 h-5 shrink-0" /> },
    { id: 'fs-bc', label: 'Analisa Finansial', icon: <LineChart className="w-5 h-5 shrink-0" /> },
  ];

  const docMenus: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dokumen', label: 'Dokumen Investasi', icon: <FolderLock className="w-5 h-5 shrink-0" /> },
    { id: 'pks', label: 'PKS', icon: <FileCheck2 className="w-5 h-5 shrink-0" /> },
    { id: 'spk', label: 'SPK', icon: <FileSignature className="w-5 h-5 shrink-0" /> },
    { id: 'invoice', label: 'Invoice', icon: <Receipt className="w-5 h-5 shrink-0" /> },
    { id: 'bapp', label: 'BAPP', icon: <FileSpreadsheet className="w-5 h-5 shrink-0" /> },
    { id: 'fs-bc-docs', label: 'FS-BC', icon: <FileText className="w-5 h-5 shrink-0" /> },
  ];

  const systemMenus: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'notifikasi', label: 'Notifikasi', icon: <Bell className="w-5 h-5 shrink-0" />, badge: unreadNotifCount },
    { id: 'users', label: 'Pengguna & Akses', icon: <Users2 className="w-5 h-5 shrink-0" /> },
    { id: 'pengaturan', label: 'Pengaturan', icon: <Settings className="w-5 h-5 shrink-0" /> },
  ];

  const renderMenuItem = (item: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }) => {
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onSelectTab(item.id)}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 relative ${
          isActive
            ? 'bg-gradient-to-r from-orange-500/20 to-orange-500/10 text-orange-400 font-semibold border-l-2 border-orange-500 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        } ${collapsed ? 'justify-center px-0' : ''}`}
      >
        <span className={isActive ? 'text-orange-400' : 'text-slate-400'}>
          {item.icon}
        </span>
        {!collapsed && (
          <span className="truncate flex-1 text-left">{item.label}</span>
        )}
        {!collapsed && !!item.badge && item.badge > 0 && (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-500 text-white font-mono">
            {item.badge}
          </span>
        )}
        {collapsed && !!item.badge && item.badge > 0 && (
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#091024]" />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#091024] border-r border-[#1a294d] flex flex-col transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-18 flex items-center justify-between px-4 border-b border-[#1a294d]">
        <PosLogo collapsed={collapsed} />
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
          aria-label={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Link List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        <div>
          {!collapsed && (
            <p className="px-3.5 mb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              Pengendalian Proker
            </p>
          )}
          <div className="space-y-1">
            {mainMenus.map(renderMenuItem)}
          </div>
        </div>

        <div>
          {!collapsed && (
            <p className="px-3.5 mb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              Manajemen Dokumen
            </p>
          )}
          <div className="space-y-1">
            {docMenus.map(renderMenuItem)}
          </div>
        </div>

        <div>
          {!collapsed && (
            <p className="px-3.5 mb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              Tata Kelola & Sistem
            </p>
          )}
          <div className="space-y-1">
            {systemMenus.map(renderMenuItem)}
          </div>
        </div>
      </div>

      {/* Footer System Status */}
      {!collapsed && (
        <div className="p-4 border-t border-[#1a294d] bg-[#070d1e]/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DALISTA v2.6-CAPEX</span>
            <span className="font-mono text-emerald-400">Live DB</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            PT Pos Indonesia (Persero)
          </p>
        </div>
      )}
    </aside>
  );
};

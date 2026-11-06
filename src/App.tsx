import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProgramKerjaView } from './components/ProgramKerjaView';
import { DocumentsView } from './components/DocumentsView';
import { ProgresFisikView } from './components/ProgresFisikView';
import { RealisasiKeuanganView } from './components/RealisasiKeuanganView';
import { AnalisaFinansialView } from './components/AnalisaFinansialView';
import { NotifikasiView } from './components/NotifikasiView';
import { UsersView } from './components/UsersView';
import { PengaturanView } from './components/PengaturanView';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { AddYearModal } from './components/AddYearModal';

import {
  WorkProgram,
  InvestmentDocument,
  PhysicalProgressRecord,
  BudgetRealizationRelease,
  FinancialAnalysisFSBC,
  SystemNotification,
  AuditLog,
  DashboardStats,
  User,
  DocumentType,
  YearSummary
} from './types';
import { INITIAL_USERS } from './server/mockData';
import { api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); // Default to Administrator
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [availableYears, setAvailableYears] = useState<number[]>([2022, 2023, 2024, 2025, 2026]);
  const [multiYearSummaries, setMultiYearSummaries] = useState<YearSummary[]>([]);
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Dashboard Filters
  const [dashboardOwner, setDashboardOwner] = useState('Semua');
  const [dashboardBosie, setDashboardBosie] = useState('Semua');

  // Core Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workPrograms, setWorkPrograms] = useState<WorkProgram[]>([]);
  const [documents, setDocuments] = useState<InvestmentDocument[]>([]);
  const [progressRecords, setProgressRecords] = useState<PhysicalProgressRecord[]>([]);
  const [realizations, setRealizations] = useState<BudgetRealizationRelease[]>([]);
  const [financialAnalyses, setFinancialAnalyses] = useState<FinancialAnalysisFSBC[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Preview & Upload Modal
  const [previewDoc, setPreviewDoc] = useState<InvestmentDocument | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        statsData,
        prokerData,
        docsData,
        rlsData,
        faData,
        notifsData,
        logsData,
        yearsData,
        multiYearData,
        usersData
      ] = await Promise.all([
        api.getDashboardStats({ tahun: selectedYear, owner: dashboardOwner, bosie: dashboardBosie }),
        api.getWorkPrograms(),
        api.getDocuments(),
        api.getRealizations(),
        api.getAllFinancialAnalyses(),
        api.getNotifications(),
        api.getAuditLogs(),
        api.getAvailableYears(),
        api.getMultiYearSummary(),
        api.getUsers()
      ]);

      setStats(statsData);
      setWorkPrograms(prokerData);
      setDocuments(docsData);
      setRealizations(rlsData);
      setFinancialAnalyses(faData);
      setNotifications(notifsData);
      setAuditLogs(logsData);
      if (yearsData && yearsData.length > 0) {
        setAvailableYears(yearsData);
      }
      if (multiYearData) {
        setMultiYearSummaries(multiYearData);
      }
      if (usersData && usersData.length > 0) {
        setUsers(usersData);
        // keep currentUser in sync if updated
        const syncCurrent = usersData.find(u => u.id === currentUser.id);
        if (syncCurrent) setCurrentUser(syncCurrent);
      }

      // Also fetch progress for first proker if available
      if (prokerData.length > 0) {
        const prgData = await api.getProgressRecords(prokerData[0].id);
        setProgressRecords(prgData);
      }
    } catch (err) {
      console.error('Error fetching data from server:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, dashboardOwner, dashboardBosie]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Document Handlers
  const handleDownloadDocument = (doc: InvestmentDocument) => {
    const downloadUrl = `/api/documents/${doc.id}/download?userId=${currentUser.id}&userName=${encodeURIComponent(currentUser.name)}&userRole=${currentUser.role}`;
    window.location.href = downloadUrl;
  };

  const handleUpdateDocStatus = async (id: string, newStatus: any, notes: string) => {
    await api.updateDocument(id, {
      statusVerifikasi: newStatus,
      catatanReviewer: notes,
      reviewedBy: currentUser.name
    }, currentUser);
    
    // Update local preview state
    if (previewDoc && previewDoc.id === id) {
      setPreviewDoc(prev => prev ? { ...prev, statusVerifikasi: newStatus, catatanReviewer: notes, reviewedBy: currentUser.name } : null);
    }
    fetchData();
  };

  const handleCreateProker = async (data: Partial<WorkProgram>) => {
    await api.createWorkProgram(data, currentUser);
    fetchData();
  };

  const handleUpdateProker = async (id: string, data: Partial<WorkProgram>) => {
    await api.updateWorkProgram(id, data, currentUser);
    fetchData();
  };

  const handleDeleteProker = async (id: string) => {
    await api.deleteWorkProgram(id, currentUser);
    fetchData();
  };

  const handleUploadDocument = async (formData: FormData) => {
    await api.uploadDocument(formData);
    fetchData();
  };

  const handleUpdateDocument = async (id: string, data: Partial<InvestmentDocument>) => {
    await api.updateDocument(id, data, currentUser);
    fetchData();
  };

  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id, currentUser);
    fetchData();
  };

  const handleLogProgress = async (data: Partial<PhysicalProgressRecord>) => {
    await api.logProgress(data, currentUser);
    fetchData();
  };

  const handleCreateRealization = async (data: Partial<BudgetRealizationRelease>) => {
    await api.createRealization(data, currentUser);
    fetchData();
  };

  const handleSaveFinancialAnalysis = async (data: Partial<FinancialAnalysisFSBC>) => {
    await api.saveFinancialAnalysis(data, currentUser);
    fetchData();
  };

  const handleAddYear = async (year: number) => {
    await api.addYear(year, currentUser);
    setSelectedYear(year.toString());
    await fetchData();
  };

  const handleMarkNotifRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dibaca: true } : n));
  };

  // User & PIC Management Handlers
  const handleCreateUser = async (data: Partial<User>) => {
    await api.createUser(data, currentUser);
    fetchData();
  };

  const handleUpdateUser = async (id: string, data: Partial<User>) => {
    const updated = await api.updateUser(id, data, currentUser);
    if (currentUser.id === id) {
      setCurrentUser(updated);
    }
    fetchData();
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id, currentUser);
    fetchData();
  };

  const handleAssignPic = async (prokerId: string, data: any) => {
    await api.assignProkerPic(prokerId, data, currentUser);
    fetchData();
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Dashboard Pengendalian Program Kerja Investasi';
      case 'proker':
        return 'Penjelasan Cost Program Kerja Investasi CAPEX';
      case 'progres':
        return 'Monitoring Progres Fisik Pekerjaan';
      case 'realisasi':
        return 'Realisasi Keuangan & Transaksi BSU Release';
      case 'fs-bc':
        return 'Analisa Finansial FS-BC & Kelayakan Bisnis';
      case 'dokumen':
        return 'Manajemen Dokumen Investasi CAPEX';
      case 'pks':
        return 'Modul Perjanjian Kerja Sama (PKS)';
      case 'spk':
        return 'Modul Surat Perintah Kerja (SPK)';
      case 'invoice':
        return 'Modul Invoice & Penagihan Vendor';
      case 'bapp':
        return 'Modul Berita Acara Pemeriksaan Pekerjaan (BAPP)';
      case 'fs-bc-docs':
        return 'Modul Feasibility Study & Business Case (FS-BC)';
      case 'notifikasi':
        return 'Pusat Notifikasi & Early Warning';
      case 'users':
        return 'Pengguna & Hak Akses (RBAC)';
      case 'pengaturan':
        return 'Pengaturan Sistem & Audit Trail';
      default:
        return 'Dashboard Pengendalian';
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.dibaca).length;

  return (
    <div className="flex min-h-screen bg-[#0b132b] text-slate-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        unreadNotifCount={unreadNotifCount}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          pageTitle={getPageTitle()}
          pageSubtitle="PT Pos Indonesia (Persero) · Monitoring & Evaluasi Real-time"
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          availableYears={availableYears}
          onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
          currentUser={currentUser}
          users={users}
          onSwitchUser={setCurrentUser}
          notifications={notifications}
          onNotificationClick={(n) => {
            handleMarkNotifRead(n.id);
            if (n.targetLink) {
              if (n.targetLink.includes('proker')) setCurrentTab('proker');
              else if (n.targetLink.includes('spk')) setCurrentTab('spk');
              else if (n.targetLink.includes('dokumen')) setCurrentTab('dokumen');
              else if (n.targetLink.includes('realisasi')) setCurrentTab('realisasi');
            }
          }}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {loading && !stats ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Memuat data operasional DALISTA...</p>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && stats && (
                <DashboardView
                  stats={stats}
                  workPrograms={workPrograms}
                  selectedYear={selectedYear}
                  onSelectYear={setSelectedYear}
                  availableYears={availableYears}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  multiYearSummaries={multiYearSummaries}
                  selectedOwner={dashboardOwner}
                  onSelectOwner={setDashboardOwner}
                  selectedBosie={dashboardBosie}
                  onSelectBosie={setDashboardBosie}
                  onViewProker={(p) => {
                    setCurrentTab('proker');
                  }}
                  onNavigateToTab={setCurrentTab}
                />
              )}

              {currentTab === 'proker' && (
                <ProgramKerjaView
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  users={users}
                  availableYears={availableYears}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  onRefresh={fetchData}
                  onCreateProker={handleCreateProker}
                  onUpdateProker={handleUpdateProker}
                  onDeleteProker={handleDeleteProker}
                  onAssignPic={handleAssignPic}
                  onOpenUploadModal={(p, defaultJenis) => {
                    if (defaultJenis) {
                      if (defaultJenis === 'PKS') setCurrentTab('pks');
                      else if (defaultJenis === 'SPK') setCurrentTab('spk');
                      else if (defaultJenis === 'Invoice') setCurrentTab('invoice');
                      else if (defaultJenis === 'BAPP') setCurrentTab('bapp');
                      else if (defaultJenis === 'FS-BC') setCurrentTab('fs-bc-docs');
                      else setCurrentTab('dokumen');
                    } else {
                      setCurrentTab('dokumen');
                    }
                  }}
                  onViewDocument={(docId) => {
                    const found = documents.find(d => d.id === docId);
                    if (found) setPreviewDoc(found);
                  }}
                />
              )}

              {currentTab === 'progres' && (
                <ProgresFisikView
                  workPrograms={workPrograms}
                  progressRecords={progressRecords}
                  currentUser={currentUser}
                  onRefresh={fetchData}
                  onLogProgress={handleLogProgress}
                />
              )}

              {currentTab === 'realisasi' && (
                <RealisasiKeuanganView
                  realizations={realizations}
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  availableYears={availableYears}
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  onRefresh={fetchData}
                  onCreateRealization={handleCreateRealization}
                />
              )}

              {currentTab === 'fs-bc' && (
                <AnalisaFinansialView
                  analyses={financialAnalyses}
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  onRefresh={fetchData}
                  onSaveAnalysis={handleSaveFinancialAnalysis}
                  onViewDocument={(docId) => {
                    const found = documents.find(d => d.id === docId);
                    if (found) setPreviewDoc(found);
                  }}
                />
              )}

              {/* Dedicated Document Modules */}
              {currentTab === 'dokumen' && (
                <DocumentsView
                  documents={documents}
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  availableYears={availableYears}
                  selectedYear={selectedYear}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  forcedType={null}
                  onRefresh={fetchData}
                  onUploadDocument={handleUploadDocument}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onPreviewDocument={(d) => setPreviewDoc(d)}
                  onDownloadDocument={handleDownloadDocument}
                />
              )}

              {currentTab === 'pks' && (
                <DocumentsView
                  documents={documents}
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  availableYears={availableYears}
                  selectedYear={selectedYear}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  forcedType="PKS"
                  onRefresh={fetchData}
                  onUploadDocument={handleUploadDocument}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onPreviewDocument={(d) => setPreviewDoc(d)}
                  onDownloadDocument={handleDownloadDocument}
                />
              )}

              {currentTab === 'spk' && (
                <DocumentsView
                  documents={documents}
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  availableYears={availableYears}
                  selectedYear={selectedYear}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  forcedType="SPK"
                  onRefresh={fetchData}
                  onUploadDocument={handleUploadDocument}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onPreviewDocument={(d) => setPreviewDoc(d)}
                  onDownloadDocument={handleDownloadDocument}
                />
              )}

              {currentTab === 'invoice' && (
                <DocumentsView
                  documents={documents}
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  availableYears={availableYears}
                  selectedYear={selectedYear}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  forcedType="Invoice"
                  onRefresh={fetchData}
                  onUploadDocument={handleUploadDocument}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onPreviewDocument={(d) => setPreviewDoc(d)}
                  onDownloadDocument={handleDownloadDocument}
                />
              )}

              {currentTab === 'bapp' && (
                <DocumentsView
                  documents={documents}
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  availableYears={availableYears}
                  selectedYear={selectedYear}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  forcedType="BAPP"
                  onRefresh={fetchData}
                  onUploadDocument={handleUploadDocument}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onPreviewDocument={(d) => setPreviewDoc(d)}
                  onDownloadDocument={handleDownloadDocument}
                />
              )}

              {currentTab === 'fs-bc-docs' && (
                <DocumentsView
                  documents={documents}
                  workPrograms={workPrograms}
                  currentUser={currentUser}
                  availableYears={availableYears}
                  selectedYear={selectedYear}
                  onOpenAddYearModal={() => setIsAddYearModalOpen(true)}
                  forcedType="FS-BC"
                  onRefresh={fetchData}
                  onUploadDocument={handleUploadDocument}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onPreviewDocument={(d) => setPreviewDoc(d)}
                  onDownloadDocument={handleDownloadDocument}
                />
              )}

              {currentTab === 'notifikasi' && (
                <NotifikasiView
                  notifications={notifications}
                  currentUser={currentUser}
                  onMarkRead={handleMarkNotifRead}
                  onNavigateToProker={() => setCurrentTab('proker')}
                />
              )}

              {currentTab === 'users' && (
                <UsersView
                  currentUser={currentUser}
                  users={users}
                  workPrograms={workPrograms}
                  onSwitchUser={setCurrentUser}
                  onRefresh={fetchData}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {currentTab === 'pengaturan' && (
                <PengaturanView
                  auditLogs={auditLogs}
                  currentUser={currentUser}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Full PDF / Document Preview & Verification Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          currentUser={currentUser}
          onClose={() => setPreviewDoc(null)}
          onUpdateStatus={handleUpdateDocStatus}
          onDownload={handleDownloadDocument}
        />
      )}

      {/* Dynamic Add Year Modal */}
      <AddYearModal
        isOpen={isAddYearModalOpen}
        onClose={() => setIsAddYearModalOpen(false)}
        availableYears={availableYears}
        currentUser={currentUser}
        onAddYear={handleAddYear}
      />
    </div>
  );
}

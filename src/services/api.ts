import {
  WorkProgram,
  InvestmentDocument,
  PhysicalProgressRecord,
  BudgetRealizationRelease,
  FinancialAnalysisFSBC,
  SystemNotification,
  AuditLog,
  DashboardStats,
  DocumentChecklistSummary,
  YearSummary,
  User
} from '../types';

export const api = {
  // Years Management
  async getAvailableYears(): Promise<number[]> {
    const res = await fetch('/api/years');
    if (!res.ok) throw new Error('Gagal memuat daftar tahun');
    return res.json();
  },

  async addYear(tahun: number, currentUser: { id: string; name: string; role: string }): Promise<{ success: boolean; years: number[]; addedYear: number }> {
    const res = await fetch('/api/years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tahun, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menambahkan tahun anggaran');
    }
    return res.json();
  },

  async getMultiYearSummary(): Promise<YearSummary[]> {
    const res = await fetch('/api/dashboard/multi-year');
    if (!res.ok) throw new Error('Gagal memuat rekap multi-tahun');
    return res.json();
  },

  // Dashboard Stats
  async getDashboardStats(params?: { tahun?: string; owner?: string; direktorat?: string; bosie?: string }): Promise<DashboardStats> {
    const q = new URLSearchParams();
    if (params?.tahun) q.append('tahun', params.tahun);
    if (params?.owner) q.append('owner', params.owner);
    if (params?.direktorat) q.append('direktorat', params.direktorat);
    if (params?.bosie) q.append('bosie', params.bosie);
    const res = await fetch(`/api/dashboard/stats?${q.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat statistik dashboard');
    return res.json();
  },

  // Work Programs
  async getWorkPrograms(): Promise<WorkProgram[]> {
    const res = await fetch('/api/proker');
    if (!res.ok) throw new Error('Gagal memuat program kerja');
    return res.json();
  },

  async getWorkProgramById(id: string): Promise<WorkProgram & { checklist: DocumentChecklistSummary }> {
    const res = await fetch(`/api/proker/${id}`);
    if (!res.ok) throw new Error('Program kerja tidak ditemukan');
    return res.json();
  },

  async createWorkProgram(data: Partial<WorkProgram>, currentUser: { id: string; name: string; role: string }): Promise<WorkProgram> {
    const res = await fetch('/api/proker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menambahkan program kerja');
    }
    return res.json();
  },

  async updateWorkProgram(id: string, data: Partial<WorkProgram>, currentUser: { id: string; name: string; role: string }): Promise<WorkProgram> {
    const res = await fetch(`/api/proker/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memperbarui program kerja');
    }
    return res.json();
  },

  async deleteWorkProgram(id: string, currentUser: { id: string; name: string; role: string }): Promise<{ message: string }> {
    const res = await fetch(`/api/proker/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) throw new Error('Gagal menghapus program kerja');
    return res.json();
  },

  // Documents
  async getDocuments(params?: { jenis?: string; prokerId?: string; status?: string; tahun?: string }): Promise<InvestmentDocument[]> {
    const q = new URLSearchParams();
    if (params?.jenis) q.append('jenis', params.jenis);
    if (params?.prokerId) q.append('prokerId', params.prokerId);
    if (params?.status) q.append('status', params.status);
    if (params?.tahun) q.append('tahun', params.tahun);
    const res = await fetch(`/api/documents?${q.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat dokumen');
    return res.json();
  },

  async getDocumentChecklist(prokerId: string): Promise<DocumentChecklistSummary> {
    const res = await fetch(`/api/documents/checklist/${prokerId}`);
    if (!res.ok) throw new Error('Gagal memuat checklist dokumen');
    return res.json();
  },

  async uploadDocument(formData: FormData): Promise<InvestmentDocument> {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mengunggah dokumen');
    }
    return res.json();
  },

  async updateDocument(id: string, data: Partial<InvestmentDocument>, currentUser: { id: string; name: string; role: string }): Promise<InvestmentDocument> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) throw new Error('Gagal memperbarui data dokumen');
    return res.json();
  },

  async deleteDocument(id: string, currentUser: { id: string; name: string; role: string }): Promise<void> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) throw new Error('Gagal menghapus dokumen');
  },

  // Progress Records
  async getProgressRecords(prokerId: string): Promise<PhysicalProgressRecord[]> {
    const res = await fetch(`/api/progress/${prokerId}`);
    if (!res.ok) throw new Error('Gagal memuat riwayat progres fisik');
    return res.json();
  },

  async logProgress(data: Partial<PhysicalProgressRecord>, currentUser: { id: string; name: string; role: string }): Promise<PhysicalProgressRecord> {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) throw new Error('Gagal mencatat progres fisik');
    return res.json();
  },

  // Budget Realizations
  async getRealizations(params?: { prokerId?: string; tahun?: string; status?: string } | string): Promise<BudgetRealizationRelease[]> {
    if (typeof params === 'string') {
      const res = await fetch(`/api/realizations/${params}`);
      if (!res.ok) throw new Error('Gagal memuat data realisasi anggaran');
      return res.json();
    }
    const q = new URLSearchParams();
    if (params?.prokerId) q.append('prokerId', params.prokerId);
    if (params?.tahun) q.append('tahun', params.tahun);
    if (params?.status) q.append('status', params.status);
    const url = q.toString() ? `/api/realizations?${q.toString()}` : '/api/realizations';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal memuat data realisasi anggaran');
    return res.json();
  },

  async createRealization(data: Partial<BudgetRealizationRelease>, currentUser: { id: string; name: string; role: string }): Promise<BudgetRealizationRelease> {
    const res = await fetch('/api/realizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) throw new Error('Gagal menyimpan realisasi release');
    return res.json();
  },

  // Financial Analysis FS-BC
  async getAllFinancialAnalyses(): Promise<FinancialAnalysisFSBC[]> {
    const res = await fetch('/api/financial-analysis');
    if (!res.ok) throw new Error('Gagal memuat kajian finansial');
    return res.json();
  },

  async getFinancialAnalysis(prokerId: string): Promise<FinancialAnalysisFSBC> {
    const res = await fetch(`/api/financial-analysis/${prokerId}`);
    if (!res.ok) throw new Error('Kajian finansial belum tersedia');
    return res.json();
  },

  async saveFinancialAnalysis(data: Partial<FinancialAnalysisFSBC>, currentUser: { id: string; name: string; role: string }): Promise<FinancialAnalysisFSBC> {
    const res = await fetch('/api/financial-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) throw new Error('Gagal menyimpan kajian finansial');
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<SystemNotification[]> {
    const res = await fetch('/api/notifications');
    if (!res.ok) throw new Error('Gagal memuat notifikasi');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error('Gagal memuat catatan audit');
    return res.json();
  },

  // Users & PIC Management
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Gagal memuat daftar pengguna / PIC');
    return res.json();
  },

  async createUser(data: Partial<User>, currentUser: { id: string; name: string; role: string }): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menambahkan PIC / pengguna');
    }
    return res.json();
  },

  async updateUser(id: string, data: Partial<User>, currentUser: { id: string; name: string; role: string }): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memperbarui data PIC / pengguna');
    }
    return res.json();
  },

  async deleteUser(id: string, currentUser: { id: string; name: string; role: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus pengguna');
    }
    return res.json();
  },

  async assignProkerPic(
    prokerId: string,
    data: { ownerPic: string; ownerCategory: string; subdit?: string; divisiUnitKerja?: string; catatan?: string },
    currentUser: { id: string; name: string; role: string }
  ): Promise<WorkProgram> {
    const res = await fetch(`/api/proker/${prokerId}/assign-pic`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mengubah penugasan PIC program kerja');
    }
    return res.json();
  },

  // Import Excel
  async importExcel(formData: FormData): Promise<{ success: boolean; totalProcessed: number; importedCount: number; errors: string[] }> {
    const res = await fetch('/api/import/excel', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mengimpor file Excel');
    }
    return res.json();
  }
};

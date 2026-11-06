import React, { useState, useMemo } from 'react';
import {
  Users2,
  Shield,
  ShieldCheck,
  Check,
  X as XIcon,
  UserCheck,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Search,
  Briefcase,
  Mail,
  Building,
  UserCog,
  AlertCircle,
  FileText
} from 'lucide-react';
import { User, UserRole, WorkProgram } from '../types';

interface UsersViewProps {
  currentUser: User;
  users: User[];
  workPrograms?: WorkProgram[];
  onSwitchUser: (user: User) => void;
  onRefresh: () => void;
  onCreateUser: (data: Partial<User>) => Promise<void>;
  onUpdateUser: (id: string, data: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UsersView: React.FC<UsersViewProps> = ({
  currentUser,
  users,
  workPrograms = [],
  onSwitchUser,
  onRefresh,
  onCreateUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('Semua');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    unitKerja: string;
  }>({
    name: '',
    email: '',
    role: 'PIC Proker',
    unitKerja: ''
  });

  const availableRoles: UserRole[] = [
    'Administrator',
    'VP/Manager',
    'PIC Proker',
    'Analyst Investment',
    'Reviewer Dokumen',
    'Auditor/Viewer'
  ];

  // Hitung jumlah proker per PIC
  const picProkerCountMap = useMemo(() => {
    const map = new Map<string, number>();
    workPrograms.forEach(p => {
      if (p.ownerPic) {
        map.set(p.ownerPic, (map.get(p.ownerPic) || 0) + 1);
      }
    });
    return map;
  }, [workPrograms]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.unitKerja.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase());

      const matchRole = selectedRoleFilter === 'Semua' || u.role === selectedRoleFilter;

      return matchSearch && matchRole;
    });
  }, [users, search, selectedRoleFilter]);

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      unitKerja: user.unitKerja
    });
    setFormError('');
    setShowEditModal(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      role: 'PIC Proker',
      unitKerja: 'Subdit Consumer Business'
    });
    setFormError('');
    setShowCreateModal(true);
  };

  // Submit Edit User (Nama PIC & Role PIC)
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formData.name.trim()) {
      setFormError('Nama PIC / Pengguna tidak boleh kosong');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateUser(editingUser.id, formData);
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Create User
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama PIC / Pengguna wajib diisi');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateUser(formData);
      setShowCreateModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat pengguna');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      setIsSubmitting(true);
      await onDeleteUser(deletingUser.id);
      setShowDeleteModal(false);
      setDeletingUser(null);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menghapus pengguna');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'Administrator':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'VP/Manager':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'PIC Proker':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Analyst Investment':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Reviewer Dokumen':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Auditor/Viewer':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'Administrator':
        return 'Hak penuh: CRUD program kerja, verifikasi dokumen, kelola pengguna & PIC, audit trail, serta ekspor/impor data.';
      case 'VP/Manager':
        return 'Persetujuan eksekutif: Review & validasi program kerja, otorisasi FS-BC, verifikasi dokumen, dan pemantauan realisasi.';
      case 'PIC Proker':
        return 'Penanggung Jawab Proker: Pembaruan progres fisik, unggah dokumen (PKS/SPK/Invoice), serta pelaporan kendala proyek.';
      case 'Analyst Investment':
        return 'Kajian Finansial: Mengkaji FS-BC, input simulasi arus kas, evaluasi ROI/NPV/IRR/BEP, dan rekomendasi kelayakan investasi.';
      case 'Reviewer Dokumen':
        return 'Verifikasi Legal & Kontrak: Memeriksa keabsahan berkas PKS, SPK, BAPP, dan invoice vendor rekanan.';
      case 'Auditor/Viewer':
        return 'Pengawasan (Read-Only): Akses pengawasan laporan kepatuhan, audit trail, dan rekap historis tanpa hak modifikasi data.';
    }
  };

  const permissionsMatrix = [
    {
      feature: 'Dashboard KPI & Grafik Analitik',
      admin: true,
      vp: true,
      pic: true,
      analyst: true,
      reviewer: true,
      auditor: true
    },
    {
      feature: 'Tambah / Buat Program Kerja Baru',
      admin: true,
      vp: true,
      pic: true,
      analyst: false,
      reviewer: false,
      auditor: false
    },
    {
      feature: 'Edit Metadata, Nilai Finansial & PIC Proker',
      admin: true,
      vp: true,
      pic: true,
      analyst: false,
      reviewer: false,
      auditor: false
    },
    {
      feature: 'Hapus Program Kerja (Delete Confirmation)',
      admin: true,
      vp: false,
      pic: false,
      analyst: false,
      reviewer: false,
      auditor: false
    },
    {
      feature: 'Upload & Update Dokumen Kontrak / SPK / Invoice',
      admin: true,
      vp: true,
      pic: true,
      analyst: true,
      reviewer: true,
      auditor: false
    },
    {
      feature: 'Unduh Berkas Asli Dokumen Investasi',
      admin: true,
      vp: true,
      pic: true,
      analyst: true,
      reviewer: true,
      auditor: true
    },
    {
      feature: 'Verifikasi & Pengesahan Dokumen (Sah / Revisi)',
      admin: true,
      vp: true,
      pic: false,
      analyst: true,
      reviewer: true,
      auditor: false
    },
    {
      feature: 'Pencatatan Progres Fisik Berkala',
      admin: true,
      vp: true,
      pic: true,
      analyst: false,
      reviewer: false,
      auditor: false
    },
    {
      feature: 'Pencatatan Realisasi Anggaran BSU OGP',
      admin: true,
      vp: true,
      pic: true,
      analyst: false,
      reviewer: false,
      auditor: false
    },
    {
      feature: 'Kajian & Keputusan Kelayakan FS-BC',
      admin: true,
      vp: true,
      pic: false,
      analyst: true,
      reviewer: false,
      auditor: false
    },
    {
      feature: 'Import & Export Excel Database',
      admin: true,
      vp: true,
      pic: true,
      analyst: true,
      reviewer: true,
      auditor: true
    },
    {
      feature: 'Audit Trail & Edit Role/Nama PIC Pengguna',
      admin: true,
      vp: false,
      pic: false,
      analyst: false,
      reviewer: false,
      auditor: false
    }
  ];

  const canManageUsers = ['Administrator', 'VP/Manager'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111e3f] border border-[#203463] p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Manajemen Pengguna & Pengendalian PIC (Role & Nama PIC)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pengaturan kewenangan RBAC, perubahan Role PIC, Nama PIC penanggung jawab, dan struktur unit kerja PT Pos Indonesia
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 bg-[#18294e] border border-orange-500/40 rounded-xl flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-slate-300">
              Role Anda: <strong className="text-orange-400">{currentUser.role}</strong>
            </span>
          </div>

          {canManageUsers && (
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah PIC / Pengguna</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#111e3f] border border-[#203463] p-3.5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase text-slate-300">Total PIC Terdaftar</span>
            <Users2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-extrabold text-white font-mono">{users.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">Akun pengguna sistem</p>
        </div>

        <div className="bg-[#111e3f] border border-[#203463] p-3.5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase text-blue-300">PIC Proker Aktif</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-extrabold text-blue-400 font-mono">
            {users.filter(u => u.role === 'PIC Proker').length}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Penanggung jawab teknis</p>
        </div>

        <div className="bg-[#111e3f] border border-[#203463] p-3.5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase text-amber-300">Admin & Manager</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-amber-400 font-mono">
            {users.filter(u => ['Administrator', 'VP/Manager'].includes(u.role)).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Otoritas persetujuan</p>
        </div>

        <div className="bg-[#111e3f] border border-[#203463] p-3.5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase text-emerald-300">Total Proker Ditugaskan</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-400 font-mono">
            {workPrograms.length}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Proker investasi aktif</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama PIC, role, email, unit kerja..."
            className="w-full bg-[#0d1733] border border-[#213565] text-white text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Filter Role:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="bg-[#0d1733] border border-[#213565] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="Semua">Semua Role PIC</option>
            {availableRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* User & PIC Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400 bg-[#13203c] border border-[#1e325c] rounded-2xl">
            Tidak ada pengguna atau PIC yang cocok dengan pencarian.
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isCurrent = u.id === currentUser.id;
            const assignedCount = picProkerCountMap.get(u.name) || 0;

            return (
              <div
                key={u.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-[#15254d] border-orange-500 shadow-xl shadow-orange-500/10'
                    : 'bg-[#13203c] border-[#1e325c] hover:border-[#2b4782]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3368] to-[#122144] border border-orange-500/40 flex items-center justify-center font-bold text-orange-400 text-sm font-mono shadow-md">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-snug">
                          {u.name}
                        </h4>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded border text-[10px] font-semibold font-mono ${getRoleBadgeStyle(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded bg-orange-500 text-white font-mono text-[9px] font-bold tracking-wider">
                        AKTIF
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-[11px]">{u.unitKerja}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 pt-1">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-medium text-emerald-400">
                        {assignedCount} Program Kerja Ditugaskan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#1c2c54] flex items-center gap-2">
                  {canManageUsers && (
                    <button
                      onClick={() => handleOpenEdit(u)}
                      title="Edit Nama PIC & Role PIC"
                      className="flex-1 py-1.5 px-3 bg-[#18294e] hover:bg-orange-500 hover:text-white text-orange-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#273e72] transition-colors"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span>Edit PIC & Role</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSwitchUser(u)}
                    disabled={isCurrent}
                    title={isCurrent ? 'Profil aktif' : 'Simulasikan sebagai user ini'}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-orange-500/20 text-orange-400 cursor-default opacity-80'
                        : 'bg-[#182a55] hover:bg-blue-600 hover:text-white text-slate-200 border border-[#273e72]'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isCurrent ? 'Aktif' : 'Simulasi'}</span>
                  </button>

                  {canManageUsers && (
                    <button
                      onClick={() => {
                        setDeletingUser(u);
                        setShowDeleteModal(true);
                      }}
                      disabled={isCurrent || (u.role === 'Administrator' && users.filter(x => x.role === 'Administrator').length <= 1)}
                      title="Hapus PIC"
                      className="p-1.5 bg-[#18294e] hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-[#273e72] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RBAC Permission Matrix Table */}
      <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[#0d1733] border-b border-[#1c2c54] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Matriks Otorisasi & Hak Akses Fitur (Least Privilege Policy PT Pos)
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">Enforced at API & UI</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1c2c54] text-slate-400 bg-[#0b142b]">
                <th className="py-3 px-4 font-semibold">Fitur & Operasi Sistem</th>
                <th className="py-3 px-3 font-semibold text-center">Administrator</th>
                <th className="py-3 px-3 font-semibold text-center">VP/Manager</th>
                <th className="py-3 px-3 font-semibold text-center">PIC Proker</th>
                <th className="py-3 px-3 font-semibold text-center">Analyst</th>
                <th className="py-3 px-3 font-semibold text-center">Reviewer</th>
                <th className="py-3 px-3 font-semibold text-center">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2c54]/60">
              {permissionsMatrix.map((p, idx) => (
                <tr key={idx} className="hover:bg-[#18294e]/70">
                  <td className="py-2.5 px-4 text-white font-medium">{p.feature}</td>
                  <td className="py-2.5 px-3 text-center">
                    {p.admin ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.vp ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.pic ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.analyst ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.reviewer ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.auditor ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDIT ROLE PIC & NAMA PIC */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1c2c54] flex items-center justify-between bg-[#0e1935]">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">
                  Edit Role PIC & Nama PIC
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nama PIC */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Nama Lengkap / Nama PIC *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso, S.T., M.M."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-medium focus:border-orange-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * Mengubah nama PIC akan otomatis memperbarui penugasan pada seluruh program kerja terkait.
                </p>
              </div>

              {/* Role PIC */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Role PIC / Hak Akses Sistem *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-semibold focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r} className="bg-[#0d1733]">
                      {r}
                    </option>
                  ))}
                </select>
                <div className="mt-2 p-2.5 bg-[#0d1733] border border-[#1e325c] rounded-lg text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-orange-400 block mb-0.5">Kewenangan Role {formData.role}:</strong>
                  {getRoleDescription(formData.role)}
                </div>
              </div>

              {/* Email Kedinasan */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Email Kedinasan Pos Indonesia
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nama.pic@posindonesia.co.id"
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Unit Kerja */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Unit Kerja / Subdit / Direktorat
                </label>
                <input
                  type="text"
                  value={formData.unitKerja}
                  onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                  placeholder="Contoh: Subdit Consumer Business / Kantor Pusat"
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-[#18294e] hover:bg-[#203666] text-slate-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan PIC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH PIC / PENGGUNA BARU */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1c2c54] flex items-center justify-between bg-[#0e1935]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">
                  Tambah PIC / Pengguna Baru
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nama PIC */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Nama Lengkap / Nama PIC *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Pratama Surya, S.T."
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-medium focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Role PIC */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Role PIC / Hak Akses Sistem *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white font-semibold focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r} className="bg-[#0d1733]">
                      {r}
                    </option>
                  ))}
                </select>
                <div className="mt-2 p-2.5 bg-[#0d1733] border border-[#1e325c] rounded-lg text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-orange-400 block mb-0.5">Kewenangan Role {formData.role}:</strong>
                  {getRoleDescription(formData.role)}
                </div>
              </div>

              {/* Email Kedinasan */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Email Kedinasan Pos Indonesia
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nama.pic@posindonesia.co.id"
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Unit Kerja */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Unit Kerja / Subdit / Direktorat
                </label>
                <input
                  type="text"
                  value={formData.unitKerja}
                  onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                  placeholder="Contoh: Subdit Financial Policy & Asset Management"
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#18294e] hover:bg-[#203666] text-slate-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Daftarkan PIC Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HAPUS PENGGUNA */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Hapus Pengguna / PIC</h3>
              <p className="text-xs text-slate-300 mt-2">
                Apakah Anda yakin ingin menghapus <strong>{deletingUser.name}</strong> ({deletingUser.role})? Tindakan ini akan dicatat dalam audit trail.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-[#18294e] hover:bg-[#203666] text-slate-300 text-xs font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

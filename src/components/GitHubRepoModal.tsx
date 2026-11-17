import React, { useEffect, useState } from 'react';
import {
  Github,
  FolderGit2,
  FolderPlus,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  X,
  Lock,
  Globe,
  UploadCloud,
  FileCode
} from 'lucide-react';
import { GitHubRepoConfig, GitHubRepoSummary, GitHubStatusResponse } from '../types';

interface GitHubRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubStatus: GitHubStatusResponse | null;
  onStatusChanged: () => Promise<void> | void;
  onDocumentsSynced: () => void;
}

export const GitHubRepoModal: React.FC<GitHubRepoModalProps> = ({
  isOpen,
  onClose,
  githubStatus,
  onStatusChanged,
  onDocumentsSynced
}) => {
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepoFull, setSelectedRepoFull] = useState('');
  const [branch, setBranch] = useState('main');
  const [folderPath, setFolderPath] = useState('dokumen-investasi-capex');
  const [organizeByYearType, setOrganizeByYearType] = useState(true);
  const [autoSyncOnUpload, setAutoSyncOnUpload] = useState(true);

  // Create new repo panel
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('dalista-capex-documents');
  const [newRepoDesc, setNewRepoDesc] = useState(
    'Repositori arsip dokumen investasi CAPEX PT Pos Indonesia (PKS, SPK, Invoice, BAPP, FS-BC)'
  );
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);

  // Live GitHub folder contents
  const [folderFiles, setFolderFiles] = useState<
    Array<{ name: string; path: string; size: number; htmlUrl: string }>
  >([]);
  const [folderUrl, setFolderUrl] = useState('');
  const [loadingFolderFiles, setLoadingFolderFiles] = useState(false);

  // UI feedback
  const [oauthUrlFallback, setOauthUrlFallback] = useState<string | null>(null);
  const [oauthSetupNeeded, setOauthSetupNeeded] = useState<{ callbackUrl: string; message: string } | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [busyAction, setBusyAction] = useState<'connect' | 'save' | 'create' | 'syncAll' | 'disconnect' | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Sync local form fields from githubStatus
  useEffect(() => {
    if (githubStatus?.repoConfig) {
      const cfg = githubStatus.repoConfig;
      if (cfg.owner && cfg.repo) {
        setSelectedRepoFull(`${cfg.owner}/${cfg.repo}`);
      }
      setBranch(cfg.branch || 'main');
      setFolderPath(cfg.folderPath || 'dokumen-investasi-capex');
      setOrganizeByYearType(cfg.organizeByYearType !== false);
      setAutoSyncOnUpload(cfg.autoSyncOnUpload !== false);
    }
  }, [githubStatus]);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch {
      // ignore transient error
    } finally {
      setLoadingRepos(false);
    }
  };

  const loadFolderFiles = async () => {
    setLoadingFolderFiles(true);
    try {
      const res = await fetch('/api/github/folder-files');
      if (res.ok) {
        const data = await res.json();
        setFolderFiles(data.files || []);
        setFolderUrl(data.folderUrl || '');
      }
    } catch {
      // ignore
    } finally {
      setLoadingFolderFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen && githubStatus?.connected) {
      loadRepos();
      if (githubStatus.repoConfig?.repo) {
        loadFolderFiles();
      }
    }
    if (isOpen) {
      setModalError(null);
      setModalSuccess(null);
      setOauthSetupNeeded(null);
      setOauthUrlFallback(null);
    }
  }, [isOpen, githubStatus?.connected]);

  if (!isOpen) return null;

  const handleConnectGithub = async () => {
    setBusyAction('connect');
    setModalError(null);
    setModalSuccess(null);
    setOauthSetupNeeded(null);
    setOauthUrlFallback(null);

    try {
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'GITHUB_OAUTH_NOT_CONFIGURED') {
          setOauthSetupNeeded({
            callbackUrl: data.callbackUrl,
            message: data.message
          });
          return;
        }
        throw new Error(data.message || data.error || 'Gagal mendapatkan URL otorisasi GitHub.');
      }

      const authWin = window.open(data.url, 'oauth_popup', 'width=600,height=720');
      if (!authWin) {
        setOauthUrlFallback(data.url);
        setModalError('Popup diblokir browser. Klik tautan langsung di bawah ini untuk menghubungkan GitHub.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Gagal memulai koneksi OAuth GitHub.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDisconnect = async () => {
    setBusyAction('disconnect');
    setModalError(null);
    try {
      await fetch('/api/github/disconnect', { method: 'POST' });
      setRepos([]);
      setFolderFiles([]);
      setSelectedRepoFull('');
      await onStatusChanged();
      setModalSuccess('Koneksi akun GitHub telah diputuskan.');
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) {
      setModalError('Masukkan nama repositori GitHub baru.');
      return;
    }
    setBusyAction('create');
    setModalError(null);
    setModalSuccess(null);

    try {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRepoName.trim(),
          description: newRepoDesc.trim(),
          isPrivate: newRepoPrivate,
          folderPath,
          organizeByYearType,
          autoSyncOnUpload
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat repositori GitHub.');

      setShowCreateRepo(false);
      setSelectedRepoFull(data.repo.fullName);
      setBranch(data.repo.defaultBranch || 'main');
      await loadRepos();
      await onStatusChanged();
      await loadFolderFiles();
      setModalSuccess(`Repositori baru ${data.repo.fullName} berhasil dibuat dan dihubungkan!`);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoFull) {
      setModalError('Pilih repositori GitHub tujuan terlebih dahulu atau buat repositori baru.');
      return;
    }
    const [owner, repo] = selectedRepoFull.split('/');
    if (!owner || !repo) {
      setModalError('Format repositori tidak valid.');
      return;
    }

    setBusyAction('save');
    setModalError(null);
    setModalSuccess(null);

    try {
      const payload: GitHubRepoConfig = {
        owner,
        repo,
        branch: branch.trim() || 'main',
        folderPath: folderPath.trim().replace(/^\/+|\/+$/g, '') || 'dokumen-investasi-capex',
        organizeByYearType,
        autoSyncOnUpload
      };
      const res = await fetch('/api/github/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan konfigurasi folder GitHub.');

      await onStatusChanged();
      await loadFolderFiles();
      setModalSuccess(`Repositori ${owner}/${repo} (folder: ${payload.folderPath}) berhasil disimpan!`);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSyncAll = async () => {
    setBusyAction('syncAll');
    setModalError(null);
    setModalSuccess(null);
    try {
      const res = await fetch('/api/documents/sync-all-github', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyinkronkan dokumen ke GitHub.');

      let msg = `Berhasil mengunggah ${data.syncedCount} file dokumen ke folder GitHub!`;
      if (data.skippedMissingCount > 0) {
        msg += ` (${data.skippedMissingCount} dokumen dilewati karena isi file sebelumnya belum di-upload ulang).`;
      }
      if (data.errorCount > 0) {
        msg += ` ${data.errorCount} dokumen gagal.`;
      }
      setModalSuccess(msg);
      onDocumentsSynced();
      await loadFolderFiles();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const copyText = (txt: string) => {
    navigator.clipboard?.writeText(txt);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const cleanFolderPreview = (folderPath || 'dokumen-investasi-capex').trim().replace(/^\/+|\/+$/g, '');
  const samplePathPreview = organizeByYearType
    ? `${cleanFolderPreview}/TA-2026/PKS/DOC-xxx_NamaFile.pdf`
    : `${cleanFolderPreview}/DOC-xxx_NamaFile.pdf`;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-white">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Integrasi Repositori & Folder GitHub
              </h3>
              <p className="text-[11px] text-slate-400">
                Hubungkan akun GitHub Anda agar file dokumen CAPEX otomatis tersimpan di folder repositori GitHub.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banners */}
        {modalSuccess && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3.5 py-2.5 rounded-xl flex items-start gap-2 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{modalSuccess}</span>
          </div>
        )}
        {modalError && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-3.5 py-2.5 rounded-xl flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{modalError}</span>
          </div>
        )}

        {/* OAuth Not Configured Help Panel */}
        {oauthSetupNeeded && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 space-y-2.5 text-xs text-amber-100">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Konfigurasi OAuth App GitHub Diperlukan (AI Studio Secrets)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Untuk menghubungkan akun GitHub (<strong className="text-white">akdamkurnia@gmail.com</strong>) secara aman lewat OAuth, buat GitHub OAuth App terlebih dahulu lalu tambahkan <code className="text-amber-300 font-mono">GITHUB_CLIENT_ID</code> dan <code className="text-amber-300 font-mono">GITHUB_CLIENT_SECRET</code> pada menu Secrets AI Studio:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>
                Buka{' '}
                <a
                  href="https://github.com/settings/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  GitHub Developer Settings (OAuth Apps)
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                dan klik <strong>New OAuth App</strong>.
              </li>
              <li>
                Masukkan <strong>Authorization callback URL</strong> persis seperti berikut:
                <div className="mt-1 flex items-center gap-2 bg-[#0b132b] border border-[#24396b] rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-cyan-300">
                  <span className="truncate flex-1">{oauthSetupNeeded.callbackUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyText(oauthSetupNeeded.callbackUrl)}
                    className="px-2 py-0.5 bg-[#18294e] hover:bg-[#233b6e] text-white rounded flex items-center gap-1 shrink-0"
                  >
                    {copiedCallback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCallback ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>
              </li>
              <li>
                Salin <strong>Client ID</strong> dan <strong>Client Secret</strong> ke AI Studio Secrets sebagai{' '}
                <code className="text-white font-mono">GITHUB_CLIENT_ID</code> &{' '}
                <code className="text-white font-mono">GITHUB_CLIENT_SECRET</code>, lalu klik <strong>Hubungkan Akun GitHub</strong> lagi.
              </li>
            </ol>
          </div>
        )}

        {oauthUrlFallback && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-200 flex items-center justify-between gap-2">
            <span>Klik tautan ini untuk melanjutkan otorisasi di tab baru:</span>
            <a
              href={oauthUrlFallback}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold inline-flex items-center gap-1 shrink-0"
            >
              <span>Buka GitHub OAuth</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Step 1: Account Connection */}
        <div className="bg-[#0b1429] border border-[#1e325c] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Koneksi Akun GitHub
            </span>
            {githubStatus?.connected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                <CheckCircle className="w-3 h-3" />
                <span>Terhubung</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-[11px]">
                Belum Terhubung
              </span>
            )}
          </div>

          {githubStatus?.connected && githubStatus.user ? (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#13203c] border border-[#223969] rounded-xl p-3">
              <div className="flex items-center gap-3">
                {githubStatus.user.avatarUrl ? (
                  <img
                    src={githubStatus.user.avatarUrl}
                    alt={githubStatus.user.login}
                    className="w-10 h-10 rounded-full border border-slate-600"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white">
                    <Github className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>@{githubStatus.user.login}</span>
                    {githubStatus.user.name && githubStatus.user.name !== githubStatus.user.login && (
                      <span className="text-xs font-normal text-slate-400">({githubStatus.user.name})</span>
                    )}
                  </div>
                  <div className="text-xs text-cyan-300 font-mono">
                    {githubStatus.user.email || 'Email terverifikasi terhubung'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDisconnect}
                disabled={busyAction === 'disconnect'}
                className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putuskan</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Hubungkan akun GitHub Anda (contoh: <span className="text-slate-200 font-mono">akdamkurnia@gmail.com</span>) melalui OAuth resmi GitHub.
              </p>
              <button
                type="button"
                onClick={handleConnectGithub}
                disabled={busyAction === 'connect'}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all shadow"
              >
                <Github className="w-4 h-4" />
                <span>{busyAction === 'connect' ? 'Mempersiapkan...' : 'Hubungkan Akun GitHub'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 2 & 3: Repository & Folder Configuration (visible when connected) */}
        {githubStatus?.connected && (
          <div className="bg-[#0b1429] border border-[#1e325c] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4 text-orange-400" />
                <span>2. Pilih Repositori & Folder Tujuan</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadRepos}
                  disabled={loadingRepos}
                  className="text-[11px] text-cyan-300 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingRepos ? 'animate-spin' : ''}`} />
                  <span>Muat Ulang Repo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateRepo(!showCreateRepo)}
                  className="px-2.5 py-1 bg-[#18294e] hover:bg-[#233b6e] text-orange-300 border border-orange-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{showCreateRepo ? 'Tutup Form' : '+ Buat Repo Baru'}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Create Repository Form */}
            {showCreateRepo && (
              <form
                onSubmit={handleCreateRepo}
                className="bg-[#13203c] border border-orange-500/30 rounded-xl p-3.5 space-y-3 text-xs"
              >
                <div className="font-bold text-orange-300 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4" />
                  <span>Buat Repositori Baru di Akun GitHub Anda</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nama Repositori *</label>
                    <input
                      type="text"
                      required
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="dalista-capex-documents"
                      className="w-full bg-[#0b132b] border border-[#24396b] rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Visibilitas</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRepoPrivate(true)}
                        className={`flex-1 py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                          newRepoPrivate
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-[#0b132b] border-[#24396b] text-slate-400'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Private</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRepoPrivate(false)}
                        className={`flex-1 py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                          !newRepoPrivate
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                            : 'bg-[#0b132b] border-[#24396b] text-slate-400'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Public</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    className="w-full bg-[#0b132b] border border-[#24396b] rounded-lg p-2 text-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busyAction === 'create'}
                    className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg disabled:opacity-50"
                  >
                    {busyAction === 'create' ? 'Membuat Repo...' : 'Buat & Hubungkan Repo'}
                  </button>
                </div>
              </form>
            )}

            {/* Repo + Folder Config Form */}
            <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Repositori Tujuan *</label>
                  <select
                    value={selectedRepoFull}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedRepoFull(val);
                      const found = repos.find((r) => r.fullName === val);
                      if (found?.defaultBranch) setBranch(found.defaultBranch);
                    }}
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  >
                    <option value="">-- Pilih Repositori GitHub --</option>
                    {repos.map((r) => (
                      <option key={r.id} value={r.fullName}>
                        {r.fullName} {r.private ? '(Private)' : '(Public)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Folder Penyimpanan di GitHub *
                </label>
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="dokumen-investasi-capex"
                  className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2 text-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Contoh struktur path tersimpan:{' '}
                  <code className="text-cyan-300 font-mono">
                    {selectedRepoFull || 'owner/repo'}/{samplePathPreview}
                  </code>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-center gap-2 bg-[#13203c] border border-[#213565] rounded-lg p-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={organizeByYearType}
                    onChange={(e) => setOrganizeByYearType(e.target.checked)}
                    className="accent-orange-500"
                  />
                  <span className="text-slate-200">
                    Kelompokkan subfolder per Tahun & Jenis (<code className="text-orange-300">TA-2026/PKS</code>)
                  </span>
                </label>

                <label className="flex items-center gap-2 bg-[#13203c] border border-[#213565] rounded-lg p-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncOnUpload}
                    onChange={(e) => setAutoSyncOnUpload(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-slate-200">
                    Otomatis simpan ke GitHub setiap upload file baru
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1c2c54]">
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={!selectedRepoFull || busyAction === 'syncAll'}
                  className="px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-40"
                >
                  <UploadCloud className={`w-4 h-4 ${busyAction === 'syncAll' ? 'animate-pulse' : ''}`} />
                  <span>{busyAction === 'syncAll' ? 'Menyinkronkan...' : 'Sync Semua Dokumen ke Folder GitHub'}</span>
                </button>

                <button
                  type="submit"
                  disabled={!selectedRepoFull || busyAction === 'save'}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-lg shadow disabled:opacity-40"
                >
                  {busyAction === 'save' ? 'Menyimpan...' : 'Simpan Pengaturan Folder'}
                </button>
              </div>
            </form>

            {/* Live Folder Contents Preview */}
            {githubStatus.repoConfig?.repo && (
              <div className="bg-[#091124] border border-[#1c2c54] rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Isi Folder di GitHub ({folderFiles.length} file)</span>
                  </span>
                  <div className="flex items-center gap-3">
                    {folderUrl && (
                      <a
                        href={folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Buka Folder di GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={loadFolderFiles}
                      className="text-slate-400 hover:text-white"
                      title="Refresh daftar file di folder GitHub"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingFolderFiles ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {folderFiles.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-2">
                    Folder ini belum berisi file. Upload dokumen baru atau klik &quot;Sync Semua Dokumen ke Folder GitHub&quot;.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {folderFiles.map((f) => (
                      <a
                        key={f.path}
                        href={f.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#111e3f] hover:bg-[#192b59] border border-[#1f3466] text-[11px] transition-colors"
                      >
                        <span className="font-mono text-slate-200 truncate mr-2">{f.path}</span>
                        <span className="text-cyan-400 shrink-0 flex items-center gap-1">
                          <span>{(f.size / 1024).toFixed(1)} KB</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

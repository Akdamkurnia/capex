import React, { useState } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  User,
  Calendar,
  Building,
  Tag,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { InvestmentDocument, User as UserModel } from '../types';
import { formatRupiah, formatDateIndo, formatFileSize } from '../utils/formatters';

interface DocumentPreviewModalProps {
  document: InvestmentDocument | null;
  currentUser: UserModel;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: any, notes: string) => Promise<void>;
  onDownload: (doc: InvestmentDocument) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  currentUser,
  onClose,
  onUpdateStatus,
  onDownload
}) => {
  if (!document) return null;

  const [activeTab, setActiveTab] = useState<'preview' | 'history' | 'metadata'>('preview');
  const [newStatus, setNewStatus] = useState(document.statusVerifikasi);
  const [reviewNotes, setReviewNotes] = useState(document.catatanReviewer || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const canVerify = ['Administrator', 'VP/Manager', 'Reviewer Dokumen', 'Analyst Investment'].includes(currentUser.role);

  const handleSaveVerification = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(document.id, newStatus, reviewNotes);
    } finally {
      setIsUpdating(false);
    }
  };

  const isPdf = document.tipeMime?.includes('pdf') || document.namaFileAsli?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in">
      <div className="bg-[#0f1b38] border border-[#233a6b] rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-3.5 bg-[#0b142b] border-b border-[#1c2c54] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold font-mono">
                  {document.jenisDokumen}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {document.nomorDokumen}
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-mono text-orange-400">
                  v{document.versi}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white leading-tight mt-0.5 truncate max-w-xl">
                {document.namaDokumen}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(document)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#182a55] hover:bg-orange-500 hover:text-white text-orange-400 rounded-lg text-xs font-semibold border border-[#2b4480] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File Asli</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-[#0d1733] border-b border-[#1c2c54] flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Preview Dokumen
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'metadata'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Metadata & Rincian
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Riwayat Versi ({document.riwayatVersi?.length || 0})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main Content Area */}
          <div className="flex-1 bg-[#091124] overflow-y-auto p-4 flex flex-col items-center justify-center">
            {activeTab === 'preview' && (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {isPdf ? (
                  <iframe
                    src={`/api/documents/${document.id}/preview`}
                    className="w-full h-full rounded-xl border border-[#1e325c] bg-white shadow-inner"
                    title={document.namaDokumen}
                  />
                ) : (
                  <div className="bg-[#13203c] border border-[#1e325c] rounded-2xl p-8 max-w-lg text-center space-y-4">
                    <FileText className="w-16 h-16 text-orange-400 mx-auto" />
                    <h4 className="text-base font-bold text-white">{document.namaFileAsli}</h4>
                    <p className="text-xs text-slate-400">
                      Format file ini ({document.tipeMime || 'dokumen office'}) didukung untuk pengunduhan langsung.
                    </p>
                    <button
                      onClick={() => onDownload(document)}
                      className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Unduh Dokumen Sekarang
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'metadata' && (
              <div className="w-full max-w-2xl bg-[#13203c] border border-[#1e325c] rounded-2xl p-6 space-y-4 text-xs text-slate-300">
                <h4 className="text-sm font-bold text-white border-b border-[#1c2c54] pb-2">
                  Metadata Lengkap Dokumen
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block">ID Dokumen:</span>
                    <span className="font-mono text-white font-semibold">{document.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Program Kerja Terkait:</span>
                    <span className="font-semibold text-blue-400">{document.kodeProker} - {document.namaProker}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nomor Dokumen:</span>
                    <span className="font-mono text-white font-semibold">{document.nomorDokumen}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jenis Dokumen:</span>
                    <span className="font-semibold text-orange-400">{document.jenisDokumen}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nama Vendor / Mitra:</span>
                    <span className="text-white font-medium">{document.namaVendor || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nilai Dokumen:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {document.nilaiDokumen ? formatRupiah(document.nilaiDokumen) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tanggal Dokumen:</span>
                    <span className="text-white">{formatDateIndo(document.tanggalDokumen)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tanggal Upload:</span>
                    <span className="text-white">{formatDateIndo(document.tanggalUpload)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nama File Asli:</span>
                    <span className="font-mono text-slate-200">{document.namaFileAsli}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Ukuran File:</span>
                    <span className="font-mono text-slate-200">{formatFileSize(document.ukuranFile)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">PIC Pengunggah:</span>
                    <span className="text-white">{document.picPengunggah}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Status Verifikasi:</span>
                    <span className="font-bold text-amber-400">{document.statusVerifikasi}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="w-full max-w-2xl bg-[#13203c] border border-[#1e325c] rounded-2xl p-6 space-y-4 text-xs">
                <h4 className="text-sm font-bold text-white border-b border-[#1c2c54] pb-2 flex items-center gap-2">
                  <History className="w-4 h-4 text-orange-400" />
                  <span>Riwayat Versi Dokumen</span>
                </h4>
                <div className="space-y-3">
                  {/* Current Active Version */}
                  <div className="p-3 bg-[#18294e] border border-orange-500/40 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-400 font-mono">Versi {document.versi} (Versi Aktif)</span>
                      <span className="text-slate-400 font-mono text-[11px]">{formatDateIndo(document.tanggalUpload)}</span>
                    </div>
                    <p className="font-mono text-white mt-1">{document.namaFileAsli} ({formatFileSize(document.ukuranFile)})</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">Diupload oleh: {document.picPengunggah}</p>
                  </div>

                  {/* Previous Versions */}
                  {document.riwayatVersi && document.riwayatVersi.length > 0 ? (
                    document.riwayatVersi.map((v, i) => (
                      <div key={i} className="p-3 bg-[#0d1733] border border-[#213565] rounded-xl text-slate-400">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-300 font-mono">Versi {v.versionNumber}</span>
                          <span className="font-mono text-[11px]">{formatDateIndo(v.uploadedAt)}</span>
                        </div>
                        <p className="font-mono text-slate-300 mt-1">{v.fileName} ({formatFileSize(v.fileSize)})</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Catatan: {v.changeNote || 'Revisi sebelumnya'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">Belum ada riwayat revisi versi sebelumnya.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Verification Panel */}
          <div className="w-full md:w-80 bg-[#111e3f] border-t md:border-t-0 md:border-l border-[#1c2c54] p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1c2c54] pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Panel Verifikasi & Tata Kelola
                </h4>
              </div>

              <div className="text-xs space-y-2">
                <div>
                  <label className="text-slate-400 block font-semibold mb-1">Status Verifikasi:</label>
                  {canVerify ? (
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full bg-[#0d1733] border border-[#213565] text-white rounded-lg p-2 font-medium focus:border-orange-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                      <option value="Terverifikasi">Terverifikasi (Sah)</option>
                      <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                    </select>
                  ) : (
                    <div className="p-2 rounded bg-[#0d1733] border border-[#213565] text-white font-semibold">
                      {document.statusVerifikasi}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 block font-semibold mb-1">Catatan Reviewer / Pemeriksa:</label>
                  {canVerify ? (
                    <textarea
                      rows={4}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Masukkan catatan verifikasi atau arahan perbaikan..."
                      className="w-full bg-[#0d1733] border border-[#213565] text-white rounded-lg p-2 focus:border-orange-500"
                    />
                  ) : (
                    <div className="p-2.5 rounded bg-[#0d1733] border border-[#213565] text-slate-300 min-h-[80px]">
                      {document.catatanReviewer || 'Tidak ada catatan khusus.'}
                    </div>
                  )}
                </div>

                {document.reviewedBy && (
                  <div className="bg-[#091124] p-2.5 rounded-lg border border-[#1b2c55] text-[11px] text-slate-400">
                    <p>Diverifikasi oleh: <span className="text-white font-medium">{document.reviewedBy}</span></p>
                    <p>Tanggal: <span className="text-white font-medium">{formatDateIndo(document.reviewedAt || '')}</span></p>
                  </div>
                )}
              </div>
            </div>

            {canVerify && (
              <div className="pt-4 border-t border-[#1c2c54]">
                <button
                  onClick={handleSaveVerification}
                  disabled={isUpdating}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Status Verifikasi'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

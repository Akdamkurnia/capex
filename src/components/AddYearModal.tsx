import React, { useState } from 'react';
import { Calendar, Plus, X, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface AddYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableYears: number[];
  currentUser: User;
  onAddYear: (year: number) => Promise<void>;
}

export const AddYearModal: React.FC<AddYearModalProps> = ({
  isOpen,
  onClose,
  availableYears,
  currentUser,
  onAddYear
}) => {
  const nextDefaultYear = availableYears.length > 0 ? Math.max(...availableYears) + 1 : 2027;
  const [newYear, setNewYear] = useState<number>(nextDefaultYear);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newYear || newYear < 2000 || newYear > 2100) {
      setError('Tahun anggaran harus antara tahun 2000 hingga 2100.');
      return;
    }

    if (availableYears.includes(newYear)) {
      setError(`Tahun anggaran ${newYear} sudah terdaftar dalam sistem.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddYear(newYear);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan tahun anggaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#111e3f] border border-[#24396b] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2c54]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span>Tambah Tahun Anggaran Investasi</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Tambahkan tahun anggaran baru untuk perencanaan dan pengendalian program kerja CAPEX PT Pos Indonesia.
          </p>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Tahun Anggaran (YYYY) *
            </label>
            <input
              type="number"
              min="2000"
              max="2100"
              required
              value={newYear}
              onChange={(e) => {
                setError(null);
                setNewYear(parseInt(e.target.value) || 0);
              }}
              placeholder="Contoh: 2027"
              className="w-full bg-[#0d1733] border border-[#213565] rounded-lg p-2.5 text-white font-mono text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="bg-[#0d1733] p-3 rounded-xl border border-[#213565]">
            <p className="text-[11px] text-slate-400 font-semibold mb-1">Tahun yang saat ini aktif:</p>
            <div className="flex flex-wrap gap-1.5">
              {availableYears.map(yr => (
                <span key={yr} className="px-2 py-0.5 bg-[#18294e] text-slate-300 rounded font-mono text-[11px]">
                  {yr}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1c2c54]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#18294e] text-slate-300 rounded-lg hover:bg-[#203666]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Tambah Tahun'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export function formatMiliar(val: number | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  const num = Math.abs(val) >= 1_000_000 ? val / 1_000_000_000 : val;
  const isNeg = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNeg ? `-${formatted}` : formatted;
}

export function formatRupiah(amount: number, unit: 'miliar' | 'rupiah' = 'miliar'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  
  if (unit === 'miliar') {
    const val = Math.abs(amount) >= 1_000_000 ? amount / 1_000_000_000 : amount;
    return `Rp ${val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
  }
  
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export function formatRupiahExact(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  const isNeg = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = `Rp ${Math.round(absVal).toLocaleString('id-ID')}`;
  return isNeg ? `-${formatted}` : formatted;
}



export function formatPercentage(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00%';
  return `${val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

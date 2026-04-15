export function formatCurrency(amount: number | string, currency = 'INR') {
  const n = Number(amount);
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(date));
}

export function formatShortDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(date));
}

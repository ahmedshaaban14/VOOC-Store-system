// Helper for formatting currency in Arabic (e.g. 1,500 ج.م or 1,500 د.ع)
export function formatCurrency(amount: number, currencySymbol: string = 'ج.م'): string {
  return new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount) + ' ' + currencySymbol;
}

// Format numbers with Arabic digits
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value);
}

// Format Date to Arabic format
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

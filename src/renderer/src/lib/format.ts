export const formatEuro = (value: number): string => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
export const formatNumber = (value: number, digits = 1): string => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value);
export const formatDate = (value: string | null): string => value ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T12:00:00`)) : '—';
export const today = (): string => new Date().toLocaleDateString('en-CA');
export const monthLabel = (value: string): string => {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(new Date(year, month - 1));
};

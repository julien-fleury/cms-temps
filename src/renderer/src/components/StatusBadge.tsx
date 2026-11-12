import { niveauRentabilite } from '../../../shared/calculations';

export function ProfitBadge({ ratio }: { ratio: number }) {
  const level = niveauRentabilite(ratio);
  const styles = { rentable: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', attention: 'bg-orange-50 text-orange-700 ring-orange-600/20', depassement: 'bg-red-50 text-red-700 ring-red-600/20' };
  const labels = { rentable: 'Rentable', attention: 'Attention', depassement: 'Dépassement' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[level]}`}>{labels[level]}</span>;
}

export function StatusBadge({ done }: { done: boolean }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${done ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>{done ? 'Terminée' : 'En cours'}</span>;
}

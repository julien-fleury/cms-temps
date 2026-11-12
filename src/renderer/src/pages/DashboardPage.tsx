import { useEffect, useState } from 'react';
import { BriefcaseBusiness, CircleCheck, Clock3, Euro, Timer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardData } from '../../../shared/types';
import { PageHeader } from '../components/PageHeader';
import { formatEuro, formatNumber, monthLabel } from '../lib/format';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => { void window.cms.dashboard().then(setData); }, []);
  if (!data) return <p className="text-sm text-slate-500">Chargement du tableau de bord…</p>;
  const cards = [
    ['Affaires actives', data.affairesActives, BriefcaseBusiness, 'bg-blue-50 text-blue-600'],
    ['Affaires terminées', data.affairesTerminees, CircleCheck, 'bg-emerald-50 text-emerald-600'],
    ['Heures du mois', `${formatNumber(data.heuresMois)} h`, Timer, 'bg-violet-50 text-violet-600'],
    ['Heures totales', `${formatNumber(data.heuresTotales)} h`, Clock3, 'bg-orange-50 text-orange-600'],
    ['CA total vendu', formatEuro(data.chiffreAffairesTotal), Euro, 'bg-teal-50 text-teal-600'],
  ] as const;
  return <>
    <PageHeader title="Tableau de bord" subtitle="Vue d’ensemble de votre activité et de la rentabilité." />
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">{cards.map(([label, value, Icon, color]) => <div className="card p-5" key={label}><div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={20} /></div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p></div>)}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-2">
      <div className="card p-6"><h2 className="text-base font-bold">Heures par mois</h2><p className="mt-1 text-sm text-slate-500">Volume de travail pointé</p><div className="mt-6 h-72"><ResponsiveContainer><BarChart data={data.heuresParMois}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="mois" tickFormatter={monthLabel} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [`${v} h`, 'Heures']} labelFormatter={(v) => monthLabel(String(v))} /><Bar dataKey="heures" fill="#197b64" radius={[6, 6, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer></div></div>
      <div className="card p-6"><h2 className="text-base font-bold">Rentabilité par affaire</h2><p className="mt-1 text-sm text-slate-500">Crédit restant en euros</p><div className="mt-6 h-72"><ResponsiveContainer><BarChart layout="vertical" data={data.rentabiliteParAffaire} margin={{ left: 24 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [formatEuro(Number(v)), 'Crédit restant']} /><Bar dataKey="credit" radius={[0, 6, 6, 0]} maxBarSize={28}>{data.rentabiliteParAffaire.map((row) => <Cell key={row.nom} fill={row.credit < 0 ? '#dc2626' : row.consommation >= 80 ? '#f59e0b' : '#10b981'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
    </section>
    <section className="card mt-6 p-6">
      <div className="flex items-start justify-between gap-6"><div><h2 className="text-base font-bold">CA produit par mois</h2><p className="mt-1 text-sm text-slate-500">Valorisation des heures pointées au taux horaire de référence</p></div><div className="rounded-xl bg-emerald-50 px-4 py-3 text-right"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total produit</p><p className="mt-1 text-xl font-bold text-emerald-800">{formatEuro(data.caProduitParMois.reduce((total, row) => total + row.ca, 0))}</p></div></div>
      <div className="mt-6 h-72"><ResponsiveContainer><BarChart data={data.caProduitParMois}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="mois" tickFormatter={monthLabel} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `${formatNumber(Number(value), 0)} €`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={72} /><Tooltip formatter={(value) => [formatEuro(Number(value)), 'CA produit']} labelFormatter={(value) => monthLabel(String(value))} /><Bar dataKey="ca" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={52} /></BarChart></ResponsiveContainer></div>
    </section>
  </>;
}

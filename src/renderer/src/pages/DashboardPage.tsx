import { useEffect, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, CircleCheck, Clock3, Euro, Hourglass, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardData } from '../../../shared/types';
import { PageHeader } from '../components/PageHeader';
import { formatEuro, formatNumber, monthLabel } from '../lib/format';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [periodeCa, setPeriodeCa] = useState<'mois' | 'annees'>('mois');
  useEffect(() => { void window.cms.dashboard().then(setData); }, []);
  if (!data) return <p className="text-sm text-slate-500">Chargement du tableau de bord…</p>;
  const caProduitTotal = data.caProduitParMois.reduce((total, row) => total + row.ca, 0);
  const heuresProductionTotal = data.caProduitParMois.reduce((total, row) => total + row.heures, 0);
  const ratioCaHeure = heuresProductionTotal > 0 ? caProduitTotal / heuresProductionTotal : 0;
  const caProduitParAnnee = Object.values(data.caProduitParMois.reduce<Record<string, { mois: string; heures: number; ca: number; caParHeure: number }>>((annees, row) => {
    const annee = row.mois.slice(0, 4);
    const courant = annees[annee] ?? { mois: annee, heures: 0, ca: 0, caParHeure: 0 };
    courant.heures += row.heures;
    courant.ca += row.ca;
    courant.caParHeure = courant.heures > 0 ? courant.ca / courant.heures : 0;
    annees[annee] = courant;
    return annees;
  }, {}));
  const donneesCa = periodeCa === 'mois' ? data.caProduitParMois : caProduitParAnnee;
  const libellePeriode = (value: string) => periodeCa === 'mois' ? monthLabel(value) : value;
  const cards = [
    ['Affaires actives', data.affairesActives, BriefcaseBusiness, 'bg-blue-50 text-blue-600'],
    ['Affaires terminées', data.affairesTerminees, CircleCheck, 'bg-emerald-50 text-emerald-600'],
    ['Heures du mois', `${formatNumber(data.heuresMois)} h`, Timer, 'bg-violet-50 text-violet-600'],
    ['Heures totales', `${formatNumber(data.heuresTotales)} h`, Clock3, 'bg-orange-50 text-orange-600'],
    ['Heures restantes', `${formatNumber(data.heuresRestantes)} h`, Hourglass, 'bg-amber-50 text-amber-600'],
    ['CA total vendu', formatEuro(data.chiffreAffairesTotal), Euro, 'bg-teal-50 text-teal-600'],
  ] as const;
  return <>
    <PageHeader title="Tableau de bord" subtitle="Vue d’ensemble de votre activité et de la rentabilité." />
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-6">{cards.map(([label, value, Icon, color]) => <div className="card p-5" key={label}><div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={20} /></div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p></div>)}</section>
    {data.alertes.length > 0 && <section className="card mt-6 overflow-hidden"><div className="flex items-center gap-3 border-b bg-orange-50 px-5 py-4 text-orange-800"><AlertTriangle size={20} /><h2 className="font-bold">Alertes de rentabilité</h2></div><div className="divide-y">{data.alertes.map((alerte) => <Link to={`/affaires/${alerte.affaireId}`} key={`${alerte.affaireId}-${alerte.message}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"><div><b className="text-sm text-slate-900">{alerte.nom}</b><p className={`mt-1 text-sm ${alerte.niveau === 'depassement' ? 'text-red-600' : 'text-orange-600'}`}>{alerte.message}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${alerte.niveau === 'depassement' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>{alerte.niveau === 'depassement' ? 'Dépassement' : 'Attention'}</span></Link>)}</div></section>}
    <section className="mt-6 grid gap-6 xl:grid-cols-2">
      <div className="card p-6"><h2 className="text-base font-bold">Heures par mois</h2><p className="mt-1 text-sm text-slate-500">Volume de travail pointé</p><div className="mt-6 h-72"><ResponsiveContainer><BarChart data={data.heuresParMois}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="mois" tickFormatter={monthLabel} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [`${v} h`, 'Heures']} labelFormatter={(v) => monthLabel(String(v))} /><Bar dataKey="heures" fill="#197b64" radius={[6, 6, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer></div></div>
      <div className="card p-6"><h2 className="text-base font-bold">Rentabilité par affaire</h2><p className="mt-1 text-sm text-slate-500">Crédit restant en euros</p><div className="mt-6 h-72"><ResponsiveContainer><BarChart layout="vertical" data={data.rentabiliteParAffaire} margin={{ left: 24 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [formatEuro(Number(v)), 'Crédit restant']} /><Bar dataKey="credit" radius={[0, 6, 6, 0]} maxBarSize={28}>{data.rentabiliteParAffaire.map((row) => <Cell key={row.nom} fill={row.credit < 0 ? '#dc2626' : row.consommation >= 80 ? '#f59e0b' : '#10b981'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
    </section>
    <section className="card mt-6 p-6">
      <div className="flex items-start justify-between gap-6"><div><div className="flex items-center gap-4"><h2 className="text-base font-bold">CA produit par {periodeCa === 'mois' ? 'mois' : 'année'}</h2><div className="flex rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setPeriodeCa('mois')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${periodeCa === 'mois' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Mois</button><button type="button" onClick={() => setPeriodeCa('annees')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${periodeCa === 'annees' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Années</button></div></div><p className="mt-1 text-sm text-slate-500">Valorisation des heures pointées et CA produit par heure</p><div className="mt-3 flex items-center gap-5 text-xs font-medium text-slate-500"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-teal-700" /> CA produit</span><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-orange-500" /> CA par heure</span></div></div><div className="flex gap-3"><div className="rounded-xl bg-orange-50 px-4 py-3 text-right"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Ratio moyen</p><p className="mt-1 text-xl font-bold text-orange-800">{formatEuro(ratioCaHeure)}/h</p></div><div className="rounded-xl bg-emerald-50 px-4 py-3 text-right"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total produit</p><p className="mt-1 text-xl font-bold text-emerald-800">{formatEuro(caProduitTotal)}</p></div></div></div>
      <div className="mt-6 h-72"><ResponsiveContainer><ComposedChart data={donneesCa}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="mois" tickFormatter={libellePeriode} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis yAxisId="ca" tickFormatter={(value) => `${formatNumber(Number(value), 0)} €`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={72} /><YAxis yAxisId="ratio" orientation="right" tickFormatter={(value) => `${formatNumber(Number(value), 0)} €/h`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={68} domain={['auto', 'auto']} /><Tooltip formatter={(value, name) => name === 'ca' ? [formatEuro(Number(value)), 'CA produit'] : [formatEuro(Number(value)) + '/h', 'CA par heure']} labelFormatter={(value) => libellePeriode(String(value))} /><Bar yAxisId="ca" dataKey="ca" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={52} /><Line yAxisId="ratio" type="monotone" dataKey="caParHeure" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6 }} /></ComposedChart></ResponsiveContainer></div>
    </section>
  </>;
}

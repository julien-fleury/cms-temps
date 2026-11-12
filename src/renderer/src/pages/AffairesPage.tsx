import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AffaireAvecStats } from '../../../shared/types';
import { AffaireFormModal } from '../components/AffaireFormModal';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { ProfitBadge, StatusBadge } from '../components/StatusBadge';
import { formatEuro, formatNumber } from '../lib/format';

type Filter = 'toutes' | 'encours' | 'terminees';
export function AffairesPage() {
  const [items, setItems] = useState<AffaireAvecStats[]>([]); const [query, setQuery] = useState(''); const [filter, setFilter] = useState<Filter>('toutes'); const [modal, setModal] = useState(false); const navigate = useNavigate();
  const load = () => window.cms.affaires.list().then(setItems);
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => items.filter((a) => (filter === 'toutes' || (filter === 'terminees' ? a.terminee : !a.terminee)) && `${a.nom} ${a.client}`.toLowerCase().includes(query.toLowerCase())), [items, query, filter]);
  return <>
    <PageHeader title="Affaires" subtitle={`${items.length} affaire${items.length > 1 ? 's' : ''} enregistrée${items.length > 1 ? 's' : ''}`} actions={<button className="btn-primary" onClick={() => setModal(true)}><Plus size={18} /> Nouvelle affaire</button>} />
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-5 border-b p-4"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className="field pl-10" placeholder="Rechercher par nom ou client…" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="flex rounded-lg bg-slate-100 p-1">{([['toutes', 'Toutes'], ['encours', 'En cours'], ['terminees', 'Terminées']] as const).map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}</div></div>
      {visible.length === 0 ? <EmptyState title="Aucune affaire" description="Modifiez vos filtres ou créez une nouvelle affaire." /> : <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr>{['Nom', 'Client', 'Prix HT', 'Heures passées', 'Crédit heures', 'Taux réel', 'Rentabilité', 'Statut'].map((h) => <th className="table-head" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y">{visible.map((a) => <tr key={a.id} onClick={() => navigate(`/affaires/${a.id}`)} className="cursor-pointer hover:bg-slate-50/80"><td className="table-cell font-semibold text-slate-900">{a.nom}</td><td className="table-cell">{a.client}</td><td className="table-cell tabular-nums">{formatEuro(a.montantVenduHt)}</td><td className="table-cell tabular-nums">{formatNumber(a.heuresConsommees)} h</td><td className={`table-cell font-semibold tabular-nums ${a.creditRestantHeures < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatNumber(a.creditRestantHeures)} h</td><td className="table-cell tabular-nums">{a.tauxHoraireReel === null ? '—' : `${formatEuro(a.tauxHoraireReel)}/h`}</td><td className="table-cell"><ProfitBadge ratio={a.ratioConsommation} /></td><td className="table-cell"><StatusBadge done={a.terminee} /></td></tr>)}</tbody></table></div>}
    </div>
    {modal && <AffaireFormModal onClose={() => setModal(false)} onSaved={() => { setModal(false); void load(); }} />}
  </>;
}

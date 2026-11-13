import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Edit3, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AffaireAvecStats, Pointage } from '../../../shared/types';
import { AffaireFormModal } from '../components/AffaireFormModal';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { ProfitBadge, StatusBadge } from '../components/StatusBadge';
import { formatDate, formatEuro, formatNumber } from '../lib/format';

export function AffaireDetailPage() {
  const id = Number(useParams().id); const navigate = useNavigate();
  const [affaire, setAffaire] = useState<AffaireAvecStats | null>(null); const [pointages, setPointages] = useState<Pointage[]>([]); const [edit, setEdit] = useState(false);
  const load = async () => { const [a, p] = await Promise.all([window.cms.affaires.get(id), window.cms.pointages.list(id)]); setAffaire(a); setPointages(p); };
  useEffect(() => { void load(); }, [id]);
  if (!affaire) return <p className="text-sm text-slate-500">Chargement de l’affaire…</p>;
  const removeAffaire = async () => { if (confirm(`Supprimer définitivement l’affaire « ${affaire.nom} » et tous ses pointages ?`)) { await window.cms.affaires.remove(id); navigate('/affaires'); } };
  const removePointage = async (pointageId: number) => { if (confirm('Supprimer ce pointage ?')) { await window.cms.pointages.remove(pointageId); await load(); } };
  const stats = [
    ['Heures consommées', `${formatNumber(affaire.heuresConsommees)} h`],
    ['Montant consommé', formatEuro(affaire.montantConsomme)],
    ['Crédit restant', formatEuro(affaire.creditRestantEuros)],
    ['Crédit heures', `${formatNumber(affaire.creditRestantHeures)} h`],
    ['Taux horaire réel', affaire.tauxHoraireReel === null ? '—' : `${formatEuro(affaire.tauxHoraireReel)}/h`],
  ];
  return <>
    <Link to="/affaires" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={17} /> Retour aux affaires</Link>
    <PageHeader title={affaire.nom} subtitle={affaire.client} actions={<><button className="btn-secondary" onClick={() => setEdit(true)}><Edit3 size={17} /> Modifier</button><button className="btn-danger" onClick={removeAffaire}><Trash2 size={17} /> Supprimer</button></>} />
    <section className="grid gap-6 xl:grid-cols-[1fr_2fr]">
      <div className="card p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Informations générales</h2><StatusBadge done={affaire.terminee} /></div><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-slate-400">Prix vendu HT</dt><dd className="mt-1 font-semibold">{formatEuro(affaire.montantVenduHt)}</dd></div><div><dt className="text-slate-400">{affaire.terminee && affaire.tauxHoraireReel !== null ? 'Taux horaire réel' : 'Taux de référence'}</dt><dd className="mt-1 font-semibold">{formatEuro(affaire.terminee && affaire.tauxHoraireReel !== null ? affaire.tauxHoraireReel : affaire.tauxHoraireReference)}/h</dd>{affaire.terminee && affaire.tauxHoraireReel !== null && <dd className="mt-1 text-xs text-slate-400">Taux de référence initial : {formatEuro(affaire.tauxHoraireReference)}/h</dd>}</div><div><dt className="text-slate-400">Création</dt><dd className="mt-1 flex items-center gap-2 font-semibold"><Calendar size={15} /> {formatDate(affaire.dateCreation)}</dd></div>{affaire.dateCloture && <div><dt className="text-slate-400">Clôture</dt><dd className="mt-1 font-semibold">{formatDate(affaire.dateCloture)}</dd></div>}<div><dt className="text-slate-400">Commentaire</dt><dd className="mt-1 whitespace-pre-wrap text-slate-600">{affaire.commentaire || '—'}</dd></div></dl></div>
      <div className="card p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold">Rentabilité</h2><p className="mt-1 text-sm text-slate-500">{formatNumber(affaire.ratioConsommation)} % du budget consommé</p></div><ProfitBadge ratio={affaire.ratioConsommation} /></div><div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${affaire.ratioConsommation > 100 ? 'bg-red-500' : affaire.ratioConsommation >= 80 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, affaire.ratioConsommation)}%` }} /></div><div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-5">{stats.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className={`mt-2 text-lg font-bold ${label.startsWith('Crédit') && affaire.creditRestantEuros < 0 ? 'text-red-600' : 'text-slate-900'}`}>{value}</dd></div>)}</div></div>
    </section>
    <section className="card mt-6 overflow-hidden"><div className="flex items-center justify-between border-b p-6"><div><h2 className="font-bold">Historique des pointages</h2><p className="mt-1 text-sm text-slate-500">{pointages.length} saisie{pointages.length > 1 ? 's' : ''}</p></div><Link className="btn-primary" to={`/pointages/nouveau?affaire=${id}`}><Plus size={17} /> Ajouter un pointage</Link></div>{pointages.length === 0 ? <EmptyState title="Aucun pointage" description="Commencez à saisir le temps consacré à cette affaire." /> : <table className="w-full"><thead className="bg-slate-50"><tr>{['Date', 'Heures', 'Catégorie', 'Commentaire', ''].map((h) => <th className="table-head" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y">{pointages.map((p) => <tr key={p.id}><td className="table-cell">{formatDate(p.date)}</td><td className="table-cell font-semibold tabular-nums">{formatNumber(p.heures)} h</td><td className="table-cell"><span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium">{p.categorie}</span></td><td className="table-cell text-slate-500">{p.commentaire || '—'}</td><td className="table-cell text-right"><button onClick={() => removePointage(p.id)} title="Supprimer" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></td></tr>)}</tbody></table>}</section>
    {edit && <AffaireFormModal affaire={affaire} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); void load(); }} />}
  </>;
}

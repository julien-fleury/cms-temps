import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORIES, type AffaireAvecStats, type Categorie } from '../../../shared/types';
import { PageHeader } from '../components/PageHeader';
import { today } from '../lib/format';

export function PointageFormPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const initialAffaire = Number(params.get('affaire')) || 0;
  const [affaires, setAffaires] = useState<AffaireAvecStats[]>([]); const [affaireId, setAffaireId] = useState(initialAffaire); const [date, setDate] = useState(today()); const [heures, setHeures] = useState(''); const [categorie, setCategorie] = useState<Categorie>('Modélisation ensemble'); const [commentaire, setCommentaire] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { void window.cms.affaires.list().then((rows) => { setAffaires(rows); if (!initialAffaire && rows[0]) setAffaireId(rows[0].id); }); }, [initialAffaire]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); const parsed = Number(heures); if (!affaireId) return setError('Sélectionnez une affaire.'); if (!date) return setError('La date est obligatoire.'); if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24) return setError("Le nombre d'heures doit être compris entre 0 et 24."); setSaving(true); try { await window.cms.pointages.create({ affaireId, date, heures: parsed, categorie, commentaire }); navigate(`/affaires/${affaireId}`); } catch { setError("Impossible d'enregistrer le pointage."); setSaving(false); } };
  return <>
    <Link to={initialAffaire ? `/affaires/${initialAffaire}` : '/affaires'} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={17} /> Retour</Link>
    <PageHeader title="Ajouter un pointage" subtitle="Enregistrez le temps passé sur une affaire." />
    <form onSubmit={submit} className="card max-w-3xl p-7"><div className="grid grid-cols-2 gap-5">
      <label className="col-span-2"><span className="label">Affaire *</span><select className="field" value={affaireId} onChange={(e) => setAffaireId(Number(e.target.value))}><option value={0}>Sélectionner une affaire</option>{affaires.map((a) => <option key={a.id} value={a.id}>{a.nom} — {a.client}{a.terminee ? ' (terminée)' : ''}</option>)}</select></label>
      <label><span className="label">Date *</span><input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label><span className="label">Nombre d’heures *</span><input className="field" type="number" min="0.25" max="24" step="0.25" placeholder="Ex. 3,5" value={heures} onChange={(e) => setHeures(e.target.value)} autoFocus /></label>
      <label className="col-span-2"><span className="label">Catégorie *</span><select className="field" value={categorie} onChange={(e) => setCategorie(e.target.value as Categorie)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="col-span-2"><span className="label">Commentaire</span><textarea className="field resize-none" rows={4} placeholder="Précisions sur le travail réalisé…" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} /></label>
    </div>{error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-7 flex justify-end"><button className="btn-primary" disabled={saving || affaires.length === 0}><Save size={17} /> {saving ? 'Enregistrement…' : 'Enregistrer le pointage'}</button></div></form>
  </>;
}

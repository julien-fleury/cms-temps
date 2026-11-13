import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { CATEGORIES, type AffaireAvecStats, type Categorie, type PointageInput } from '../../../shared/types';
import { PageHeader } from '../components/PageHeader';

const iso = (date: Date) => date.toLocaleDateString('en-CA');
const mondayOf = (date: Date): Date => { const result = new Date(date); const day = result.getDay() || 7; result.setDate(result.getDate() - day + 1); result.setHours(12, 0, 0, 0); return result; };

export function SemainePage() {
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [affaires, setAffaires] = useState<AffaireAvecStats[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Record<number, Categorie>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');
  const days = useMemo(() => Array.from({ length: 5 }, (_, index) => { const date = new Date(week); date.setDate(date.getDate() + index); return date; }), [week]);
  useEffect(() => { void window.cms.affaires.list().then((rows) => setAffaires(rows.filter((item) => !item.terminee))); }, []);
  const move = (offset: number) => { const next = new Date(week); next.setDate(next.getDate() + offset * 7); setWeek(next); setValues({}); setMessage(''); };
  const key = (affaireId: number, date: Date) => `${affaireId}:${iso(date)}`;
  const totalDay = (date: Date) => affaires.reduce((sum, affaire) => sum + Number(values[key(affaire.id, date)] || 0), 0);
  const save = async () => {
    const inputs: PointageInput[] = [];
    for (const affaire of affaires) for (const date of days) {
      const heures = Number(values[key(affaire.id, date)] || 0);
      if (heures > 0) inputs.push({ affaireId: affaire.id, date: iso(date), heures, categorie: categories[affaire.id] ?? 'Autre', commentaire: comments[affaire.id] ?? '' });
    }
    if (!inputs.length) return setMessage('Saisissez au moins une durée.');
    await window.cms.pointages.createMany(inputs); setValues({}); setMessage(`${inputs.length} pointage${inputs.length > 1 ? 's' : ''} enregistré${inputs.length > 1 ? 's' : ''}.`);
  };
  return <><PageHeader title="Saisie hebdomadaire" subtitle="Saisissez toute votre semaine dans une seule grille." actions={<div className="flex items-center gap-2"><button className="btn-secondary px-3" onClick={() => move(-1)}><ChevronLeft size={17} /></button><span className="min-w-48 text-center text-sm font-semibold">Semaine du {week.toLocaleDateString('fr-FR')}</span><button className="btn-secondary px-3" onClick={() => move(1)}><ChevronRight size={17} /></button></div>} />
    <div className="card overflow-x-auto"><table className="w-full min-w-[1050px]"><thead className="bg-slate-50"><tr><th className="table-head">Affaire</th><th className="table-head">Catégorie</th>{days.map((day) => <th className="table-head text-center" key={iso(day)}>{day.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>)}<th className="table-head">Commentaire</th></tr></thead><tbody className="divide-y">{affaires.map((affaire) => <tr key={affaire.id}><td className="table-cell"><b className="block text-slate-900">{affaire.nom}</b><span className="text-xs text-slate-400">{affaire.client}</span></td><td className="table-cell"><select className="field min-w-44" value={categories[affaire.id] ?? 'Autre'} onChange={(e) => setCategories((old) => ({ ...old, [affaire.id]: e.target.value as Categorie }))}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></td>{days.map((day) => <td className="table-cell" key={iso(day)}><input className="field w-20 text-center" type="number" min="0" max="24" step="0.25" value={values[key(affaire.id, day)] ?? ''} onChange={(e) => setValues((old) => ({ ...old, [key(affaire.id, day)]: e.target.value }))} /></td>)}<td className="table-cell"><input className="field min-w-44" value={comments[affaire.id] ?? ''} onChange={(e) => setComments((old) => ({ ...old, [affaire.id]: e.target.value }))} /></td></tr>)}</tbody><tfoot className="bg-slate-50"><tr><td className="table-cell font-semibold" colSpan={2}>Total par jour</td>{days.map((day) => <td className="table-cell text-center font-bold" key={iso(day)}>{totalDay(day).toLocaleString('fr-FR')} h</td>)}<td /></tr></tfoot></table></div>
    <div className="mt-5 flex items-center justify-between"><p className={`text-sm ${message.includes('enregistré') ? 'text-emerald-700' : 'text-orange-700'}`}>{message}</p><button className="btn-primary" onClick={() => void save()}><Save size={17} /> Enregistrer la semaine</button></div></>;
}

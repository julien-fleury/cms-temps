import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { CategorieTravail } from '../../../shared/types';
import { PageHeader } from '../components/PageHeader';

export function CategoriesPage() {
  const [items, setItems] = useState<CategorieTravail[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [newName, setNewName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [replacementId, setReplacementId] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const rows = await window.cms.categories.list();
    setItems(rows);
    setNames(Object.fromEntries(rows.map((item) => [item.id, item.nom])));
  };

  useEffect(() => { void load(); }, []);

  const message = (value: unknown) => value instanceof Error ? value.message.replace(/^Error invoking remote method '[^']+': /, '') : 'Une erreur est survenue.';
  const add = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await window.cms.categories.create(newName); setNewName(''); await load(); }
    catch (reason) { setError(message(reason)); }
    finally { setBusy(false); }
  };
  const rename = async (item: CategorieTravail) => {
    setError(''); setBusy(true);
    try { await window.cms.categories.rename(item.id, names[item.id] ?? ''); await load(); }
    catch (reason) { setError(message(reason)); }
    finally { setBusy(false); }
  };
  const requestDelete = async (item: CategorieTravail) => {
    setError('');
    if (item.usagePointages + item.usageBudgets === 0) {
      if (!confirm(`Supprimer la catégorie « ${item.nom} » ?`)) return;
      setBusy(true);
      try { await window.cms.categories.remove(item.id); await load(); }
      catch (reason) { setError(message(reason)); }
      finally { setBusy(false); }
      return;
    }
    const replacement = items.find((candidate) => candidate.id !== item.id);
    setDeletingId(item.id); setReplacementId(replacement?.id ?? 0);
  };
  const replaceAndDelete = async (item: CategorieTravail) => {
    if (!replacementId) return setError('Choisissez une catégorie de remplacement.');
    if (!confirm(`Remplacer les usages de « ${item.nom} », puis supprimer cette catégorie ?`)) return;
    setError(''); setBusy(true);
    try { await window.cms.categories.remove(item.id, replacementId); setDeletingId(null); await load(); }
    catch (reason) { setError(message(reason)); }
    finally { setBusy(false); }
  };

  return <>
    <PageHeader title="Types de tâche" subtitle="Ajoutez, renommez ou supprimez les catégories proposées lors des pointages." />
    <form onSubmit={add} className="card mb-6 flex max-w-3xl items-end gap-4 p-5">
      <label className="flex-1"><span className="label">Nouveau type de tâche</span><input className="field" maxLength={80} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex. Relevé sur site" /></label>
      <button className="btn-primary" disabled={busy || !newName.trim()}><Plus size={17} /> Ajouter</button>
    </form>
    <div className="card max-w-3xl divide-y overflow-hidden">
      {items.map((item) => <div className="p-5" key={item.id}>
        <div className="flex items-end gap-3">
          <label className="flex-1"><span className="label">Nom</span><input className="field" maxLength={80} value={names[item.id] ?? ''} onChange={(event) => setNames((old) => ({ ...old, [item.id]: event.target.value }))} /></label>
          <button className="btn-secondary" disabled={busy || !names[item.id]?.trim() || names[item.id].trim() === item.nom} onClick={() => void rename(item)}><Save size={16} /> Renommer</button>
          <button className="btn-danger" disabled={busy || items.length <= 1} onClick={() => void requestDelete(item)}><Trash2 size={16} /> Supprimer</button>
        </div>
        <p className="mt-2 text-xs text-slate-400">{item.usagePointages} pointage{item.usagePointages > 1 ? 's' : ''} · {item.usageBudgets} budget{item.usageBudgets > 1 ? 's' : ''}</p>
        {deletingId === item.id && <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-900">Cette catégorie est utilisée. Choisissez où transférer ses données.</p>
          <div className="mt-3 flex gap-3"><select className="field" value={replacementId} onChange={(event) => setReplacementId(Number(event.target.value))}>{items.filter((candidate) => candidate.id !== item.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.nom}</option>)}</select><button className="btn-danger whitespace-nowrap" disabled={busy} onClick={() => void replaceAndDelete(item)}>Remplacer et supprimer</button><button className="btn-secondary" onClick={() => setDeletingId(null)}>Annuler</button></div>
        </div>}
      </div>)}
    </div>
    {error && <p className="mt-5 max-w-3xl rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  </>;
}

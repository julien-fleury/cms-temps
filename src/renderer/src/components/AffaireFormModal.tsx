import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { AffaireAvecStats, AffaireInput } from '../../../shared/types';
import { today } from '../lib/format';

const initial: AffaireInput = { nom: '', client: '', montantVenduHt: 0, tauxHoraireReference: 70, dateCreation: today(), dateCloture: null, terminee: false, commentaire: '' };

export function AffaireFormModal({ affaire, onClose, onSaved }: { affaire?: AffaireAvecStats; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<AffaireInput>(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (affaire) { const { id: _id, heuresConsommees: _h, montantConsomme: _m, creditRestantEuros: _c, creditRestantHeures: _ch, tauxHoraireReel: _t, ratioConsommation: _r, ...values } = affaire; setForm(values); } }, [affaire]);

  const set = <K extends keyof AffaireInput>(key: K, value: AffaireInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!form.nom.trim() || !form.client.trim()) return setError('Le nom et le client sont obligatoires.');
    if (form.montantVenduHt < 0 || form.tauxHoraireReference <= 0) return setError('Les montants saisis ne sont pas valides.');
    setSaving(true);
    try { if (affaire) await window.cms.affaires.update(affaire.id, form); else await window.cms.affaires.create(form); onSaved(); }
    catch { setError("Impossible d'enregistrer l'affaire."); setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-6 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form onSubmit={submit} className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-7">
      <div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-bold">{affaire ? "Modifier l'affaire" : 'Nouvelle affaire'}</h2><p className="mt-1 text-sm text-slate-500">Renseignez les données contractuelles de l’affaire.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
      <div className="grid grid-cols-2 gap-5">
        <label className="col-span-2"><span className="label">Nom de l’affaire *</span><input className="field" value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus /></label>
        <label><span className="label">Client *</span><input className="field" value={form.client} onChange={(e) => set('client', e.target.value)} /></label>
        <label><span className="label">Date de création *</span><input type="date" className="field" value={form.dateCreation} onChange={(e) => set('dateCreation', e.target.value)} /></label>
        <label><span className="label">Prix vendu HT (€) *</span><input type="number" min="0" step="0.01" className="field" value={form.montantVenduHt} onChange={(e) => set('montantVenduHt', Number(e.target.value))} /></label>
        <label><span className="label">Taux horaire de référence (€) *</span><input type="number" min="0.01" step="0.01" className="field" value={form.tauxHoraireReference} onChange={(e) => set('tauxHoraireReference', Number(e.target.value))} /></label>
        <label><span className="label">Date de clôture</span><input type="date" className="field" value={form.dateCloture ?? ''} onChange={(e) => set('dateCloture', e.target.value || null)} /></label>
        <label className="flex items-end pb-2"><span className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={form.terminee} onChange={(e) => set('terminee', e.target.checked)} /> Affaire terminée</span></label>
        <label className="col-span-2"><span className="label">Commentaire</span><textarea rows={3} className="field resize-none" value={form.commentaire} onChange={(e) => set('commentaire', e.target.value)} /></label>
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-7 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form>
  </div>;
}

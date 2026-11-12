import { useState } from 'react';
import { DatabaseBackup, FileDown, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

export function DonneesPage() {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<string | boolean | null>, success: string) => { setBusy(true); setMessage(''); try { const result = await action(); if (result) setMessage(success); } catch { setMessage('Une erreur est survenue. Vérifiez le fichier et réessayez.'); } finally { setBusy(false); } };
  const actions = [
    { title: 'Exporter vers Excel', description: 'Crée un classeur .xlsx contenant les affaires et tous les pointages.', icon: FileDown, button: 'Exporter', action: () => run(() => window.cms.exportExcel(), 'Export Excel créé avec succès.') },
    { title: 'Sauvegarder la base', description: 'Crée une copie complète de la base SQLite à conserver en lieu sûr.', icon: DatabaseBackup, button: 'Sauvegarder', action: () => run(() => window.cms.backup(), 'Sauvegarde créée avec succès.') },
    { title: 'Restaurer une sauvegarde', description: 'Remplace les données actuelles par une sauvegarde SQLite existante.', icon: RotateCcw, button: 'Restaurer', action: () => { if (confirm('La restauration remplacera toutes les données actuelles. Continuer ?')) void run(() => window.cms.restore(), 'Sauvegarde restaurée. Redémarrez l’application si nécessaire.'); } },
  ];
  return <><PageHeader title="Données" subtitle="Exportez et protégez les données locales de CMS Temps." /><div className="grid max-w-4xl gap-5">{actions.map(({ title, description, icon: Icon, button, action }) => <div key={title} className="card flex items-center gap-5 p-6"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={23} /></div><div className="flex-1"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><button className="btn-secondary" onClick={action} disabled={busy}>{button}</button></div>)}</div>{message && <p className={`mt-6 max-w-4xl rounded-xl p-4 text-sm ${message.includes('erreur') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{message}</p>}<div className="mt-8 max-w-4xl rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-relaxed text-blue-800"><strong>Emplacement des données</strong><br />La base active est stockée automatiquement dans le dossier de données de l’application de votre système. Aucune donnée n’est envoyée sur Internet.</div></>;
}

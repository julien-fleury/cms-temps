import type { ReactNode } from 'react';
import { BarChart3, BriefcaseBusiness, CalendarDays, Clock3, Database, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Tableau de bord', icon: BarChart3 },
  { to: '/affaires', label: 'Affaires', icon: BriefcaseBusiness },
  { to: '/pointages/nouveau', label: 'Saisir du temps', icon: Clock3 },
  { to: '/semaine', label: 'Saisie hebdomadaire', icon: CalendarDays },
  { to: '/donnees', label: 'Données', icon: Database },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#14231f] px-4 py-6 text-white">
        <div className="mb-9 px-3">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 font-black">CT</div><div><p className="text-lg font-bold leading-tight">CMS Temps</p><p className="text-xs text-emerald-100/60">Suivi de rentabilité</p></div></div>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/30' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon size={19} />{label}</NavLink>)}
        </nav>
        <NavLink to="/pointages/nouveau" className="mt-7 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/20"><Plus size={18} /> Ajouter un pointage</NavLink>
        <div className="mt-auto rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-slate-400"><span className="font-semibold text-slate-300">100 % local</span><br />Vos données restent sur cet ordinateur.</div>
      </aside>
      <main className="ml-64 min-h-screen w-[calc(100%-16rem)] p-8 lg:p-10">{children}</main>
    </div>
  );
}

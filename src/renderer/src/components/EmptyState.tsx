import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="grid min-h-64 place-items-center p-8 text-center"><div><Inbox className="mx-auto mb-3 text-slate-300" size={36} /><h3 className="font-semibold text-slate-800">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div></div>;
}

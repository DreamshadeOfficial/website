"use client";
import { useEffect, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { ProposalCards } from '@/components/ProposalCards';

export default function DashboardPage() {
  const [proposal, setProposal] = useState<any>(null);

  async function load() {
    const prefs = JSON.parse(localStorage.getItem('prefs') || '{"breakMinutes":45,"walkMinutes":20,"budget":"$$","intensity":"rilassata","cuisine":"Italian"}');
    const res = await fetch('/api/proposal', { method: 'POST', body: JSON.stringify(prefs) });
    setProposal(await res.json());
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <TopNav />
      <div className="card">
        <h2 className="text-xl font-semibold">Dashboard giornaliera</h2>
        <p className="text-sm text-slate-400">Poche scelte, frizione minima.</p>
      </div>

      <ProposalCards proposal={proposal} />

      <div className="card">
        <div className="mb-2 text-sm text-slate-400">Alternative rapide</div>
        <div className="space-y-2">
          {proposal?.alternatives?.map((a: any) => (
            <div key={a.id} className="rounded-xl border border-slate-700 p-2 text-sm">
              <b>{a.name}</b> • {a.cuisine} • {a.priceBand} • ⭐ {a.rating}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary">Segui il percorso</button>
        <button className="btn-secondary" onClick={load}>Cambia proposta</button>
        <button className="btn-secondary">Salva</button>
      </div>
    </div>
  );
}
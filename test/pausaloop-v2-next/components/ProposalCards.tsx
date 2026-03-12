type Proposal = any;

export function ProposalCards({ proposal }: { proposal: Proposal }) {
  if (!proposal) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="card">
        <div className="mb-2 text-xs text-slate-400">Camminata</div>
        <div className="text-lg font-semibold">{proposal.walk.minutes} min • {proposal.walk.distanceKm} km</div>
        <div className="text-sm text-slate-400">{proposal.walk.type}</div>
      </div>
      <div className="card">
        <div className="mb-2 text-xs text-slate-400">Food consigliato</div>
        <div className="text-lg font-semibold">{proposal.main.name}</div>
        <div className="text-sm text-slate-400">{proposal.main.cuisine} • {proposal.main.priceBand} • ⭐ {proposal.main.rating}</div>
      </div>
    </div>
  );
}
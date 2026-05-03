import { capabilityTiles } from './semanticData'

export default function SemanticOverviewTiles({ activeCapability, onSelect }) {
  return (
    <div className="mt-5 grid gap-3">
      {capabilityTiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          onClick={() => onSelect(tile.id)}
          className={`rounded-xl border p-4 text-left transition ${
            activeCapability === tile.id
              ? 'border-[#82C7A5]/50 bg-[#82C7A5]/10'
              : 'border-white/10 bg-black/10 hover:border-white/25 hover:bg-white/5'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="font-semibold text-white">{tile.title}</div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeClass(tile.status)}`}>
              {tile.status}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/50">{tile.description}</p>
        </button>
      ))}
    </div>
  )
}

function badgeClass(status) {
  if (status.includes('PLACEHOLDER')) return 'border border-amber-300/30 bg-amber-300/10 text-amber-200'
  if (status.includes('IMPLEMENTED')) return 'border border-sky-300/30 bg-sky-300/10 text-sky-200'
  return 'border border-[#82C7A5]/30 bg-[#82C7A5]/10 text-[#82C7A5]'
}

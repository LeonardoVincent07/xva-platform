import { useState } from 'react'

export default function ServiceApiMapView({ services }) {
  const [selectedName, setSelectedName] = useState('CVA Service')
  const service = services.find((item) => item.name === selectedName) || services[0]

  return (
    <div className="grid gap-5 2xl:grid-cols-[330px_minmax(0,1fr)]">
      <div className="space-y-3">
        {services.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setSelectedName(item.name)}
            className={`w-full rounded-xl border p-4 text-left transition ${
              item.name === service.name ? 'border-[#82C7A5]/50 bg-[#82C7A5]/10' : 'border-white/10 bg-[#222B3A]/60 hover:border-white/25'
            }`}
          >
            <div className="font-semibold text-white">{item.name}</div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/50">
              <span>{item.runtime}</span><span>{item.status}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#222B3A] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/45">Backend Service</div>
            <h3 className="mt-1 font-display text-2xl font-semibold text-white">{service.name}</h3>
            <div className="mt-2 font-mono text-sm text-[#82C7A5]">{service.runtime}</div>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/65">{service.status}</span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <ListBlock title="Responsibilities" items={service.responsibilities} />
          <ListBlock title="API Contracts" items={service.apis} mono accent />
          <ListBlock title="Reads" items={service.reads} mono />
          <ListBlock title="Writes" items={service.writes} mono accent />
          <ListBlock title="Consumed By" items={service.consumedBy} />
        </div>
      </div>
    </div>
  )
}

function ListBlock({ title, items, mono = false, accent = false }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">{title}</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className={`rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm ${mono ? 'font-mono text-xs' : ''} ${accent ? 'text-[#82C7A5]' : 'text-white/65'}`}>{item}</div>
        ))}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { capabilityTiles, dataTables, semanticObjects, services } from './semanticData'
import SemanticOverviewTiles from './SemanticOverviewTiles'
import SemanticModelView from './SemanticModelView'
import DataModelView from './DataModelView'
import ServiceApiMapView from './ServiceApiMapView'
import TechStackView from './TechStackView'
import PlaceholderCapabilityView from './PlaceholderCapabilityView'

const views = {
  semantic: SemanticModelView,
  data: DataModelView,
  services: ServiceApiMapView,
  technology: TechStackView,
  businessLineage: PlaceholderCapabilityView,
  technologyLineage: PlaceholderCapabilityView,
  quality: PlaceholderCapabilityView,
  security: PlaceholderCapabilityView,
}

export default function SemanticArchitecturePanel() {
  const [activeCapability, setActiveCapability] = useState('semantic')
  const activeTile = useMemo(
    () => capabilityTiles.find((tile) => tile.id === activeCapability) || capabilityTiles[0],
    [activeCapability],
  )
  const ActiveView = views[activeCapability] || SemanticModelView

  return (
    <main className="mt-5 grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-[#222B3A] p-5 shadow-2xl shadow-black/20">
        <div className="text-xs uppercase tracking-[0.24em] text-[#82C7A5]">MissionAtlas</div>
        <h2 className="mt-2 font-display text-2xl font-semibold text-white">M7 XVA Semantic Architecture</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Target-state semantic model with live-system traceability across business concepts, data, services, APIs, components, controls and evidence.
        </p>
        <div className="mt-5 rounded-xl border border-[#82C7A5]/20 bg-[#82C7A5]/5 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Operating Mode</div>
          <div className="mt-2 text-sm font-semibold text-[#82C7A5]">Target-state model, current-state implementation trace</div>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            The map shows the platform architecture we are building towards, while status badges identify what is already implemented, partial or planned.
          </p>
        </div>
        <SemanticOverviewTiles activeCapability={activeCapability} onSelect={setActiveCapability} />
      </aside>

      <section className="min-w-0 rounded-2xl border border-white/10 bg-[#141A24] p-5 shadow-2xl shadow-black/20">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/45">Architecture Explorer</div>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">{activeTile.title}</h2>
            <p className="mt-2 max-w-4xl text-sm text-white/60">{activeTile.description}</p>
          </div>
          <div className="rounded-full border border-[#82C7A5]/30 bg-[#82C7A5]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#82C7A5]">
            {activeTile.status}
          </div>
        </div>

        <ActiveView tile={activeTile} semanticObjects={semanticObjects} dataTables={dataTables} services={services} />
      </section>
    </main>
  )
}

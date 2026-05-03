export default function PlaceholderCapabilityView({ tile }) {
  const detail = copy[tile.id] || copy.businessLineage

  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
      <div className="text-xs uppercase tracking-[0.22em] text-amber-200">Placeholder Capability</div>
      <h3 className="mt-2 font-display text-2xl font-semibold text-white">{tile.title}</h3>
      <p className="mt-3 max-w-4xl text-sm leading-relaxed text-white/65">{detail.description}</p>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {detail.items.map((item) => (
          <div key={item.title} className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
            <div className="text-sm font-semibold text-white">{item.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const copy = {
  businessLineage: {
    description: 'Coming next: trace business data from source trade capture through exposure simulation, XVA calculation, desk actioning and reconciliation.',
    items: [
      { title: 'Source to Semantic Object', text: 'Show how trade, counterparty, CSA and market data are normalised into the semantic model.' },
      { title: 'Calculation Lineage', text: 'Show which inputs produced each exposure, CVA, sensitivity and hedge recommendation.' },
      { title: 'Reconciliation Lineage', text: 'Show how internal XVA outputs are matched against external Murex results.' },
      { title: 'Evidence Trail', text: 'Show run identifiers, timestamps, input versions and output evidence for each material result.' },
    ],
  },
  technologyLineage: {
    description: 'Coming next: trace which frontend panels, APIs, services, calculation engines and database objects are touched by each user action.',
    items: [
      { title: 'User Action Trace', text: 'Capture each click, API call, service execution and database dependency involved in a screen refresh.' },
      { title: 'Component Dependency Map', text: 'Link panel-level React components to endpoints, backend services and semantic objects.' },
      { title: 'Runtime Evidence', text: 'Expose latency, status, service execution path and data freshness for each interaction.' },
      { title: 'Impact Analysis', text: 'Show what breaks or needs retesting when a service, table or semantic object changes.' },
    ],
  },
  quality: {
    description: 'Coming next: surface test coverage, guardrail results, linting, calculation checks and regression evidence for each semantic object.',
    items: [
      { title: 'Test Coverage', text: 'Map unit, integration, API and calculation tests to services and semantic objects.' },
      { title: 'Guardrail Evidence', text: 'Expose design, data, security and quality checks attached to each story and release.' },
      { title: 'Regression Control', text: 'Show baseline comparisons for exposure profiles, CVA calculations and desk actions.' },
      { title: 'Definition of Done', text: 'Track whether each implemented object satisfies agreed build, test, quality and evidence criteria.' },
    ],
  },
  security: {
    description: 'Coming next: expose authentication, authorisation, data access controls, secrets handling, audit logging and API security status.',
    items: [
      { title: 'Access Control', text: 'Map roles and entitlements to panels, APIs, services and sensitive data fields.' },
      { title: 'API Security', text: 'Expose authentication status, request validation, rate limiting and error handling controls.' },
      { title: 'Secrets & Configuration', text: 'Show where secrets, environment variables and external connections are controlled.' },
      { title: 'Auditability', text: 'Track who ran calculations, viewed results, changed parameters or approved desk actions.' },
    ],
  },
}

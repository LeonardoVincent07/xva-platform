import { useState } from 'react'

export default function DataModelView({ dataTables }) {
  const [selectedTable, setSelectedTable] = useState('exposure_profile_time_bucket')
  const table = dataTables.find((item) => item.table === selectedTable) || dataTables[0]

  return (
    <div className="grid gap-5 2xl:grid-cols-[330px_minmax(0,1fr)]">
      <div className="space-y-3">
        {dataTables.map((item) => (
          <button
            key={item.table}
            type="button"
            onClick={() => setSelectedTable(item.table)}
            className={`w-full rounded-xl border p-4 text-left transition ${
              item.table === table.table ? 'border-[#82C7A5]/50 bg-[#82C7A5]/10' : 'border-white/10 bg-[#222B3A]/60 hover:border-white/25'
            }`}
          >
            <div className="font-mono text-sm font-semibold text-white">{item.table}</div>
            <div className="mt-2 text-xs text-white/50">{item.logicalEntity} · {item.owner}</div>
          </button>
        ))}
      </div>

      <div className="min-w-0 rounded-2xl border border-white/10 bg-[#222B3A] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/45">Physical Table</div>
            <h3 className="mt-1 font-mono text-xl font-semibold text-white">{table.table}</h3>
            <p className="mt-2 max-w-4xl text-sm text-white/60">{table.description}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/65">
            <div><span className="text-white/40">Logical Entity:</span> {table.logicalEntity}</div>
            <div><span className="text-white/40">Owner:</span> {table.owner}</div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[980px] w-full text-left text-xs">
            <thead className="bg-black/20 uppercase tracking-[0.16em] text-white/45">
              <tr>
                <th className="px-3 py-3">Field</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Key</th>
                <th className="px-3 py-3">Nullable</th>
                <th className="px-3 py-3">References</th>
                <th className="px-3 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {table.fields.map((field) => (
                <tr key={field.name} className="bg-[#141A24]/40">
                  <td className="px-3 py-3 font-mono font-semibold text-white">{field.name}</td>
                  <td className="px-3 py-3 font-mono text-[#82C7A5]">{field.type}</td>
                  <td className="px-3 py-3 text-white/70">{field.key || '—'}</td>
                  <td className="px-3 py-3 text-white/70">{field.nullable ? 'YES' : 'NO'}</td>
                  <td className="px-3 py-3 font-mono text-white/55">{field.references || '—'}</td>
                  <td className="px-3 py-3 text-white/60">{field.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <MetaBlock title="Indexes" items={table.indexes} />
          <MetaBlock title="Constraints" items={table.constraints} />
        </div>
      </div>
    </div>
  )
}

function MetaBlock({ title, items }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">{title}</div>
      <div className="space-y-2">
        {items.map((item) => <div key={item} className="font-mono text-xs text-white/65">{item}</div>)}
      </div>
    </div>
  )
}

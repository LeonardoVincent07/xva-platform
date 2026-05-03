import { stackGroups, targetExtensions } from './semanticData'

export default function TechStackView() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-4">
        {stackGroups.map((group) => (
          <div key={group.title} className="rounded-2xl border border-white/10 bg-[#222B3A] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/45">{group.title}</div>
            <div className="mt-4 space-y-2">
              {group.items.map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-white/70">{item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#82C7A5]/20 bg-[#82C7A5]/5 p-5">
        <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[#82C7A5]">Target Extensions</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {targetExtensions.map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white/75">- {item}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

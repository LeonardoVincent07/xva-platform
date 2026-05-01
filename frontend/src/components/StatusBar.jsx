export default function StatusBar({ result, preview }) {
  const runId = result?.calculation_run_id ? shortRunId(result.calculation_run_id) : 'PRE-TRADE'
  const tradeCount = result?.netting_set?.existing_trades ?? preview?.netting_set?.existing_trades ?? 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2 text-xs text-white/65">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span><Dot tone="green" />Trade feed live</span>
        <span><Dot tone="green" />Rates cube live</span>
        <span><Dot tone="amber" />Credit feed stale</span>
        <span>Cube age: <span className="font-mono text-[#82C7A5]">02m 14s</span></span>
        <span>Feed status: <span className="font-mono text-white/85">{tradeCount} trades loaded</span></span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span>Run: <span className="font-mono text-white/85">{runId}</span></span>
        <span>Model: <span className="font-mono text-white/85">M7-XVA-MVP</span></span>
      </div>
    </div>
  )
}

function Dot({ tone }) {
  const colours = {
    green: 'bg-[#82C7A5]',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
  }
  return <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${colours[tone]}`} />
}

function shortRunId(runId) {
  return String(runId).replace('RUN-', '').slice(0, 8).toUpperCase()
}

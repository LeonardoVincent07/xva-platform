export default function ExposureChart({ data, currency, runId }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Exposure Profile</h2>
          <p className="mt-1 text-xs text-white/45">Current EPE vs proposed trade overlay and PFE 95</p>
        </div>
        <div className="text-right font-mono text-[11px] text-white/40">
          {runId ? `Run ${shortRunId(runId)}` : 'Preview cube'}
        </div>
      </div>

      {data?.length ? <SvgChart data={data} currency={currency} /> : <div className="h-[360px] rounded-lg border border-white/10 bg-black/10" />}
    </section>
  )
}

function SvgChart({ data, currency }) {
  const width = 1080
  const height = 390
  const pad = { left: 76, right: 30, top: 24, bottom: 56 }
  const current = data.map((p) => Number(p.epe_current || 0))
  const newTrade = data.map((p) => Number(p.epe_new_trade || 0))
  const pfe = data.map((p) => Number(p.pfe_95 || 0))
  const maxValue = Math.max(...current, ...newTrade, ...pfe, 1)
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  const makePoint = (value, index) => {
    const x = pad.left + (index * plotW) / Math.max(data.length - 1, 1)
    const y = pad.top + plotH - (value / maxValue) * plotH
    return [x, y]
  }

  const makePolyline = (values) => values.map((value, index) => makePoint(value, index).join(',')).join(' ')
  const yTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="rounded-lg border border-white/10 bg-[#1B212C] p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[360px] w-full overflow-visible">
        {yTicks.map((tick) => {
          const y = pad.top + plotH - tick * plotH
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text x={pad.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.50)">
                {formatMillions(maxValue * tick, currency)}
              </text>
            </g>
          )
        })}

        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="rgba(255,255,255,0.25)" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="rgba(255,255,255,0.25)" />

        <polyline points={makePolyline(pfe)} fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="3" strokeDasharray="4 6" />
        <polyline points={makePolyline(current)} fill="none" stroke="#0145AC" strokeWidth="4" />
        <polyline points={makePolyline(newTrade)} fill="none" stroke="#82C7A5" strokeWidth="4" />

        {data.map((point, index) => {
          if (!point.show_tick) return null
          const [x] = makePoint(current[index], index)
          return (
            <g key={point.label}>
              <line x1={x} y1={height - pad.bottom} x2={x} y2={height - pad.bottom + 5} stroke="rgba(255,255,255,0.25)" />
              <text x={x} y={height - 26} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.62)">
                {point.label}
              </text>
            </g>
          )
        })}

        <text x={pad.left} y={height - 6} fontSize="11" fill="rgba(255,255,255,0.40)">Time bucket</text>
        <text x="18" y="190" transform="rotate(-90 18 190)" fontSize="11" fill="rgba(255,255,255,0.40)">Exposure</text>

        <Legend x={pad.left + 4} y={pad.top + 10} />
      </svg>
    </div>
  )
}

function Legend({ x, y }) {
  return (
    <g fontSize="12" fill="rgba(255,255,255,0.75)">
      <line x1={x} y1={y} x2={x + 30} y2={y} stroke="#0145AC" strokeWidth="4" />
      <text x={x + 38} y={y + 4}>EPE current</text>
      <line x1={x + 148} y1={y} x2={x + 178} y2={y} stroke="#82C7A5" strokeWidth="4" />
      <text x={x + 186} y={y + 4}>EPE + new trade</text>
      <line x1={x + 342} y1={y} x2={x + 372} y2={y} stroke="rgba(255,255,255,0.58)" strokeWidth="3" strokeDasharray="4 6" />
      <text x={x + 380} y={y + 4}>PFE 95</text>
    </g>
  )
}

function formatMillions(value, currency) {
  const n = Number(value || 0)
  return `${currencySymbol(currency)}${Math.round(n / 1_000_000)}M`
}

function currencySymbol(currency) {
  return currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'CHF' ? 'CHF ' : '$'
}

function shortRunId(runId) {
  return String(runId).replace('RUN-', '').slice(0, 8).toUpperCase()
}

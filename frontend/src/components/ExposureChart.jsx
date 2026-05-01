export default function ExposureChart({ data, currency, runId }) {
  const summary = buildSummary(data)

  return (
    <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Exposure Profile</h2>
          <p className="mt-1 text-xs text-white/45">Current EPE vs proposed trade overlay and 95% PFE</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right font-mono text-[11px] text-white/55">
          <MiniStat label="Peak Δ" value={formatMillions(summary.peakDelta, currency)} accent />
          <MiniStat label="Peak EPE" value={formatMillions(summary.peakNew, currency)} />
          <MiniStat label="Cube" value={runId ? shortRunId(runId) : 'PREVIEW'} />
        </div>
      </div>

      {data?.length ? <SvgChart data={data} currency={currency} summary={summary} /> : <div className="h-[388px] rounded-lg border border-white/10 bg-black/10" />}
    </section>
  )
}

function SvgChart({ data, currency, summary }) {
  const width = 1120
  const height = 420
  const pad = { left: 78, right: 36, top: 34, bottom: 68 }
  const current = data.map((p) => Number(p.epe_current || 0))
  const newTrade = data.map((p) => Number(p.epe_new_trade ?? p.epe_new ?? 0))
  const pfe = data.map((p) => Number(p.pfe_95 ?? p.pfe ?? 0))
  const maxValue = niceMax(Math.max(...current, ...newTrade, ...pfe, 1))
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  const makePoint = (value, index) => {
    const x = pad.left + (index * plotW) / Math.max(data.length - 1, 1)
    const y = pad.top + plotH - (value / maxValue) * plotH
    return [x, y]
  }

  const makePolyline = (values) => values.map((value, index) => makePoint(value, index).join(',')).join(' ')
  const makeArea = (topValues, bottomValues) => {
    const top = topValues.map((value, index) => makePoint(value, index).join(',')).join(' ')
    const bottom = bottomValues
      .map((value, index) => makePoint(value, index).join(','))
      .reverse()
      .join(' ')
    return `${top} ${bottom}`
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  const xTicks = data.filter((point, index) => point.show_tick || index === 0 || index === data.length - 1)
  const peakIndex = summary.peakIndex ?? 0
  const [peakX, peakY] = makePoint(newTrade[peakIndex] || 0, peakIndex)

  return (
    <div className="rounded-lg border border-white/10 bg-[#1B212C] p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[388px] w-full overflow-visible">
        <defs>
          <linearGradient id="xvaDeltaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#82C7A5" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#82C7A5" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <rect x={pad.left} y={pad.top} width={plotW} height={plotH} rx="6" fill="rgba(255,255,255,0.012)" />

        {yTicks.map((tick) => {
          const y = pad.top + plotH - tick * plotH
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.075)" />
              <text x={pad.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.50)">
                {formatMillions(maxValue * tick, currency)}
              </text>
            </g>
          )
        })}

        {xTicks.map((point, index) => {
          const actualIndex = data.indexOf(point)
          const [x] = makePoint(current[actualIndex], actualIndex)
          return <line key={`${point.label}-${index}`} x1={x} y1={pad.top} x2={x} y2={height - pad.bottom} stroke="rgba(255,255,255,0.035)" />
        })}

        <polygon points={makeArea(newTrade, current)} fill="url(#xvaDeltaFill)" />

        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="rgba(255,255,255,0.28)" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="rgba(255,255,255,0.28)" />

        <polyline points={makePolyline(pfe)} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={makePolyline(current)} fill="none" stroke="#0145AC" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={makePolyline(newTrade)} fill="none" stroke="#82C7A5" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

        <line x1={peakX} y1={peakY} x2={peakX} y2={height - pad.bottom} stroke="rgba(130,199,165,0.28)" strokeDasharray="3 6" />
        <circle cx={peakX} cy={peakY} r="5" fill="#82C7A5" stroke="#1B212C" strokeWidth="2" />
        <g transform={`translate(${Math.min(peakX + 14, width - 210)} ${Math.max(peakY - 34, pad.top + 10)})`}>
          <rect width="168" height="34" rx="6" fill="rgba(0,0,0,0.36)" stroke="rgba(130,199,165,0.28)" />
          <text x="10" y="14" fontSize="10" fill="rgba(255,255,255,0.45)">MAX NEW EPE</text>
          <text x="10" y="27" fontSize="12" fill="#82C7A5" fontFamily="monospace">{formatMillions(summary.peakNew, currency)}</text>
        </g>

        {xTicks.map((point, index) => {
          const actualIndex = data.indexOf(point)
          const [x] = makePoint(current[actualIndex], actualIndex)
          return (
            <g key={point.label || index}>
              <line x1={x} y1={height - pad.bottom} x2={x} y2={height - pad.bottom + 5} stroke="rgba(255,255,255,0.25)" />
              <text x={x} y={height - 31} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.62)">
                {point.label || point.tenor || `${actualIndex}`}
              </text>
            </g>
          )
        })}

        <text x={pad.left + plotW / 2} y={height - 7} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.42)">Time to maturity</text>
        <text x="18" y={pad.top + plotH / 2} transform={`rotate(-90 18 ${pad.top + plotH / 2})`} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.42)">Expected exposure</text>

        <Legend x={width - pad.right - 420} y={pad.top - 16} />
      </svg>
    </div>
  )
}

function Legend({ x, y }) {
  return (
    <g fontSize="12" fill="rgba(255,255,255,0.75)">
      <rect x={x - 14} y={y - 14} width="426" height="34" rx="8" fill="rgba(0,0,0,0.20)" stroke="rgba(255,255,255,0.08)" />
      <line x1={x} y1={y} x2={x + 30} y2={y} stroke="#0145AC" strokeWidth="4" strokeLinecap="round" />
      <text x={x + 38} y={y + 4}>Current EPE</text>
      <line x1={x + 142} y1={y} x2={x + 172} y2={y} stroke="#82C7A5" strokeWidth="4" strokeLinecap="round" />
      <text x={x + 180} y={y + 4}>+ New trade</text>
      <line x1={x + 304} y1={y} x2={x + 334} y2={y} stroke="rgba(255,255,255,0.60)" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />
      <text x={x + 342} y={y + 4}>PFE 95</text>
    </g>
  )
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.14em] text-white/35">{label}</div>
      <div className={`mt-0.5 ${accent ? 'text-[#82C7A5]' : 'text-white/70'}`}>{value}</div>
    </div>
  )
}

function buildSummary(data = []) {
  let peakNew = 0
  let peakDelta = 0
  let peakIndex = 0

  data.forEach((point, index) => {
    const current = Number(point.epe_current || 0)
    const next = Number(point.epe_new_trade ?? point.epe_new ?? 0)
    const delta = next - current
    if (next > peakNew) {
      peakNew = next
      peakIndex = index
    }
    if (delta > peakDelta) peakDelta = delta
  })

  return { peakNew, peakDelta, peakIndex }
}

function niceMax(value) {
  const magnitude = 10 ** Math.floor(Math.log10(value || 1))
  return Math.ceil(value / magnitude / 0.25) * magnitude * 0.25
}

function formatMillions(value, currency) {
  const n = Number(value || 0)
  if (Math.abs(n) >= 1_000_000_000) return `${currencySymbol(currency)}${(n / 1_000_000_000).toFixed(1)}B`
  return `${currencySymbol(currency)}${Math.round(n / 1_000_000)}M`
}

function currencySymbol(currency) {
  return currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'CHF' ? 'CHF ' : '$'
}

function shortRunId(runId) {
  return String(runId).replace('RUN-', '').slice(0, 8).toUpperCase()
}

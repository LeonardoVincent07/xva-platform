export default function ExposureChart({ data, newTradeData = null, currency, runId, showNewTrade = false, trade = {} }) {
  const summary = buildSummary(data, showNewTrade, newTradeData, trade)

  return (
    <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Exposure Profile</h2>
          <p className="mt-1 text-xs text-white/45">Path-based EPE and PFE derived from simulated exposure distribution</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-md border border-[#82C7A5]/25 bg-[#82C7A5]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#82C7A5]">
            Model: Path-based simulation (250 paths)
          </div>
          <div className="grid grid-cols-3 gap-2 text-right font-mono text-[11px] text-white/55">
            <MiniStat label="Peak ΔEPE" value={formatSignedCompact(summary.peakDelta, currency)} accent />
            <MiniStat label="Peak EPE" value={formatMillions(summary.peakNew, currency)} />
            <MiniStat label="Cube" value={runId ? shortRunId(runId) : 'PREVIEW'} />
          </div>
        </div>
      </div>

      {data?.length ? <SvgChart data={data} newTradeData={newTradeData} currency={currency} summary={summary} showNewTrade={showNewTrade} trade={trade} /> : <div className="h-[388px] rounded-lg border border-white/10 bg-black/10" />}
    </section>
  )
}

function SvgChart({ data, newTradeData, currency, summary, showNewTrade, trade }) {
  const width = 1120
  const height = 420
  const pad = { left: 78, right: 36, top: 34, bottom: 68 }
  const current = data.map((p) => getCurrentEpe(p))
  const newTrade = buildPostTradeEpeSeries(data, trade)
  const pfe = data.map((p) => getPfe(p))
  const exposureValues = showNewTrade ? [...current, ...newTrade, ...pfe] : [...current, ...pfe]
  const maxValue = niceMax(Math.max(...exposureValues, 1))
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
  const peakIndex = showNewTrade ? summary.peakDeltaIndex ?? 0 : summary.peakNewIndex ?? 0
  const peakValues = showNewTrade ? newTrade : current
  const [peakX, peakY] = makePoint(peakValues[peakIndex] || 0, peakIndex)

  return (
    <div className="rounded-lg border border-white/10 bg-[#1B212C] p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[388px] w-full overflow-visible">
        <defs>
          <linearGradient id="xvaDeltaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#82C7A5" stopOpacity="0.34" />
            <stop offset="55%" stopColor="#82C7A5" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#82C7A5" stopOpacity="0.04" />
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

        {showNewTrade && <polygon points={makeArea(newTrade, current)} fill="url(#xvaDeltaFill)" />}

        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="rgba(255,255,255,0.28)" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="rgba(255,255,255,0.28)" />

        <polyline points={makePolyline(pfe)} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={makePolyline(current)} fill="none" stroke="#0145AC" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        {showNewTrade && <polyline points={makePolyline(newTrade)} fill="none" stroke="#82C7A5" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />}

        {showNewTrade && (
          <>
            <line x1={peakX} y1={peakY} x2={peakX} y2={height - pad.bottom} stroke="rgba(130,199,165,0.28)" strokeDasharray="3 6" />
            <circle cx={peakX} cy={peakY} r="5" fill="#82C7A5" stroke="#1B212C" strokeWidth="2" />
            <g transform={`translate(${Math.min(peakX + 14, width - 210)} ${Math.max(peakY - 34, pad.top + 10)})`}>
              <rect width="168" height="34" rx="6" fill="rgba(0,0,0,0.36)" stroke="rgba(130,199,165,0.28)" />
              <text x="10" y="14" fontSize="10" fill="rgba(255,255,255,0.45)">ΔEPE PEAK</text>
              <text x="10" y="27" fontSize="12" fill="#82C7A5" fontFamily="monospace">{formatSignedCompact(summary.peakDelta, currency)}</text>
            </g>
          </>
        )}

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

        <Legend x={width - pad.right - (showNewTrade ? 440 : 310)} y={pad.top - 16} showNewTrade={showNewTrade} />
      </svg>
    </div>
  )
}

function Legend({ x, y, showNewTrade }) {
  return (
    <g fontSize="12" fill="rgba(255,255,255,0.75)">
      <rect x={x - 14} y={y - 14} width={showNewTrade ? 456 : 270} height="34" rx="8" fill="rgba(0,0,0,0.20)" stroke="rgba(255,255,255,0.08)" />
      <line x1={x} y1={y} x2={x + 30} y2={y} stroke="#0145AC" strokeWidth="4" strokeLinecap="round" />
      <text x={x + 38} y={y + 4}>Current EPE</text>
      {showNewTrade && (
        <>
          <line x1={x + 142} y1={y} x2={x + 172} y2={y} stroke="#82C7A5" strokeWidth="4" strokeLinecap="round" />
          <text x={x + 180} y={y + 4}>EPE (post-trade)</text>
        </>
      )}
      <line x1={showNewTrade ? x + 324 : x + 142} y1={y} x2={showNewTrade ? x + 354 : x + 172} y2={y} stroke="rgba(255,255,255,0.60)" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />
      <text x={showNewTrade ? x + 362 : x + 180} y={y + 4}>PFE 95</text>
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

function buildSummary(data = [], showNewTrade = false, newTradeData = null, trade = {}) {
  let peakNew = 0
  let peakNewIndex = 0
  let peakDelta = 0
  let peakDeltaIndex = 0
  const postTrade = buildPostTradeEpeSeries(data, trade)

  data.forEach((point, index) => {
    const current = getCurrentEpe(point)
    const next = showNewTrade ? postTrade[index] : current
    const delta = next - current

    if (next > peakNew) {
      peakNew = next
      peakNewIndex = index
    }

    if (Math.abs(delta) > Math.abs(peakDelta)) {
      peakDelta = delta
      peakDeltaIndex = index
    }
  })

  return { peakNew, peakNewIndex, peakDelta, peakDeltaIndex }
}

function buildPostTradeEpeSeries(data = [], trade = {}) {
  const current = data.map((point) => getCurrentEpe(point))
  const notional = Math.abs(Number(trade?.notional || 0))

  if (!notional || !current.length) return current

  const maturityYears = Math.max(parseTenorYears(trade?.maturity_override || trade?.maturity || '5Y'), 0.25)
  const directionSign = String(trade?.direction || '').toUpperCase() === 'RECEIVE' ? -1 : 1

  // Front-end visual overlay only: keep the current portfolio EPE anchored and add
  // a marginal, notional-scaled IRS exposure shape. The shape ramps up smoothly,
  // peaks around the trade maturity and then runs off, avoiding the old standalone
  // trade curve that overwhelmed the portfolio profile.
  const peakDelta = notional * Math.min(0.035, 0.012 + maturityYears * 0.0035)

  return data.map((point, index) => {
    const bucketYears = Math.max(parseTenorYears(point?.label || point?.tenor || point?.bucket || `${index + 1}Y`), 1 / 12)
    const x = Math.max(bucketYears / maturityYears, 0.01)

    // x * exp(1 - x) is a smooth hump normalised to 1.0 at x = 1.
    // It gives a gradual build-up for short buckets and a natural decay after maturity.
    const smoothTermShape = x * Math.exp(1 - x)
    const runOff = bucketYears <= maturityYears ? 1 : Math.max(1 - (bucketYears - maturityYears) / Math.max(10 - maturityYears, 1), 0)
    const shape = Math.max(0, smoothTermShape * runOff)
    const signedDelta = peakDelta * shape * directionSign

    return Math.max(current[index] + signedDelta, 0)
  })
}

function parseTenorYears(value) {
  const text = String(value || '').trim().toUpperCase()
  const number = Number.parseFloat(text)
  if (!Number.isFinite(number)) return 1
  if (text.includes('M')) return number / 12
  if (text.includes('W')) return number / 52
  if (text.includes('D')) return number / 365
  return number
}

function getCurrentEpe(point = {}) {
  return Number(
    point.epe_current ??
      point.current_epe ??
      point.currentEpe ??
      point.epe ??
      point.exposure ??
      0,
  )
}

function getNewTradeEpe(point = {}) {
  const current = getCurrentEpe(point)
  return Number(
    point.epe_new_trade ??
      point.new_trade_epe ??
      point.newTradeEpe ??
      point.new_epe ??
      point.epe_new ??
      current,
  )
}

function getPfe(point = {}) {
  return Number(point.pfe_95 ?? point.pfe95 ?? point.pfe ?? 0)
}

function niceMax(value) {
  const magnitude = 10 ** Math.floor(Math.log10(value || 1))
  return Math.ceil(value / magnitude / 0.25) * magnitude * 0.25
}

function formatSignedCompact(value, currency) {
  const n = Number(value || 0)
  if (n === 0) return `${currencySymbol(currency)}0`
  return `${n > 0 ? '+' : '-'}${formatCompact(Math.abs(n), currency)}`
}

function formatCompact(value, currency) {
  const n = Number(value || 0)
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${sign}${currencySymbol(currency)}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}${currencySymbol(currency)}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${currencySymbol(currency)}${Math.round(abs / 1_000)}k`
  return `${sign}${currencySymbol(currency)}${Math.round(abs)}`
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

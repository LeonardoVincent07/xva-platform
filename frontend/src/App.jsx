import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000'

const emptyForm = {
  counterparty_id: '',
  instrument: 'IRS',
  currency: 'USD',
  floating_index: 'SOFR',
  notional: '50000000',
  maturity: '5Y',
  fixed_rate: '4.28',
  direction: 'PAY',
}

function App() {
  const [options, setOptions] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.get(`${API_BASE}/screens/screen1/options`)
      .then((res) => {
        setOptions(res.data)
        const defaultCounterparty =
          res.data.counterparties?.find((c) => c.name.includes('Deutsche')) ||
          res.data.counterparties?.[0]

        setForm((current) => ({
          ...current,
          counterparty_id: current.counterparty_id || defaultCounterparty?.id || '',
          instrument: res.data.instruments?.[0] || current.instrument,
          currency: 'USD',
          floating_index: 'SOFR',
          maturity: '5Y',
          direction: 'PAY',
        }))
      })
      .catch((err) => setError(err.message))
  }, [])

  const selectedCounterparty = useMemo(() => {
    return options.counterparties?.find((c) => c.id === form.counterparty_id)
  }, [options.counterparties, form.counterparty_id])

  const isValid =
    form.counterparty_id &&
    form.instrument &&
    form.currency &&
    form.floating_index &&
    form.notional &&
    form.maturity &&
    form.fixed_rate &&
    form.direction

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const calculate = () => {
    if (!isValid || loading) return

    setLoading(true)
    setError('')

    axios.post(`${API_BASE}/screens/screen1/calculate`, {
      counterparty_id: form.counterparty_id,
      instrument: form.instrument,
      currency: form.currency,
      maturity: form.maturity,
      direction: form.direction,
      floating_index: form.floating_index,
      notional: Number(form.notional),
      fixed_rate: Number(form.fixed_rate),
      maturity_override: null,
    })
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }

  const nettingSet = result?.netting_set || selectedCounterparty?.netting_set
  const parRate = result?.par_rate_pct ?? options.par_rates?.[form.currency]?.[form.maturity]

  return (
    <div className="min-h-screen bg-[rgb(27,33,44)] text-white font-['Lato'] px-5 py-4">
      <StatusBar result={result} />

      <div className="mt-4 flex items-end justify-between border-b border-white/10 pb-3">
        <div>
          <h1 className="font-['Montserrat'] text-3xl font-semibold tracking-tight text-[rgb(130,199,165)]">
            M7 XVA
          </h1>
          <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/55">
            New Trade — Incremental XVA
          </div>
        </div>
        <div className="flex gap-8 text-sm text-white/70">
          <span className="border-b-2 border-[rgb(1,69,172)] pb-3 text-white">Trader</span>
          <span className="pb-3">CVA risk</span>
          <span className="pb-3">Desk head</span>
          <span className="pb-3">Ops / quant</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <main className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-[49%_51%]">
        <section className="min-w-0">
          <SectionTitle>New Trade — Incremental XVA</SectionTitle>

          <Field label="Counterparty">
            <select name="counterparty_id" value={form.counterparty_id} onChange={handleChange} className={fieldClass}>
              <option value="">Select counterparty</option>
              {options.counterparties?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <MetaLine>{nettingSet?.id || 'Netting set'} — {nettingSet?.existing_trades ?? 14} trades, {formatCompactCurrency(nettingSet?.existing_notional ?? 2100000000, form.currency)}</MetaLine>

          <Field label="Instrument">
            <select name="instrument" value={form.instrument} onChange={handleChange} className={fieldClass}>
              {options.instruments?.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>

          <Field label="Currency">
            <select name="currency" value={form.currency} onChange={handleChange} className={fieldClass}>
              {options.currencies?.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>

          <Field label="Floating index">
            <select name="floating_index" value={form.floating_index} onChange={handleChange} className={fieldClass}>
              {options.floating_indices?.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>

          <Field label="Notional">
            <input name="notional" value={form.notional} onChange={handleChange} className={fieldClass} inputMode="numeric" />
          </Field>

          <Field label="Maturity">
            <select name="maturity" value={form.maturity} onChange={handleChange} className={fieldClass}>
              {options.maturities?.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>

          <Field label="Fixed rate">
            <input name="fixed_rate" value={form.fixed_rate} onChange={handleChange} className={fieldClass} inputMode="decimal" />
          </Field>

          <MetaLine>Par rate (cube snap): {formatPct(parRate)} — {result?.rate_delta_bps ?? 0}bps vs market</MetaLine>

          <Field label="Direction">
            <select name="direction" value={form.direction} onChange={handleChange} className={fieldClass}>
              {options.directions?.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>

          <button
            onClick={calculate}
            disabled={!isValid || loading}
            className={`mt-5 h-12 w-full font-['Montserrat'] text-sm font-semibold ${
              isValid && !loading
                ? 'bg-[rgb(1,69,172)] text-white hover:brightness-110'
                : 'bg-white/10 text-white/35'
            }`}
          >
            {loading ? 'Calculating...' : 'Calculate incremental XVA'}
          </button>

          <XvaResults result={result} currency={form.currency} />
        </section>

        <section className="min-w-0">
          <div className="flex items-center justify-between">
            <SectionTitle>EPE Profile — {nettingSet?.id || 'Netting Set'}</SectionTitle>
            {result?.calculation_run_id && (
              <span className="text-xs text-white/45">Run {result.calculation_run_id}</span>
            )}
          </div>

          <ExposureChart data={result?.exposure_profile || []} currency={form.currency} />

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <CompositionTable rows={result?.netting_set_composition} currency={form.currency} />
            <ParRates rates={result?.par_rates || options.par_rates?.[form.currency]} currency={form.currency} index={form.floating_index} />
          </div>
        </section>
      </main>
    </div>
  )
}

function StatusBar({ result }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs text-white/70">
      <div className="flex flex-wrap items-center gap-4">
        <span><Dot color="red" /> MUREX OFFLINE — 1h 42m</span>
        <span>Cube age: <span className="text-red-300">1h 42m</span></span>
        <span>Rates Δ: <span className="text-red-300">+7bps</span></span>
        <span>Credit Δ: <span className="text-amber-300">+4%</span></span>
        <span>Approx trades: {result?.approx_trades ?? '23'} ({result?.approx_pct ?? '2.1'}%)</span>
      </div>
      <div className="flex items-center gap-4">
        <span><Dot color="green" /> Trade feed live</span>
        <span><Dot color="amber" /> Credit feed stale</span>
      </div>
    </div>
  )
}

function XvaResults({ result, currency }) {
  if (!result) {
    return (
      <div className="mt-8 border border-white/10 bg-black/10 p-4 text-sm text-white/45">
        Submit a trade to calculate incremental XVA against the existing netting set profile.
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-2">
      <ResultRow label="CVA (incremental)" value={result.cva_incremental} bps={result.cva_bps} tone="red" currency={currency} />
      <ResultRow label="DVA (incremental)" value={result.dva_incremental} bps={result.dva_bps} tone="green" currency={currency} />
      <ResultRow label="FVA (incremental)" value={result.fva_incremental} bps={result.fva_bps} tone="red" currency={currency} />
      <div className="mt-4 flex items-baseline justify-between border-t border-white/10 px-4 pt-4">
        <span className="font-['Montserrat'] text-sm text-white">Total XVA charge</span>
        <span className="text-2xl text-red-300">
          {formatSignedCurrency(result.total_xva_charge, currency)} <span className="text-xl text-red-300/75">| {formatSignedBps(result.total_xva_bps)}</span>
        </span>
      </div>
      <div className="mt-6 flex items-center gap-2 text-xs text-white/60">
        <Dot color="amber" />
        <span>Confidence: <strong className="text-white">{result.confidence || 'Moderate'}</strong> — cube 1h 42m, rates +7bps, {result.approx_trades ?? 23} approx trades in netting set</span>
        <span className="ml-auto border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-amber-200">APPROX</span>
      </div>
    </div>
  )
}

function ResultRow({ label, value, bps, tone, currency }) {
  const colour = tone === 'green' ? 'text-[rgb(130,199,165)]' : 'text-red-300'
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm">
      <span>{label}</span>
      <span className={colour}>{formatSignedCurrency(value, currency)} <span className="text-white/55">|</span> {formatSignedBps(bps)}</span>
    </div>
  )
}

function ExposureChart({ data, currency }) {
  if (!data.length) {
    return <div className="h-[310px] border border-white/10 bg-black/10" />
  }

  const width = 780
  const height = 310
  const pad = { left: 64, right: 24, top: 24, bottom: 46 }
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
    <div className="border border-white/10 bg-black/10 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[310px] w-full">
        {yTicks.map((tick) => {
          const y = pad.top + plotH - tick * plotH
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)">
                {formatMillions(maxValue * tick, currency)}
              </text>
            </g>
          )
        })}
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="rgba(255,255,255,0.25)" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="rgba(255,255,255,0.25)" />

        <polyline points={makePolyline(current)} fill="none" stroke="rgb(55,140,230)" strokeWidth="3" />
        <polyline points={makePolyline(newTrade)} fill="none" stroke="rgb(255,95,95)" strokeWidth="3" strokeDasharray="7 5" />
        <polyline points={makePolyline(pfe)} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeDasharray="3 5" />

        {data.map((point, index) => {
          if (!point.show_tick) return null
          const [x] = makePoint(current[index], index)
          return (
            <text key={point.label} x={x} y={height - 15} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.65)">
              {point.label}
            </text>
          )
        })}

        <Legend x={pad.left} y={height - 4} />
      </svg>
    </div>
  )
}

function Legend({ x, y }) {
  return (
    <g fontSize="12" fill="rgba(255,255,255,0.72)">
      <line x1={x} y1={y} x2={x + 28} y2={y} stroke="rgb(55,140,230)" strokeWidth="3" />
      <text x={x + 36} y={y + 4}>EPE current</text>
      <line x1={x + 142} y1={y} x2={x + 170} y2={y} stroke="rgb(255,95,95)" strokeWidth="3" strokeDasharray="7 5" />
      <text x={x + 178} y={y + 4}>EPE + new trade</text>
      <line x1={x + 330} y1={y} x2={x + 358} y2={y} stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeDasharray="3 5" />
      <text x={x + 366} y={y + 4}>PFE 95th</text>
    </g>
  )
}

function CompositionTable({ rows, currency }) {
  const data = rows || [
    { label: '14 existing', notional: 2100000000, source: 'Computed', maturities: '6m–12Y' },
    { label: '2 added today', notional: 180000000, source: 'Interpolated', maturities: '3Y, 5Y' },
    { label: '+ this trade', notional: 50000000, source: 'Interpolated', maturities: '5Y' },
  ]

  return (
    <div>
      <SectionTitle>Netting Set Composition</SectionTitle>
      <table className="w-full border-collapse text-sm">
        <thead className="text-white/55">
          <tr>
            <th className="border-b border-white/10 py-2 text-left font-normal">Trades</th>
            <th className="border-b border-white/10 py-2 text-left font-normal">Notional</th>
            <th className="border-b border-white/10 py-2 text-left font-normal">Source</th>
            <th className="border-b border-white/10 py-2 text-left font-normal">Maturities</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.label}>
              <td className="border-b border-white/5 py-2">{row.label}</td>
              <td className="border-b border-white/5 py-2">{formatCompactCurrency(row.notional, currency)}</td>
              <td className="border-b border-white/5 py-2"><SourceTag source={row.source} /></td>
              <td className="border-b border-white/5 py-2">{row.maturities}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ParRates({ rates, currency, index }) {
  const ordered = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y']
  const data = rates || { '1Y': 4.85, '2Y': 4.62, '3Y': 4.48, '5Y': 4.28, '7Y': 4.22, '10Y': 4.18 }

  return (
    <div>
      <SectionTitle>Par Rates — {currency} {index} (Cube Snap)</SectionTitle>
      <div className="grid grid-cols-6 gap-4 text-sm">
        {ordered.map((tenor) => (
          <div key={tenor}>
            <div className="mb-1 text-white/45">{tenor}</div>
            <div>{formatPct(data[tenor])}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-4 grid grid-cols-[170px_1fr] items-center gap-4">
      <label className="text-sm text-white/90">{label}</label>
      {children}
    </div>
  )
}

function MetaLine({ children }) {
  return <div className="mb-5 ml-[186px] text-xs text-white/60">{children}</div>
}

function SectionTitle({ children }) {
  return <h2 className="mb-4 font-['Montserrat'] text-xs font-semibold uppercase tracking-[0.14em] text-white/90">{children}</h2>
}

function Dot({ color }) {
  const colours = {
    red: 'bg-red-400',
    green: 'bg-[rgb(130,199,165)]',
    amber: 'bg-amber-400',
  }
  return <span className={`mr-1 inline-block h-2 w-2 rounded-full ${colours[color]}`} />
}

function SourceTag({ source }) {
  const isComputed = source === 'Computed'
  return (
    <span className={`px-2 py-1 text-xs ${isComputed ? 'bg-[rgb(130,199,165)]/15 text-[rgb(130,199,165)]' : 'bg-amber-300/15 text-amber-200'}`}>
      {source}
    </span>
  )
}

const fieldClass = "h-9 w-full bg-transparent border-0 border-b border-white/20 px-2 text-white outline-none focus:border-[rgb(130,199,165)]"

function formatPct(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(2)}%`
}

function formatSignedBps(value) {
  if (value === undefined || value === null) return '—'
  const n = Number(value)
  return `${n > 0 ? '+' : ''}${n.toFixed(1)} bps`
}

function formatSignedCurrency(value, currency) {
  if (value === undefined || value === null) return '—'
  const n = Number(value)
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}${formatCurrency(Math.abs(n), currency)}`
}

function formatCurrency(value, currency) {
  const symbol = currencySymbol(currency)
  return `${symbol}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function formatCompactCurrency(value, currency) {
  const symbol = currencySymbol(currency)
  const n = Number(value || 0)
  if (Math.abs(n) >= 1_000_000_000) return `${symbol}${(n / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(n) >= 1_000_000) return `${symbol}${Math.round(n / 1_000_000)}M`
  return formatCurrency(n, currency)
}

function formatMillions(value, currency) {
  return `${currencySymbol(currency)}${Math.round(Number(value || 0) / 1_000_000)}M`
}

function currencySymbol(currency) {
  return currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'
}

export default App

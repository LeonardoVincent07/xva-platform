import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

import ExposureChart from './components/ExposureChart'
import PortfolioSummary from './components/PortfolioSummary'
import StatusBar from './components/StatusBar'
import TradeInputPanel from './components/TradeInputPanel'
import XvaMetrics from './components/XvaMetrics'

const API_BASE = 'http://127.0.0.1:8000'

const emptyForm = {
  counterparty_id: '',
  instrument: 'IRS',
  currency: 'USD',
  floating_index: 'SOFR',
  notional: '50000000',
  maturity: '5Y',
  maturity_override: '',
  fixed_rate: '4.28',
  direction: 'PAY',
}

const indexByCurrency = {
  USD: 'SOFR',
  EUR: 'EURIBOR',
  GBP: 'SONIA',
  CHF: 'SARON',
}

export default function App() {
  const [options, setOptions] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [result, setResult] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios
      .get(`${API_BASE}/screens/screen1/options`)
      .then((res) => {
        setOptions(res.data)

        const defaultCounterparty =
          res.data.counterparties?.find((c) => c.name.includes('Deutsche')) ||
          res.data.counterparties?.[0]

        const baseCurrency = defaultCounterparty?.netting_set?.base_currency || 'USD'

        setForm((current) => ({
          ...current,
          counterparty_id: current.counterparty_id || defaultCounterparty?.id || '',
          instrument: res.data.instruments?.[0] || current.instrument,
          currency: current.currency || baseCurrency,
          floating_index: current.floating_index || indexByCurrency[baseCurrency] || 'SOFR',
          maturity: current.maturity || '5Y',
          direction: current.direction || 'PAY',
        }))
      })
      .catch((err) => setError(err.response?.data?.detail || err.message))
  }, [])

  const selectedCounterparty = useMemo(() => {
    return options.counterparties?.find((c) => c.id === form.counterparty_id)
  }, [options.counterparties, form.counterparty_id])

  useEffect(() => {
    if (!form.counterparty_id) {
      setPreview(null)
      return
    }

    axios
      .get(`${API_BASE}/screens/screen1/context/${form.counterparty_id}`, {
        params: { currency: form.currency || selectedCounterparty?.netting_set?.base_currency },
      })
      .then((res) => setPreview(res.data))
      .catch((err) => setError(err.response?.data?.detail || err.message))
  }, [form.counterparty_id, form.currency, selectedCounterparty?.netting_set?.base_currency])

  const isValid = Boolean(
    form.counterparty_id &&
      form.instrument &&
      form.currency &&
      form.floating_index &&
      form.notional &&
      form.maturity &&
      form.fixed_rate &&
      form.direction,
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setResult(null)
    setError('')

    if (name === 'counterparty_id') {
      const cp = options.counterparties?.find((c) => c.id === value)
      const baseCurrency = cp?.netting_set?.base_currency || form.currency

      setForm((current) => ({
        ...current,
        counterparty_id: value,
        currency: baseCurrency,
        floating_index: indexByCurrency[baseCurrency] || current.floating_index,
      }))
      return
    }

    if (name === 'currency') {
      setForm((current) => ({
        ...current,
        currency: value,
        floating_index: indexByCurrency[value] || current.floating_index,
      }))
      return
    }

    setForm((current) => ({ ...current, [name]: value }))
  }

  const calculate = () => {
    if (!isValid || loading) return

    setLoading(true)
    setError('')

    axios
      .post(`${API_BASE}/screens/screen1/calculate`, {
        counterparty_id: form.counterparty_id,
        instrument: form.instrument,
        currency: form.currency,
        maturity: form.maturity_override || form.maturity,
        direction: form.direction,
        floating_index: form.floating_index,
        notional: Number(form.notional),
        fixed_rate: Number(form.fixed_rate),
        maturity_override: form.maturity_override || null,
      })
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }

  const displayData = result || preview
  const nettingSet = displayData?.netting_set || selectedCounterparty?.netting_set
  const parRates = displayData?.par_rates || options.par_rates?.[form.currency]
  const parRate = result?.par_rate_pct ?? parRates?.[form.maturity]

  return (
    <div className="min-h-screen bg-[#1B212C] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-5 py-4">
        <StatusBar result={result} preview={preview} />

        <header className="mt-4 flex items-end justify-between border-b border-white/10 pb-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-[#82C7A5]">
              M7 XVA
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/55">
              New Trade — Incremental XVA
            </p>
          </div>

          <nav className="hidden gap-8 text-sm text-white/60 lg:flex">
            <span className="border-b-2 border-[#0145AC] pb-3 text-white">Trader</span>
            <span className="pb-3">CVA Risk</span>
            <span className="pb-3">Desk Head</span>
            <span className="pb-3">Ops / Quant</span>
          </nav>
        </header>

        {error && (
          <div className="mt-4 border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <main className="mt-5 grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <TradeInputPanel
            form={form}
            options={options}
            isValid={isValid}
            loading={loading}
            nettingSet={nettingSet}
            parRate={parRate}
            result={result}
            onChange={handleChange}
            onCalculate={calculate}
          />

          <section className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-5">
            <PortfolioSummary
              counterparty={displayData?.counterparty || selectedCounterparty}
              nettingSet={nettingSet}
              result={result}
              currency={form.currency}
            />

            <ExposureChart
              data={displayData?.exposure_profile || []}
              currency={form.currency}
              runId={result?.calculation_run_id}
            />

            <div className="grid min-h-0 gap-5 2xl:grid-cols-[1fr_420px]">
              <XvaMetrics result={result} currency={form.currency} />
              <MarketDataPanel
                parRates={parRates}
                currency={form.currency}
                index={form.floating_index}
                composition={displayData?.netting_set_composition}
                selectedNotional={form.notional}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function MarketDataPanel({ parRates, currency, index, composition, selectedNotional }) {
  const ordered = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y']
  const fallbackRates = { '1Y': 4.85, '2Y': 4.62, '3Y': 4.48, '5Y': 4.28, '7Y': 4.22, '10Y': 4.18 }
  const rates = parRates || fallbackRates
  const rows = composition || [
    { label: 'Existing', notional: 0, source: 'Computed', maturities: '—' },
    { label: '+ this trade', notional: Number(selectedNotional || 0), source: 'Pending', maturities: '5Y' },
  ]

  return (
    <aside className="grid gap-5">
      <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
        <PaneTitle>Par Rates — {currency} {index}</PaneTitle>
        <div className="grid grid-cols-3 gap-3 text-sm sm:grid-cols-6 2xl:grid-cols-3">
          {ordered.map((tenor) => (
            <div key={tenor} className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
              <div className="text-[11px] uppercase tracking-[0.14em] text-white/40">{tenor}</div>
              <div className="mt-1 font-mono text-white">{formatPct(rates[tenor])}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
        <PaneTitle>Netting Set Breakdown</PaneTitle>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-white/[0.03] text-white/45">
              <tr>
                <th className="px-3 py-2 text-left font-normal">Bucket</th>
                <th className="px-3 py-2 text-right font-normal">Notional</th>
                <th className="px-3 py-2 text-left font-normal">Source</th>
                <th className="px-3 py-2 text-left font-normal">Maturity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.label}-${row.source}`} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white/80">{row.label}</td>
                  <td className="px-3 py-2 text-right font-mono text-white">{formatCompactCurrency(row.notional, currency)}</td>
                  <td className="px-3 py-2"><SourceTag source={row.source} /></td>
                  <td className="px-3 py-2 text-white/60">{row.maturities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </aside>
  )
}

function PaneTitle({ children }) {
  return <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/80">{children}</h2>
}

function SourceTag({ source }) {
  const computed = source === 'Computed'
  const pending = source === 'Pending'
  const tone = computed
    ? 'border-[#82C7A5]/30 bg-[#82C7A5]/10 text-[#82C7A5]'
    : pending
      ? 'border-white/15 bg-white/5 text-white/55'
      : 'border-amber-300/30 bg-amber-300/10 text-amber-200'

  return <span className={`rounded border px-2 py-0.5 text-[11px] ${tone}`}>{source}</span>
}

function formatPct(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(2)}%`
}

function formatCompactCurrency(value, currency) {
  const symbol = currencySymbol(currency)
  const n = Number(value || 0)
  if (Math.abs(n) >= 1_000_000_000) return `${symbol}${(n / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(n) >= 1_000_000) return `${symbol}${Math.round(n / 1_000_000)}M`
  return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function currencySymbol(currency) {
  return currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'CHF' ? 'CHF ' : '$'
}

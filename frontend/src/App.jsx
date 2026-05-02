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
  const [activeDrilldown, setActiveDrilldown] = useState(null)
  const [activeScreen, setActiveScreen] = useState('trader')

  const closeDrilldown = () => setActiveDrilldown(null)

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
          currency: baseCurrency,
          floating_index: indexByCurrency[baseCurrency] || 'SOFR',
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
      .get(`${API_BASE}/screens/screen1/context/${form.counterparty_id}`)
      .then((res) => {
        setPreview(res.data)

        const baseCurrency =
          res.data?.netting_set?.base_currency ||
          selectedCounterparty?.netting_set?.base_currency ||
          form.currency ||
          'USD'

        setForm((current) => ({
          ...current,
          currency: baseCurrency,
          floating_index: indexByCurrency[baseCurrency] || current.floating_index || 'SOFR',
        }))
      })
      .catch((err) => setError(err.response?.data?.detail || err.message))
  }, [form.counterparty_id])

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
  const runId = result?.calculation_run_id || '357C0417'
  const modelName = result?.model || 'M7-XVA-MVP'

  const openXvaDrilldown = (metric, value) => {
    setActiveDrilldown({
      type: 'xva',
      title: `${metric} Drilldown`,
      metric,
      value,
    })
  }

  const openExposureDrilldown = () => {
    const peakBucket = displayData?.exposure_profile?.reduce((peak, point) => {
      const exposure = Number(point?.new_epe ?? point?.epe ?? point?.exposure ?? 0)
      const peakExposure = Number(peak?.new_epe ?? peak?.epe ?? peak?.exposure ?? 0)
      return exposure > peakExposure ? point : peak
    }, displayData?.exposure_profile?.[0])

    setActiveDrilldown({
      type: 'exposure',
      title: `Exposure: ${peakBucket?.tenor || peakBucket?.bucket || 'profile'}`,
      bucket: peakBucket,
    })
  }

  const openRunDrilldown = () => {
    setActiveDrilldown({
      type: 'run',
      title: 'Run Context',
      runId,
      model: modelName,
      counterparty: displayData?.counterparty?.name || selectedCounterparty?.name || '—',
      trades: nettingSet?.trade_count || displayData?.portfolio_stats?.trades || 51,
    })
  }

  return (
    <div className="min-h-screen bg-[#1B212C] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-5 py-4">
        <button type="button" onClick={openRunDrilldown} className="block w-full text-left" title="View run context">
          <StatusBar result={result} preview={preview} />
        </button>

        <header className="mt-4 flex items-end justify-between border-b border-white/10 pb-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-[#82C7A5]">
              M7 XVA
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/55">
              {activeScreen === 'trader' ? 'New Trade — Incremental XVA' : 'CVA Risk — Exposure, Credit and LGD'}
            </p>
          </div>

          <nav className="hidden gap-8 text-sm text-white/60 lg:flex">
            <button type="button" onClick={() => setActiveScreen('trader')} className={`pb-3 ${activeScreen === 'trader' ? 'border-b-2 border-[#0145AC] text-white' : 'text-white/60'}`}>Trader</button>
            <button type="button" onClick={() => setActiveScreen('cvaRisk')} className={`pb-3 ${activeScreen === 'cvaRisk' ? 'border-b-2 border-[#0145AC] text-white' : 'text-white/60'}`}>CVA Risk</button>
            <span className="pb-3">Desk Head</span>
            <span className="pb-3">Ops / Quant</span>
          </nav>
        </header>

        {error && (
          <div className="mt-4 border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {activeScreen === 'trader' ? (
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

            <div
              role="button"
              tabIndex={0}
              onClick={openExposureDrilldown}
              onKeyDown={(e) => e.key === 'Enter' && openExposureDrilldown()}
              className="cursor-pointer"
              title="Drill into exposure profile"
            >
              <ExposureChart
                data={displayData?.exposure_profile || []}
                currency={form.currency}
                runId={result?.calculation_run_id}
              />
            </div>

            <div className="grid min-h-0 gap-5 2xl:grid-cols-[1fr_420px]">
              <div className="relative">
                <XvaMetrics result={result} currency={form.currency} notional={form.notional} />
                <div className="pointer-events-none absolute inset-x-4 top-[72px] grid grid-cols-4 gap-3">
                  {[
                    ['CVA', result?.cva_incremental ?? '—'],
                    ['DVA', result?.dva_incremental ?? '—'],
                    ['FVA', result?.fva_incremental ?? '—'],
                    ['TOTAL', result?.total_xva_charge ?? '—'],
                  ].map(([metric, value]) => (
                    <button
                      key={metric}
                      type="button"
                      onClick={() => openXvaDrilldown(metric, value)}
                      className="pointer-events-auto h-[132px] rounded-lg border border-transparent transition hover:border-[#82C7A5]/40 hover:bg-[#82C7A5]/5"
                      title={`${metric} drilldown`}
                      aria-label={`${metric} drilldown`}
                    />
                  ))}
                </div>
              </div>
              <MarketDataPanel
                parRates={parRates}
                currency={form.currency}
                index={form.floating_index}
                composition={displayData?.netting_set_composition}
                selectedNotional={form.notional}
                onNettingDrilldown={(row) =>
                  setActiveDrilldown({
                    type: 'nettingSet',
                    title: `${row.label} Trades`,
                    bucket: row,
                    currency: form.currency,
                    counterpartyId: form.counterparty_id,
                  })
                }
              />
            </div>
          </section>
        </main>

        ) : (
          <CvaRiskScreen
            onOpenCounterparty={(row) =>
              setActiveDrilldown({
                type: 'counterparty',
                title: row.counterparty?.name || 'Counterparty Risk',
                row,
                currency: row.currency,
              })
            }
            onOpenBucket={(bucket) =>
              setActiveDrilldown({
                type: 'bucket',
                title: `Bucket: ${bucket.label}`,
                bucket,
                currency: 'USD',
              })
            }
            onOpenRun={(summary) =>
              setActiveDrilldown({
                type: 'run',
                title: 'CVA Risk Run Context',
                runId: summary?.calculation_run_id || 'CVA-RISK-LIVE-VIEW',
                model: summary?.model_version || 'MVP-CVA-RISK-0.1',
                counterparty: 'Portfolio',
                trades: summary?.portfolio?.trades || 0,
              })
            }
          />
        )}      </div>

      {activeDrilldown && (
        <DrilldownDrawer activeDrilldown={activeDrilldown} onClose={closeDrilldown} currency={form.currency} />
      )}
    </div>
  )
}

function DrilldownDrawer({ activeDrilldown, onClose, currency }) {
  const symbol = currencySymbol(currency)
  const bucket = activeDrilldown.bucket || {}
  const [tradeDrilldown, setTradeDrilldown] = useState({ loading: false, error: '', trades: [] })

  useEffect(() => {
    if (activeDrilldown.type !== 'nettingSet' || !activeDrilldown.counterpartyId) {
      setTradeDrilldown({ loading: false, error: '', trades: [] })
      return
    }

    setTradeDrilldown({ loading: true, error: '', trades: [] })

    axios
      .get(`${API_BASE}/screens/screen1/netting-set/${activeDrilldown.counterpartyId}/trades`)
      .then((res) => {
        setTradeDrilldown({ loading: false, error: '', trades: res.data?.trades || [] })
      })
      .catch((err) => {
        setTradeDrilldown({ loading: false, error: err.response?.data?.detail || err.message, trades: [] })
      })
  }, [activeDrilldown.type, activeDrilldown.counterpartyId])

  const formatValue = (value) => {
    if (value === undefined || value === null || value === '—') return '—'
    if (typeof value === 'number') return formatCompactCurrency(value, currency)
    return String(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-[420px] overflow-y-auto border-l border-white/10 bg-[#1B212C] p-6 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="font-display text-xs uppercase tracking-[0.22em] text-white/45">Drilldown</div>
            <h2 className="mt-2 text-xl font-semibold text-white">{activeDrilldown.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-white/45 transition hover:text-white">
            ✕
          </button>
        </div>

        {activeDrilldown.type === 'xva' && (
          <div className="space-y-4 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-white/45">Metric</div>
              <div className="mt-1 text-lg text-white">{activeDrilldown.metric}</div>
              <div className="mt-2 font-mono text-2xl font-semibold text-[#82C7A5]">{formatValue(activeDrilldown.value)}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.16em] text-white/45">Bucket Contribution</div>
              <div className="space-y-2">
                <div className="flex justify-between"><span>1Y</span><span>{symbol}42k</span></div>
                <div className="flex justify-between"><span>2Y</span><span>{symbol}96k</span></div>
                <div className="flex justify-between"><span>3Y</span><span>{symbol}141k</span></div>
                <div className="flex justify-between"><span>5Y</span><span>{symbol}245k</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4 leading-relaxed">
              Impact is driven by projected positive exposure, counterparty default probability and LGD assumption.
            </div>
          </div>
        )}

        {activeDrilldown.type === 'exposure' && (
          <div className="space-y-4 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-white/45">Selected Bucket</div>
              <div className="mt-1 text-lg text-white">{bucket.tenor || bucket.bucket || 'Exposure profile'}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4 space-y-2">
              <div className="flex justify-between"><span>Current EPE</span><span>{formatCompactCurrency(bucket.epe ?? bucket.current_epe ?? 245000000, currency)}</span></div>
              <div className="flex justify-between"><span>With trade</span><span>{formatCompactCurrency(bucket.new_epe ?? bucket.with_trade ?? 257000000, currency)}</span></div>
              <div className="flex justify-between"><span>Delta</span><span className="text-[#82C7A5]">{formatCompactCurrency((bucket.new_epe ?? 257000000) - (bucket.epe ?? 245000000), currency)}</span></div>
            </div>
          </div>
        )}

        {activeDrilldown.type === 'run' && (
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex justify-between"><span>Run ID</span><span className="font-mono text-white">{activeDrilldown.runId}</span></div>
            <div className="flex justify-between"><span>Model</span><span className="font-mono text-white">{activeDrilldown.model}</span></div>
            <div className="flex justify-between"><span>Counterparty</span><span className="text-white">{activeDrilldown.counterparty}</span></div>
            <div className="flex justify-between"><span>Trades loaded</span><span className="font-mono text-white">{activeDrilldown.trades}</span></div>
            <div className="flex justify-between"><span>Rates cube age</span><span className="font-mono text-white">2m 14s</span></div>
            <div className="flex justify-between"><span>Credit feed</span><span className="text-amber-200">Stale</span></div>
          </div>
        )}


        {activeDrilldown.type === 'counterparty' && (
          <div className="space-y-4 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-white/45">Counterparty</div>
              <div className="mt-1 text-lg text-white">{activeDrilldown.row?.counterparty?.name}</div>
              <div className="mt-1 font-mono text-white/50">{activeDrilldown.row?.netting_set?.id}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <RiskMiniStat label="CVA" value={formatCompactCurrency(activeDrilldown.row?.cva, activeDrilldown.row?.currency || currency)} />
              <RiskMiniStat label="Peak EPE" value={formatCompactCurrency(activeDrilldown.row?.peak_epe, activeDrilldown.row?.currency || currency)} />
              <RiskMiniStat label="Credit Spread" value={`${activeDrilldown.row?.credit_spread_bps ?? '—'} bps`} />
              <RiskMiniStat label="LGD" value={formatPercent(activeDrilldown.row?.lgd)} />
            </div>
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.16em] text-white/45">Causal Explanation</div>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Exposure driver</span><span className="text-white">{formatCompactCurrency(activeDrilldown.row?.peak_epe, activeDrilldown.row?.currency || currency)}</span></div>
                <div className="flex justify-between"><span>Credit driver</span><span className="text-white">{activeDrilldown.row?.credit_spread_bps} bps</span></div>
                <div className="flex justify-between"><span>Loss assumption</span><span className="text-white">{formatPercent(activeDrilldown.row?.lgd)}</span></div>
                <div className="flex justify-between"><span>Primary driver</span><span className="text-[#82C7A5]">{activeDrilldown.row?.driver}</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.16em] text-white/45">Largest Trades</div>
              <div className="space-y-2">
                {(activeDrilldown.row?.trades || []).slice(0, 6).map((trade) => (
                  <div key={trade.trade_id} className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <div className="flex justify-between gap-3 text-white">
                      <span>{trade.external_trade_id || trade.trade_id}</span>
                      <span>{formatCompactCurrency(trade.notional, trade.currency)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/45">
                      <span>{trade.direction} · {trade.fixed_rate}% · {trade.floating_index}</span>
                      <span>{trade.maturity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeDrilldown.type === 'bucket' && (
          <div className="space-y-4 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-white/45">Time Bucket</div>
              <div className="mt-1 text-lg text-white">{bucket.label}</div>
              <div className="mt-1 font-mono text-white/50">{bucket.date}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4 space-y-2">
              <div className="flex justify-between"><span>Portfolio EPE</span><span>{formatCompactCurrency(bucket.epe, currency)}</span></div>
              <div className="flex justify-between"><span>Portfolio PFE 95</span><span>{formatCompactCurrency(bucket.pfe_95, currency)}</span></div>
              <div className="flex justify-between"><span>CVA Contribution</span><span className="text-[#82C7A5]">{formatCompactCurrency(-Math.abs(bucket.cva_contribution || 0), currency)}</span></div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4 leading-relaxed">
              This bucket view links the risk number back to expected exposure, PFE and marginal CVA contribution. The current MVP uses the existing trade set and simplified credit assumptions.
            </div>
          </div>
        )}

        {activeDrilldown.type === 'nettingSet' && (
          <div className="space-y-3 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-white/45">Selected Bucket</div>
              <div className="mt-1 text-lg text-white">{bucket.label}</div>
              <div className="mt-1 font-mono text-white/70">{formatCompactCurrency(bucket.notional, currency)}</div>
            </div>

            {tradeDrilldown.loading && (
              <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4 text-white/60">
                Loading trades from database…
              </div>
            )}

            {tradeDrilldown.error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">
                {tradeDrilldown.error}
              </div>
            )}

            {!tradeDrilldown.loading && !tradeDrilldown.error && tradeDrilldown.trades.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4 text-white/60">
                No trades found for this netting set.
              </div>
            )}

            {!tradeDrilldown.loading && !tradeDrilldown.error && tradeDrilldown.trades.slice(0, activeDrilldown?.title === "2 added today Trades" ? 2 : undefined).map((trade) => (
              <div key={trade.trade_id} className="rounded-xl border border-white/10 bg-[#222B3A] p-3">
                <div className="flex justify-between gap-4 text-white">
                  <span>{trade.external_trade_id || trade.trade_id}</span>
                  <span>{formatCompactCurrency(trade.notional, trade.currency || currency)}</span>
                </div>
                <div className="mt-1 flex justify-between text-white/45">
                  <span>{trade.product} · {trade.direction} · {trade.fixed_rate}%</span>
                  <span>{trade.maturity}</span>
                </div>
                <div className="mt-1 flex justify-between text-white/35">
                  <span>{trade.floating_index}</span>
                  <span>{trade.maturity_date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CvaRiskScreen({ onOpenCounterparty, onOpenBucket, onOpenRun }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    counterpartyId: 'ALL',
    currency: 'ALL',
    bucket: 'ALL',
    view: 'CVA',
  })

  useEffect(() => {
    setLoading(true)
    axios
      .get(`${API_BASE}/screens/cva-risk/summary`)
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  const allRows = summary?.counterparties || []
  const currencies = useMemo(() => {
    return ['ALL', ...Array.from(new Set(allRows.map((row) => row.currency).filter(Boolean))).sort()]
  }, [allRows])

  const bucketLabels = useMemo(() => {
    const labels = new Set()
    ;(summary?.buckets || []).forEach((bucket) => labels.add(bucket.label))
    allRows.forEach((row) => (row.exposure_profile || []).forEach((bucket) => labels.add(bucket.label)))
    return ['ALL', ...Array.from(labels)]
  }, [summary, allRows])

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const counterpartyMatch = filters.counterpartyId === 'ALL' || row.counterparty?.id === filters.counterpartyId
      const currencyMatch = filters.currency === 'ALL' || row.currency === filters.currency
      return counterpartyMatch && currencyMatch
    })
  }, [allRows, filters.counterpartyId, filters.currency])

  const selected = useMemo(() => {
    if (filters.counterpartyId !== 'ALL') {
      return filteredRows.find((row) => row.counterparty?.id === filters.counterpartyId) || filteredRows[0]
    }
    return filteredRows[0] || allRows[0]
  }, [filteredRows, allRows, filters.counterpartyId])

  const activeCurrency = filters.currency === 'ALL' ? selected?.currency || 'USD' : filters.currency
  const sourceBuckets = filters.counterpartyId === 'ALL'
    ? summary?.buckets || []
    : selected?.exposure_profile || []
  const buckets = (sourceBuckets || []).filter((bucket) => filters.bucket === 'ALL' || bucket.label === filters.bucket)
  const chartData = buckets.length > 0 ? buckets : sourceBuckets || []

  const filteredPortfolio = useMemo(() => {
    const rows = filteredRows.length ? filteredRows : allRows

    const cva = rows.reduce((total, row) => total + Number(row.cva || 0), 0)
    const dva = rows.reduce((total, row) => total + Number(row.dva || 0), 0)
    const netCva = rows.reduce((total, row) => total + Number(row.net_cva || 0), 0)
    const cs01 = rows.reduce((total, row) => total + Math.abs(Number(row.cs01 || 0)), 0)
    const peakEpe = Math.max(...rows.map((row) => Number(row.peak_epe || 0)), 0)
    const trades = rows.reduce((total, row) => total + Number(row.netting_set?.trade_count || 0), 0)

    return {
      cva: cva || Math.abs(Number(summary?.portfolio?.cva || 0)),
      dva: dva || Math.abs(Number(summary?.portfolio?.dva || 0)),
      net_cva: netCva || Math.abs(Number(summary?.portfolio?.net_cva || 0)),
      cs01: cs01 || summary?.portfolio?.cs01,
      peak_epe: peakEpe || summary?.portfolio?.peak_epe,
      counterparties: rows.length || summary?.portfolio?.counterparties,
      trades: trades || summary?.portfolio?.trades,
    }
  }, [filteredRows, allRows, summary])
  



  if (loading) {
    return <main className="mt-5 flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-[#222B3A] text-white/60">Loading CVA risk from backend…</main>
  }

  if (error) {
    return <main className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-6 text-red-200">{error}</main>
  }

  return (
    <main className="mt-5 grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
      <aside className="grid content-start gap-5">
        <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <PaneTitle>Risk Filters</PaneTitle>
              <p className="text-xs text-white/45">Portfolio lens for CVA, exposure and CS01</p>
            </div>
            <span className="rounded-full border border-[#82C7A5]/30 bg-[#82C7A5]/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#82C7A5]">Live</span>
          </div>

          <div className="space-y-4">
            <label className="block">
              <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/45">Counterparty</div>
              <select value={filters.counterpartyId} onChange={(e) => handleFilterChange('counterpartyId', e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#1B212C] px-3 py-2 text-sm text-white outline-none transition focus:border-[#82C7A5]/60">
                <option value="ALL">All counterparties</option>
                {allRows.map((row) => <option key={row.counterparty?.id} value={row.counterparty?.id}>{row.counterparty?.name}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/45">Currency</div>
                <select value={filters.currency} onChange={(e) => handleFilterChange('currency', e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#1B212C] px-3 py-2 text-sm text-white outline-none transition focus:border-[#82C7A5]/60">
                  {currencies.map((currency) => <option key={currency} value={currency}>{currency === 'ALL' ? 'All' : currency}</option>)}
                </select>
              </label>

              <label className="block">
                <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/45">Time Bucket</div>
                <select value={filters.bucket} onChange={(e) => handleFilterChange('bucket', e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#1B212C] px-3 py-2 text-sm text-white outline-none transition focus:border-[#82C7A5]/60">
                  {bucketLabels.map((bucket) => <option key={bucket} value={bucket}>{bucket === 'ALL' ? 'All' : bucket}</option>)}
                </select>
              </label>
            </div>

            <label className="block">
              <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/45">View Mode</div>
              <select value={filters.view} onChange={(e) => handleFilterChange('view', e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#1B212C] px-3 py-2 text-sm text-white outline-none transition focus:border-[#82C7A5]/60">
                <option value="CVA">CVA</option>
                <option value="EXPOSURE">Exposure</option>
                <option value="CS01">CS01</option>
              </select>
            </label>
          </div>

          <button type="button" onClick={() => onOpenRun?.(summary)} className="mt-5 w-full rounded-lg border border-[#0145AC]/50 bg-[#0145AC]/25 px-3 py-2 text-left text-xs uppercase tracking-[0.16em] text-white/75 transition hover:border-[#82C7A5]/60 hover:bg-[#82C7A5]/10">
            View CVA run context
          </button>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
          <PaneTitle>Filtered Risk Summary</PaneTitle>
          <div className="grid grid-cols-2 gap-3">
            <RiskMiniStat label="CVA" value={formatCompactCurrency(filteredPortfolio.cva, activeCurrency)} tone="green" />
            <RiskMiniStat label="Peak EPE" value={formatCompactCurrency(filteredPortfolio.peak_epe, activeCurrency)} />
            <RiskMiniStat label="CS01" value={formatCompactCurrency(filteredPortfolio.cs01, activeCurrency)} />
            <RiskMiniStat label="Trades" value={filteredPortfolio.trades ?? '—'} />
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-3 text-xs leading-relaxed text-white/55">
            Filters are client-side over the CVA summary payload. They change the selected counterparties, chart, bucket table and summary numbers without introducing new workflow plumbing.
          </div>
        </section>
      </aside>

      <section className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-5">
        <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
          <div className="flex items-start justify-between gap-5">
            <div>
              <PaneTitle>{filters.counterpartyId === 'ALL' ? 'Portfolio CVA Risk' : 'Selected Counterparty'}</PaneTitle>
              <h2 className="font-display text-2xl font-semibold text-white">{filters.counterpartyId === 'ALL' ? 'All Counterparties' : selected?.counterparty?.name || '—'}</h2>
              <p className="mt-1 text-sm text-white/50">CVA is decomposed into exposure, credit spread and LGD so the number feels causal rather than arbitrary.</p>
            </div>
            <div className="grid min-w-[620px] grid-cols-6 gap-3">
              <RiskMiniStat
                label="CVA"
                value={formatCompactCurrency(filteredPortfolio.cva, activeCurrency)}
              />
             <RiskMiniStat
                label="DVA"
                value={formatCompactCurrency(filteredPortfolio.dva, activeCurrency)}
              />
              <RiskMiniStat
                 label="Net CVA"
                 value={formatCompactCurrency(filteredPortfolio.net_cva, activeCurrency)}
              />
              <RiskMiniStat label="Names" value={filteredPortfolio.counterparties?.length ?? '—'} />
              <RiskMiniStat label="Bucket" value={filters.bucket === 'ALL' ? 'All' : filters.bucket} />
              <RiskMiniStat label="Currency" value={filters.currency === 'ALL' ? 'All' : filters.currency} />
            </div>
          </div>
        </section>

        <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <RiskProfileChart data={chartData} currency={activeCurrency} onOpenBucket={onOpenBucket} />
          <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
            <PaneTitle>Risk Drivers</PaneTitle>
            <div className="space-y-3 text-sm text-white/70">
              <DriverRow label="Exposure" value={formatCompactCurrency(selected?.peak_epe || filteredPortfolio.peak_epe, activeCurrency)} detail="Peak EPE" />
              <DriverRow label="Credit" value={selected?.credit_spread_bps ? `${selected.credit_spread_bps} bps` : 'Portfolio blend'} detail="5Y spread proxy" />
              <DriverRow label="LGD" value={selected?.lgd ? formatPercent(selected.lgd) : 'Name-weighted'} detail={selected?.recovery_rate ? `${formatPercent(selected.recovery_rate)} recovery` : 'recovery assumption'} />
              <div className="rounded-lg border border-[#82C7A5]/20 bg-[#82C7A5]/10 p-3 text-[#82C7A5]">Primary driver: {selected?.driver || 'Exposure concentration'}</div>
            </div>
          </section>
        </section>

        <section className="grid min-h-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
            <PaneTitle>{filters.view} by Time Bucket</PaneTitle>
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-white/[0.03] text-white/45">
                  <tr><th className="px-3 py-2 text-left font-normal">Bucket</th><th className="px-3 py-2 text-right font-normal">EPE</th><th className="px-3 py-2 text-right font-normal">PFE 95</th><th className="px-3 py-2 text-right font-normal">CVA Contribution</th></tr>
                </thead>
                <tbody>
                  {buckets.map((bucket) => (
                    <tr key={bucket.label} onClick={() => onOpenBucket?.(bucket)} className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.04]">
                      <td className="px-3 py-2 text-white/80">{bucket.label}</td>
                      <td className="px-3 py-2 text-right font-mono text-white">{formatCompactCurrency(bucket.epe, activeCurrency)}</td>
                      <td className="px-3 py-2 text-right font-mono text-white/70">{formatCompactCurrency(bucket.pfe_95, activeCurrency)}</td>
                      <td className="px-3 py-2 text-right font-mono text-[#82C7A5]">{formatCompactCurrency(-Math.abs(bucket.cva_contribution || 0), activeCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
            <PaneTitle>Counterparty Risk</PaneTitle>
            <div className="space-y-2">
              {filteredRows.map((row) => (
                <button key={row.counterparty?.id} type="button" onClick={() => { handleFilterChange('counterpartyId', row.counterparty?.id); onOpenCounterparty?.(row) }} className="w-full rounded-lg border border-white/10 bg-black/10 p-3 text-left transition hover:border-[#82C7A5]/40 hover:bg-[#82C7A5]/5">
                  <div className="flex justify-between gap-3 text-sm text-white"><span>{row.counterparty?.name}</span><span>{formatCompactCurrency(row.cva, row.currency)}</span></div>
                  <div className="mt-1 flex justify-between text-xs text-white/45"><span>{row.netting_set?.trade_count} trades · {row.currency}</span><span>{row.driver}</span></div>
                </button>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  )
}

function RiskProfileChart({ data, currency, onOpenBucket }) {
  const width = 760
  const height = 250
  const padX = 42
  const padY = 30
  const maxEpe = Math.max(...(data || []).map((p) => Number(p.epe || 0)), 1)
  const maxPfe = Math.max(...(data || []).map((p) => Number(p.pfe_95 || 0)), maxEpe)
  const max = Math.max(maxEpe, maxPfe)
  const points = (data || []).map((point, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max((data || []).length - 1, 1)
    const epeY = height - padY - (Number(point.epe || 0) / max) * (height - padY * 2)
    const pfeY = height - padY - (Number(point.pfe_95 || 0) / max) * (height - padY * 2)
    return { ...point, x, epeY, pfeY }
  })
  const epePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.epeY}`).join(' ')
  const pfePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.pfeY}`).join(' ')

  return (
    <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
      <PaneTitle>Exposure Profile — EPE / PFE</PaneTitle>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full overflow-visible">
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="rgba(255,255,255,0.18)" />
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="rgba(255,255,255,0.18)" />
        <path d={pfePath} fill="none" stroke="#0145AC" strokeWidth="3" opacity="0.9" />
        <path d={epePath} fill="none" stroke="#82C7A5" strokeWidth="3" />
        {points.map((point) => (
          <g key={point.label} onClick={() => onOpenBucket?.(point)} className="cursor-pointer">
            <circle cx={point.x} cy={point.epeY} r="5" fill="#82C7A5" />
            <circle cx={point.x} cy={point.pfeY} r="4" fill="#0145AC" />
            <text x={point.x} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">{point.label}</text>
          </g>
        ))}
        <text x={padX} y="14" fill="rgba(255,255,255,0.5)" fontSize="11">Peak {formatCompactCurrency(max, currency)}</text>
      </svg>
      <div className="mt-2 flex gap-5 text-xs text-white/50"><span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#82C7A5]" />EPE</span><span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#0145AC]" />PFE 95</span></div>
    </section>
  )
}

function RiskMiniStat({ label, value, tone }) {
  return <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2"><div className="text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</div><div className={`mt-1 font-mono text-lg ${tone === 'green' ? 'text-[#82C7A5]' : 'text-white'}`}>{value}</div></div>
}

function DriverRow({ label, value, detail }) {
  return <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/10 p-3"><div><div className="text-white">{label}</div><div className="text-xs text-white/40">{detail}</div></div><div className="font-mono text-white">{value}</div></div>
}

function formatPercent(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return `${(Number(value) * 100).toFixed(1)}%`
}

function MarketDataPanel({ parRates, currency, index, composition, selectedNotional, onNettingDrilldown }) {
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
                <tr
                  key={`${row.label}-${row.source}`}
                  onClick={() => onNettingDrilldown?.(row)}
                  className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.04]"
                >
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

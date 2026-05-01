export default function XvaMetrics({ result, currency }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Incremental XVA</h2>
          <p className="mt-1 text-xs text-white/45">Pre-trade charge impact against selected netting set</p>
        </div>
        {result?.status && <span className="rounded border border-[#82C7A5]/25 bg-[#82C7A5]/10 px-2 py-1 text-[11px] text-[#82C7A5]">{result.status}</span>}
      </div>

      {!result ? (
        <div className="flex h-[190px] items-center justify-center rounded-lg border border-white/10 bg-black/10 text-sm text-white/40">
          Submit a trade to calculate CVA, DVA, FVA and total XVA.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="CVA" value={result.cva_incremental} bps={result.cva_bps} currency={currency} tone="charge" />
            <Metric label="DVA" value={result.dva_incremental} bps={result.dva_bps} currency={currency} tone="benefit" />
            <Metric label="FVA" value={result.fva_incremental} bps={result.fva_bps} currency={currency} tone="charge" />
            <Metric label="Total" value={result.total_xva_charge} bps={result.total_xva_bps} currency={currency} tone="charge" strong />
          </div>

          <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/10 p-3 text-xs text-white/60 md:grid-cols-4">
            <Detail label="CS01" value={formatCurrency(result.cs01, currency)} />
            <Detail label="Credit spread" value={formatDecimalPct(result.credit_spread)} />
            <Detail label="Recovery" value={formatDecimalPct(result.recovery_rate)} />
            <Detail label="Maturity date" value={result.maturity_date || '—'} />
          </div>
        </>
      )}
    </section>
  )
}

function Metric({ label, value, bps, currency, tone, strong }) {
  const colour = tone === 'benefit' ? 'text-[#82C7A5]' : 'text-red-300'
  return (
    <div className={`rounded-lg border bg-black/10 px-4 py-3 ${strong ? 'border-[#82C7A5]/35' : 'border-white/10'}`}>
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className={`mt-2 font-mono text-xl ${colour}`}>{formatSignedCurrency(value, currency)}</div>
      <div className="mt-1 font-mono text-xs text-white/45">{formatSignedBps(bps)}</div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">{label}</div>
      <div className="mt-1 font-mono text-white/80">{value}</div>
    </div>
  )
}

function formatDecimalPct(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return `${(Number(value) * 100).toFixed(2)}%`
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
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  const symbol = currencySymbol(currency)
  return `${symbol}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function currencySymbol(currency) {
  return currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'CHF' ? 'CHF ' : '$'
}

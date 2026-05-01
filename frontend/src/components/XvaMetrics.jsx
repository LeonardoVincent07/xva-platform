export default function XvaMetrics({ result, currency, notional }) {
  const total = Number(result?.total_xva_charge || 0)
  const absTotal = Math.abs(total)
  const notionalNumber = Number(notional || 0)
  const xvaRatio = notionalNumber ? (absTotal / notionalNumber) * 100 : null

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
        <div className="flex h-[214px] items-center justify-center rounded-lg border border-white/10 bg-black/10 text-sm text-white/40">
          Submit a trade to calculate CVA, DVA, FVA and total XVA.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="CVA" value={result.cva_incremental} bps={result.cva_bps} currency={currency} description="Counterparty credit" />
            <Metric label="DVA" value={result.dva_incremental} bps={result.dva_bps} currency={currency} description="Own credit offset" />
            <Metric label="FVA" value={result.fva_incremental} bps={result.fva_bps} currency={currency} description="Funding impact" />
            <Metric label="Total" value={result.total_xva_charge} bps={result.total_xva_bps} currency={currency} description="Net charge" strong />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-[#82C7A5]/20 bg-[#82C7A5]/[0.06] p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Decision signal</div>
                  <div className="mt-1 text-sm text-white/80">Incremental charge is within normal pre-trade tolerance</div>
                </div>
                <div className="rounded-full border border-[#82C7A5]/30 bg-[#82C7A5]/10 px-3 py-1 text-xs font-semibold text-[#82C7A5]">CLEAR</div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Charge / notional</div>
              <div className="mt-1 font-mono text-lg text-white">{xvaRatio === null ? '—' : `${xvaRatio.toFixed(3)}%`}</div>
            </div>
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

function Metric({ label, value, bps, currency, description, strong }) {
  const n = Number(value || 0)
  const chargeIncrease = n >= 0
  const colour = chargeIncrease ? 'text-red-300' : 'text-[#82C7A5]'
  const tag = chargeIncrease ? 'Charge ↑' : 'Benefit ↓'

  return (
    <div className={`rounded-lg border bg-black/10 px-4 py-3 ${strong ? 'border-[#82C7A5]/35 shadow-[inset_0_0_0_1px_rgba(130,199,165,0.08)]' : 'border-white/10'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</div>
          <div className="mt-0.5 text-[11px] text-white/35">{description}</div>
        </div>
        <span className={`rounded border px-2 py-0.5 text-[10px] ${chargeIncrease ? 'border-red-300/25 bg-red-400/10 text-red-200' : 'border-[#82C7A5]/25 bg-[#82C7A5]/10 text-[#82C7A5]'}`}>{tag}</span>
      </div>
      <div className={`mt-3 font-mono text-2xl leading-none ${colour}`}>{formatSignedCurrency(value, currency)}</div>
      <div className="mt-2 flex items-center justify-between font-mono text-xs text-white/45">
        <span>{formatSignedBps(bps)}</span>
        <span>{strong ? 'NET' : 'INCR'}</span>
      </div>
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

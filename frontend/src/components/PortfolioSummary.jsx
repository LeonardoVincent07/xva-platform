export default function PortfolioSummary({ counterparty, nettingSet, result, currency }) {
  const confidence = result?.confidence || 'Preview'
  const approxTrades = result?.approx_trades ?? Math.max(2, Math.round((nettingSet?.existing_trades || 0) * 0.18))
  const grossNotional = nettingSet?.existing_notional || 0

  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Portfolio Context</h2>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{counterparty?.name || 'Counterparty'}</div>
            <div className="mt-1 font-mono text-xs text-white/45">{nettingSet?.id || '—'} · {currency} collateral set</div>
          </div>
          <div className="rounded-lg border border-[#82C7A5]/30 bg-[#82C7A5]/10 px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#82C7A5]/80">Confidence</div>
            <div className="mt-1 font-display text-sm font-semibold text-[#82C7A5]">{confidence}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/15">
        <Metric label="Trades" value={nettingSet?.existing_trades ?? 0} />
        <Metric label="Gross Notional" value={formatCompactCurrency(grossNotional, currency)} />
        <Metric label="Approx" value={`${approxTrades}`} />
      </div>
    </section>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</div>
      <div className="mt-1 truncate font-mono text-lg text-white">{value}</div>
    </div>
  )
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

export default function TradeInputPanel({
  form,
  options,
  isValid,
  loading,
  nettingSet,
  parRate,
  result,
  onChange,
  onCalculate,
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#222B3A] p-4 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
            Trade Input
          </h2>
          <p className="mt-1 text-xs text-white/45">Pre-trade incremental XVA overlay</p>
        </div>
        <span className="rounded-full border border-[#82C7A5]/35 bg-[#82C7A5]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#82C7A5]">
          Live
        </span>
      </div>

      <div className="space-y-3">
        <SelectField label="Counterparty" name="counterparty_id" value={form.counterparty_id} onChange={onChange}>
          <option value="">Select counterparty</option>
          {options.counterparties?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </SelectField>

        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/55">
          <span className="text-white/35">Netting set</span>{' '}
          <span className="font-mono text-white/85">{nettingSet?.id || '—'}</span>
          <span className="mx-2 text-white/20">|</span>
          <span>{nettingSet?.existing_trades ?? 0} trades</span>
          <span className="mx-2 text-white/20">|</span>
          <span>{formatCompactCurrency(nettingSet?.existing_notional, form.currency)}</span>
        </div>

        <SelectField label="Instrument" name="instrument" value={form.instrument} onChange={onChange}>
          {(options.instruments || ['IRS']).map((item) => <option key={item} value={item}>{item}</option>)}
        </SelectField>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Currency" name="currency" value={form.currency} onChange={onChange}>
            {(options.currencies || ['USD', 'EUR', 'GBP', 'CHF']).map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
          <SelectField label="Index" name="floating_index" value={form.floating_index} onChange={onChange}>
            {(options.floating_indices || ['SOFR', 'EURIBOR', 'SONIA', 'SARON']).map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
        </div>

        <InputField label="Notional" name="notional" value={form.notional} onChange={onChange} inputMode="numeric" />

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Maturity" name="maturity" value={form.maturity} onChange={onChange}>
            {(options.maturities || ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y']).map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
          <InputField label="Broken period" name="maturity_override" value={form.maturity_override} onChange={onChange} placeholder="e.g. 18M" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InputField label="Fixed rate %" name="fixed_rate" value={form.fixed_rate} onChange={onChange} inputMode="decimal" />
          <SelectField label="Direction" name="direction" value={form.direction} onChange={onChange}>
            {(options.directions || ['PAY', 'RECEIVE']).map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/60">
          <div className="flex justify-between">
            <span>Par rate</span>
            <span className="font-mono text-white">{formatPct(parRate)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Rates delta</span>
            <span className={Number(result?.rate_delta_bps || 0) >= 0 ? 'font-mono text-red-300' : 'font-mono text-[#82C7A5]'}>
              {result ? formatSignedBps(result.rate_delta_bps) : 'awaiting calc'}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onCalculate}
        disabled={!isValid || loading}
        className={`mt-5 h-12 w-full rounded-lg font-display text-sm font-semibold uppercase tracking-[0.12em] transition ${
          isValid && !loading
            ? 'bg-[#0145AC] text-white shadow-lg shadow-[#0145AC]/20 hover:brightness-110'
            : 'bg-white/10 text-white/35'
        }`}
      >
        {loading ? 'Calculating...' : 'Calculate XVA Impact'}
      </button>
    </section>
  )
}

function SelectField({ label, name, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</span>
      <select name={name} value={value} onChange={onChange} className={fieldClass}>
        {children}
      </select>
    </label>
  )
}

function InputField({ label, name, value, onChange, placeholder, inputMode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        className={fieldClass}
      />
    </label>
  )
}

const fieldClass = 'h-10 w-full rounded-lg border border-white/10 bg-[#1B212C] px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#82C7A5] focus:ring-1 focus:ring-[#82C7A5]/30'

function formatPct(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(2)}%`
}

function formatSignedBps(value) {
  if (value === undefined || value === null) return '—'
  const n = Number(value)
  return `${n > 0 ? '+' : ''}${n.toFixed(1)} bps`
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

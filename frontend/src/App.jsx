import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
  const [options, setOptions] = useState({})
  const [form, setForm] = useState({
    counterparty_id: '',
    instrument: '',
    currency: '',
    floating_index: '',
    notional: '',
    maturity: '',
    fixed_rate: '',
    direction: ''
  })
  const [result, setResult] = useState(null)

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/screens/screen1/options')
      .then(res => {
        console.log("OPTIONS:", res.data) // keep for debugging
        setOptions(res.data)
      })
      .catch(console.error)
  }, [])

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
    setResult(null)
  }

  const isValid =
    form.counterparty_id &&
    form.instrument &&
    form.currency &&
    form.floating_index &&
    form.notional &&
    form.maturity &&
    form.fixed_rate &&
    form.direction

  const calculate = () => {
    if (!isValid) return

    axios.post('http://127.0.0.1:8000/screens/screen1/calculate', {
      counterparty_id: form.counterparty_id,
      instrument: form.instrument,
      currency: form.currency,
      maturity: form.maturity,
      direction: form.direction,
      floating_index: form.floating_index,
      notional: Number(form.notional),
      fixed_rate: Number(form.fixed_rate) / 100,
      maturity_override: null
    })
    .then(res => setResult(res.data))
    .catch(console.error)
  }

  return (
    <div className="min-h-screen bg-[rgb(27,33,44)] text-white font-['Lato'] px-6 py-6">

      <h1 className="text-2xl mb-6 font-['Montserrat']">
        CVA Scenario (Real Input)
      </h1>

      <div className="grid grid-cols-[160px_1fr] gap-y-4 max-w-xl">

        <label>Counterparty</label>
        <select name="counterparty_id" value={form.counterparty_id} onChange={handleChange} className={input}>
          <option value="">Select counterparty</option>
          {options.counterparties?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label>Instrument</label>
        <select name="instrument" value={form.instrument} onChange={handleChange} className={input}>
          <option value="">Select instrument</option>
          {options.instruments?.map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>

        <label>Currency</label>
        <select name="currency" value={form.currency} onChange={handleChange} className={input}>
          <option value="">Select currency</option>
          {options.currencies?.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label>Floating Index</label>
        <select name="floating_index" value={form.floating_index} onChange={handleChange} className={input}>
          <option value="">Select index</option>
          <option value="SONIA">SONIA</option>
          <option value="SOFR">SOFR</option>
          <option value="EURIBOR">EURIBOR</option>
        </select>

        <label>Notional</label>
        <input name="notional" value={form.notional} onChange={handleChange} className={input} />

        <label>Maturity</label>
        <select name="maturity" value={form.maturity} onChange={handleChange} className={input}>
          <option value="">Select maturity</option>
          {options.maturities?.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <label>Fixed Rate (%)</label>
        <input name="fixed_rate" value={form.fixed_rate} onChange={handleChange} className={input} />

        <label>Direction</label>
        <select name="direction" value={form.direction} onChange={handleChange} className={input}>
          <option value="">Select direction</option>
          {options.directions?.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

      </div>

      <button
        onClick={calculate}
        disabled={!isValid}
        className={`mt-6 px-6 py-3 font-bold ${
          isValid
            ? 'bg-[rgb(1,69,172)] hover:brightness-110'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        Calculate CVA
      </button>

      {result && (
        <div className="mt-6 border border-white/10 p-4">
          <div>CVA: £{Number(result.cva_amount).toLocaleString()}</div>
          <div>CS01: {result.cs01}</div>
          <div>Run ID: {result.calculation_run_id}</div>
          <ExposureChart data={result.exposure_profile || []} />
        </div>
      )}
    </div>
  )
}

function ExposureChart({ data }) {
  if (!data.length) return null

  const width = 560
  const height = 220
  const padding = 32
  const values = data.map(point => Number(point.expected_positive_exposure ?? point.epe ?? 0))
  const maxValue = Math.max(...values, 1)

  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1)
    const y = height - padding - (value / maxValue) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="mt-6">
      <div className="mb-2 font-['Montserrat'] text-sm text-white/80">Expected Positive Exposure Profile</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl border border-white/10 bg-black/10">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.25)" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.25)" />
        <polyline points={points} fill="none" stroke="rgb(130,199,165)" strokeWidth="3" />
        {data.map((point, index) => {
          const value = values[index]
          const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1)
          const y = height - padding - (value / maxValue) * (height - padding * 2)

          return (
            <g key={`${point.date}-${index}`}>
              <circle cx={x} cy={y} r="4" fill="rgb(130,199,165)" />
              <text x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.75)">
                {point.date?.slice(0, 4) || index + 1}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const input =
  "bg-transparent border-b border-white/20 outline-none px-2 py-1 text-white"

export default App
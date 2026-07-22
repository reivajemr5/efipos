import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Settings() {
  const [rate, setRate] = useState<number | null>(null)
  const [source, setSource] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [customRate, setCustomRate] = useState('')
  const [autoLoading, setAutoLoading] = useState(false)
  const [customLoading, setCustomLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const data = await api.exchangeRate.get()
      setRate(Number(data.rate))
      setSource(data.source)
      setLastUpdate(data.createdAt)
    } catch {}
  }

  async function handleAutoUpdate() {
    setAutoLoading(true); setMessage('')
    try { const data = await api.exchangeRate.autoUpdate(); setRate(Number(data.rate)); setSource(data.source); setLastUpdate(data.createdAt); setMessage('Tasa actualizada') }
    catch (e: any) { setMessage(e.message) }
    finally { setAutoLoading(false) }
  }

  async function handleCustomUpdate() {
    if (!customRate) return
    setCustomLoading(true); setMessage('')
    try { const data = await api.exchangeRate.update(Number(customRate)); setRate(Number(data.rate)); setSource('manual'); setLastUpdate(data.createdAt); setCustomRate(''); setMessage('Tasa actualizada') }
    catch (e: any) { setMessage(e.message) }
    finally { setCustomLoading(false) }
  }

  return (
    <div className="page-container max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">Tasa de Cambio</h2>

        {rate && (
          <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1">
            <p className="text-blue-900 font-medium">Tasa actual: <span className="font-mono text-lg">Bs. {rate.toFixed(4)}</span></p>
            <p className="text-blue-600">Fuente: {source} · {lastUpdate ? new Date(lastUpdate).toLocaleString() : '—'}</p>
          </div>
        )}

        <button onClick={handleAutoUpdate} disabled={autoLoading} className="btn-primary">
          {autoLoading ? 'Actualizando...' : 'Actualizar desde BCV'}
        </button>

        <hr className="border-gray-100" />

        <div>
          <label className="label">Tasa manual</label>
          <div className="flex gap-2">
            <input type="number" step="0.0001" className="input flex-1" placeholder="Bs. por USD" value={customRate} onChange={(e) => setCustomRate(e.target.value)} />
            <button onClick={handleCustomUpdate} disabled={customLoading || !customRate} className="btn-primary">{customLoading ? '...' : 'Establecer'}</button>
          </div>
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
        )}
      </div>
    </div>
  )
}

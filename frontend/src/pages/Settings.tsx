import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useRole } from '../hooks/useRole'
import { useAuthStore } from '../store/auth'

interface SaleModes {
  decimalQuantityMode: string
  sellWithoutStockMode: string
  priceOverrideMode: string
}

const MODE_LABELS: Record<string, string> = {
  all: 'Todos los productos',
  selected: 'Solo los marcados',
  none: 'Ninguno',
}

export default function Settings() {
  const { isSuper, isDueno } = useRole()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const canEditSaleModes = isSuper || isDueno

  const [rate, setRate] = useState<number | null>(null)
  const [source, setSource] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [customRate, setCustomRate] = useState('')
  const [autoLoading, setAutoLoading] = useState(false)
  const [customLoading, setCustomLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [modes, setModes] = useState<SaleModes>({ decimalQuantityMode: 'none', sellWithoutStockMode: 'none', priceOverrideMode: 'none' })
  const [modesLoading, setModesLoading] = useState(false)
  const [modesMessage, setModesMessage] = useState('')

  useEffect(() => { load() }, [])
  useEffect(() => { loadSaleModes() }, [])

  async function load() {
    try {
      const data = await api.exchangeRate.get()
      setRate(Number(data.rate))
      setSource(data.source)
      setLastUpdate(data.createdAt)
    } catch {}
  }

  async function loadSaleModes() {
    try {
      const data = await api.businesses.settings()
      if (data) setModes({
        decimalQuantityMode: data.decimalQuantityMode || 'none',
        sellWithoutStockMode: data.sellWithoutStockMode || 'none',
        priceOverrideMode: data.priceOverrideMode || 'none',
      })
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

  async function saveSaleModes() {
    if (!activeBusinessId) { setModesMessage('No hay un negocio activo'); return }
    setModesLoading(true); setModesMessage('')
    try {
      await api.businesses.update(activeBusinessId, modes)
      setModesMessage('Opciones guardadas')
    } catch (e: any) {
      setModesMessage(e.message || 'Error al guardar')
    } finally {
      setModesLoading(false)
    }
  }

  const modeSelect = (key: keyof SaleModes, label: string, desc: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={modes[key]}
        disabled={!canEditSaleModes}
        onChange={(e) => setModes((m) => ({ ...m, [key]: e.target.value }))}
        className="input w-full"
      >
        {Object.keys(MODE_LABELS).map((k) => (
          <option key={k} value={k}>{MODE_LABELS[k]}</option>
        ))}
      </select>
      <p className="text-xs text-gray-400 mt-1">{desc}</p>
    </div>
  )

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

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">Opciones de venta</h2>
        {!canEditSaleModes && (
          <p className="text-xs text-amber-600">Solo el dueño o superadmin puede modificar estas opciones.</p>
        )}
        <div className="space-y-4">
          {modeSelect('decimalQuantityMode', 'Cantidades decimales (peso)', 'Permite vender por peso: productos marcados aceptan cantidades como 0.500 kg.')}
          {modeSelect('sellWithoutStockMode', 'Venta sin stock', 'Permite vender más de lo disponible (el stock puede quedar negativo).')}
          {modeSelect('priceOverrideMode', 'Cambio de precio en factura', 'Permite modificar el precio de venta directamente en el ticket.')}
        </div>
        {canEditSaleModes && (
          <div>
            <button onClick={saveSaleModes} disabled={modesLoading} className="btn-primary">
              {modesLoading ? 'Guardando...' : 'Guardar opciones'}
            </button>
            {modesMessage && (
              <p className={`text-sm font-medium mt-2 ${modesMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{modesMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
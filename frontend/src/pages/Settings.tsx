import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Settings() {
  const [rate, setRate] = useState(0)
  const [source, setSource] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [customRate, setCustomRate] = useState('')
  const [autoLoading, setAutoLoading] = useState(false)
  const [customLoading, setCustomLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const data = await api.exchangeRate.get()
      setRate(Number(data.rate))
      setSource(data.source)
      setLastUpdate(data.date)
      setCustomRate(String(data.rate))
    } catch {}
  }

  useEffect(() => { load() }, [])

  async function handleAutoUpdate() {
    setAutoLoading(true)
    setMessage('')
    try {
      const data = await api.exchangeRate.autoUpdate()
      setRate(data.rate)
      setSource(data.source)
      setMessage(`✅ ${data.message}: Bs. ${data.rate}`)
      load()
    } catch (err) {
      setMessage('❌ No se pudo obtener la tasa automáticamente')
    } finally {
      setAutoLoading(false)
    }
  }

  async function handleManualUpdate() {
    if (!customRate || isNaN(Number(customRate))) return
    setCustomLoading(true)
    setMessage('')
    try {
      await api.exchangeRate.update(Number(customRate))
      setMessage('✅ Tasa actualizada manualmente')
      load()
    } catch {
      setMessage('❌ Error al guardar la tasa')
    } finally {
      setCustomLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración</h2>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <h3 className="font-semibold text-lg">Tasa de Cambio BCV</h3>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-center text-blue-900">
            Bs. {rate.toFixed(2)}
          </div>
          <p className="text-center text-sm text-gray-500 mt-1">
            por USD
            {source && <span> · Fuente: {source}</span>}
            {lastUpdate && <span> · {new Date(lastUpdate).toLocaleDateString()}</span>}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">Actualización automática</p>
          <button
            onClick={handleAutoUpdate}
            disabled={autoLoading}
            className="w-full bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {autoLoading ? 'Obteniendo tasa...' : '🔄 Obtener tasa del BCV hoy'}
          </button>
          <p className="text-xs text-gray-400">
            Consulta la tasa oficial del BCV desde dolarapi.com y pydolarve.org.
            Se actualiza automáticamente cada día a las 10:00 AM.
          </p>
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm text-gray-600 font-medium">O ingresar manualmente</p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
              placeholder="Ej: 62.50"
            />
            <button
              onClick={handleManualUpdate}
              disabled={customLoading}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              {customLoading ? '...' : 'Guardar'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`text-sm p-3 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-4">
        <h3 className="font-semibold mb-3">Información del sistema</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>Los productos pueden tener precio en <strong>Bs</strong> o <strong>$</strong></p>
          <p>Las facturas y cotizaciones muestran el total en la moneda seleccionada + su equivalente en Bs</p>
          <p>La tasa BCV se actualiza automáticamente cada día hábil</p>
        </div>
      </div>
    </div>
  )
}

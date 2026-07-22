import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

const typeLabels: Record<string, string> = { sale: 'Venta', purchase: 'Compra', adjustment: 'Ajuste' }
const typeColors: Record<string, string> = { sale: 'text-red-600 bg-red-50', purchase: 'text-green-600 bg-green-50', adjustment: 'text-amber-600 bg-amber-50' }

export default function Inventory() {
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [adjustForm, setAdjustForm] = useState({ productId: 0, quantity: 0, notes: '' })
  const toast = useToastStore((s: any) => s.addToast)

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const params = new URLSearchParams()
      if (filter) params.set('product', filter)
      if (filterType) params.set('type', filterType)
      const [mov, prods] = await Promise.all([api.inventory.movements(params.toString()), api.products.list()])
      setMovements(mov)
      setProducts(prods)
    } catch {} finally { setLoading(false) }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustForm.productId || !adjustForm.quantity) return
    try {
      await api.inventory.adjust({ ...adjustForm, quantity: Number(adjustForm.quantity) })
      toast('Ajuste registrado')
      setShowAdjust(false)
      setAdjustForm({ productId: 0, quantity: 0, notes: '' })
      load()
    } catch (e: any) { alert(e.message) }
  }

  async function openHistory(productId: number) {
    try {
      const data = await api.inventory.history(productId)
      setHistoryData(data)
      setShowHistory(true)
    } catch {}
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full" /></div>

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <button onClick={() => setShowAdjust(true)} className="btn-primary">+ Ajustar</button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Buscar producto..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select className="input max-w-[140px]" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos</option>
          <option value="sale">Venta</option>
          <option value="purchase">Compra</option>
          <option value="adjustment">Ajuste</option>
        </select>
        <button onClick={load} className="btn-secondary">Filtrar</button>
      </div>

      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Stock Anterior</th>
              <th>Stock Actual</th>
              <th>Notas</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Sin movimientos</td></tr>
            ) : movements.map((m: any) => (
              <tr key={m.id}>
                <td>
                  <button onClick={() => openHistory(m.productId)} className="text-blue-600 hover:underline font-medium text-left">{m.product?.name || '—'}</button>
                </td>
                <td><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[m.type] || ''}`}>{typeLabels[m.type] || m.type}</span></td>
                <td className="font-mono font-medium">{m.quantity}</td>
                <td className="text-gray-500 font-mono">{m.stockBefore}</td>
                <td className="font-mono font-medium">{m.stockAfter}</td>
                <td className="text-gray-500 text-xs max-w-[200px] truncate">{m.notes || '—'}</td>
                <td className="text-gray-500 text-xs">{new Date(m.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdjust && (
        <div className="modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Ajustar Inventario</h2>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="label">Producto *</label>
                <select className="input" value={adjustForm.productId} onChange={(e) => setAdjustForm({ ...adjustForm, productId: Number(e.target.value) })} required>
                  <option value={0}>Seleccionar...</option>
                  {products.map((p: any) => (<option key={p.id} value={p.id}>{p.name} ({p.stock} uds)</option>))}
                </select>
              </div>
              <div>
                <label className="label">Cantidad *</label>
                <input type="number" className="input" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })} required />
                <p className="text-xs text-gray-400 mt-1">Usa valores negativos para reducir stock</p>
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea className="input" value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdjust(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Ajustar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-card max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Historial</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Stock Anterior</th>
                  <th>Stock Actual</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historyData.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">Sin historial</td></tr>
                ) : historyData.map((m: any) => (
                  <tr key={m.id}>
                    <td><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[m.type] || ''}`}>{typeLabels[m.type] || m.type}</span></td>
                    <td className="font-mono font-medium">{m.quantity}</td>
                    <td className="font-mono text-gray-500">{m.stockBefore}</td>
                    <td className="font-mono">{m.stockAfter}</td>
                    <td className="text-gray-500 text-xs">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

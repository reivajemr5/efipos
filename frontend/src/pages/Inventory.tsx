import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

const typeLabels: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
}
const typeColors: Record<string, string> = {
  sale: 'bg-red-100 text-red-700',
  purchase: 'bg-green-100 text-green-700',
  adjustment: 'bg-blue-100 text-blue-700',
}

export default function Inventory() {
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)
  const [showHistory, setShowHistory] = useState<any>(null)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [adjustForm, setAdjustForm] = useState({ productId: '', quantity: '', type: 'adjustment', notes: '' })
  const addToast = useToastStore((s) => s.addToast)

  async function loadMovements() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter) params.set('product_id', filter)
    if (filterType) params.set('type', filterType)
    const data = await api.inventory.movements(params.toString() || undefined)
    setMovements(data)
    setLoading(false)
  }

  async function loadProducts() {
    const data = await api.products.list()
    setProducts(data)
  }

  useEffect(() => { loadProducts() }, [])
  useEffect(() => { loadMovements() }, [filter, filterType])

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustForm.productId || !adjustForm.quantity) { addToast('Selecciona un producto y cantidad', 'error'); return }
    await api.inventory.adjust({
      productId: Number(adjustForm.productId),
      quantity: Number(adjustForm.quantity),
      type: adjustForm.type,
      notes: adjustForm.notes,
    })
    addToast('Stock ajustado', 'success')
    setShowAdjust(false)
    setAdjustForm({ productId: '', quantity: '', type: 'adjustment', notes: '' })
    loadMovements()
  }

  async function openHistory(productId: number) {
    const data = await api.inventory.history(productId)
    setHistoryData(data)
    const product = products.find((p) => p.id === productId)
    setShowHistory(product || { id: productId, name: 'Producto', code: '' })
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Inventario</h2>
        <button onClick={() => setShowAdjust(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm">+ Ajustar Stock</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por producto..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Todos</option>
          <option value="sale">Ventas</option>
          <option value="purchase">Compras</option>
          <option value="adjustment">Ajustes</option>
        </select>
      </div>

      {/* Adjust modal */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAdjust(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-md mx-4 shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Ajustar Stock</h3>
            <form onSubmit={handleAdjust} className="space-y-3">
              <select value={adjustForm.productId} onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required>
                <option value="">Seleccionar producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name} (stock: {p.stock})</option>
                ))}
              </select>
              <input value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                type="number" placeholder="Cantidad (usa negativo para reducir)" required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <p className="text-xs text-gray-400">Positivo = entrada, Negativo = salida</p>
              <input value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                placeholder="Motivo del ajuste"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm font-medium">Aplicar</button>
                <button type="button" onClick={() => setShowAdjust(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHistory(null)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">{showHistory.name}</h3>
            <p className="text-sm text-gray-500 font-mono mb-4">{showHistory.code}</p>
            <div className="space-y-2">
              {historyData.length === 0 && <p className="text-gray-400 text-center py-8">Sin movimientos</p>}
              {historyData.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[m.type] || 'bg-gray-100 text-gray-700'}`}>
                      {typeLabels[m.type] || m.type}
                    </span>
                    <span className="text-gray-600">{m.notes || m.reference}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-medium ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">stock: {m.stockBefore} → {m.stockAfter}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString('es-VE')}</span>
                  {m.user && <span className="text-xs text-gray-400">{m.user.name}</span>}
                </div>
              ))}
            </div>
            <button onClick={() => setShowHistory(null)}
              className="w-full mt-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cerrar</button>
          </div>
        </div>
      )}

      {/* Movements list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Producto</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Cantidad</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Stock</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Referencia</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              )}
              {!loading && movements.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Sin movimientos</td></tr>
              )}
              {movements.map((m: any) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openHistory(m.productId)}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(m.createdAt).toLocaleString('es-VE')}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700">{m.product?.name}</span>
                    <span className="text-gray-400 ml-1 font-mono">{m.product?.code}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[m.type] || 'bg-gray-100 text-gray-700'}`}>
                      {typeLabels[m.type] || m.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {m.stockBefore} → {m.stockAfter}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.reference || m.notes || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.user?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

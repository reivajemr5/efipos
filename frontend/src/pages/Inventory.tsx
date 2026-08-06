import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'
import PaginationBar from '../components/PaginationBar'
import { useAuthStore } from '../store/auth'
import { useRole } from '../hooks/useRole'

const typeLabels: Record<string, string> = { sale: 'Venta', purchase: 'Compra', adjustment: 'Ajuste', import: 'Importación' }
const typeColors: Record<string, string> = { sale: 'text-red-600 bg-red-50', purchase: 'text-green-600 bg-green-50', adjustment: 'text-amber-600 bg-amber-50', import: 'text-blue-600 bg-blue-50' }

export default function Inventory() {
  const { isSuper, isDueno, isAdmin } = useRole()
  const myBranchId = useAuthStore((s) => s.user?.branchId ?? null)
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])
  const [selectedBranch, setSelectedBranch] = useState<number | ''>('')
  const [movements, setMovements] = useState<any[]>([])
  const [movementsTotal, setMovementsTotal] = useState(0)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [adjustForm, setAdjustForm] = useState({ productId: 0, quantity: 0, notes: '' })
  const toast = useToastStore((s: any) => s.addToast)

  // Dueno/super can adjust any branch; admin can only adjust their own (and view others).
  const canAdjustAny = (isSuper || isDueno) ? selectedBranch !== '' : (selectedBranch === myBranchId)

  useEffect(() => {
    api.branches.list()
      .then((bs: any) => {
        const list = Array.isArray(bs) ? bs : []
        setBranches(list)
        const initial = list[0]?.id ?? ''
        if (selectedBranch === '') setSelectedBranch(isAdmin ? (myBranchId ?? initial) : initial || '')
        if (selectedBranch === '' && list.length === 0) setLoading(false)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [page, selectedBranch])
  async function load() {
    try {
      const params = new URLSearchParams()
      if (filter) params.set('product', filter)
      if (filterType) params.set('type', filterType)
      if (selectedBranch !== '') params.set('branchId', String(selectedBranch))
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))
      const [mov, prods] = await Promise.all([api.inventory.movements(params.toString()), api.products.list()])
      setMovements(Array.isArray(mov) ? mov : mov.items)
      setMovementsTotal(Array.isArray(mov) ? mov.length : mov.total)
      setProducts(prods)
    } catch {} finally { setLoading(false) }
  }

  function applyFilters() {
    setPage(0)
    load()
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustForm.productId || !adjustForm.quantity) return
    if (!canAdjustAny) { alert('Solo puedes ajustar stock en tu propia sucursal'); return }
    try {
      const body: any = { ...adjustForm, quantity: Number(adjustForm.quantity), type: 'adjustment' }
      if (selectedBranch !== '') body.branchId = Number(selectedBranch)
      await api.inventory.adjust(body)
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <div className="flex items-center gap-2">
          {branches.length > 0 && (
            <select
              className="input max-w-[180px]"
              value={selectedBranch}
              onChange={(e) => { const v = e.target.value; setPage(0); setSelectedBranch(v === '' ? '' : Number(v)) }}
            >
              {!isAdmin && <option value="">Todas las sucursales</option>}
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{isAdmin && b.id === myBranchId ? ' (mía)' : ''}</option>)}
            </select>
          )}
          <button onClick={() => setShowAdjust(true)} className="btn-primary" disabled={!canAdjustAny}>+ Ajustar</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Buscar producto..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select className="input max-w-[140px]" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos</option>
          <option value="sale">Venta</option>
          <option value="purchase">Compra</option>
          <option value="adjustment">Ajuste</option>
        </select>
        <button onClick={applyFilters} className="btn-secondary">Filtrar</button>
      </div>

      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Sucursal</th>
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
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">Sin movimientos</td></tr>
            ) : movements.map((m: any) => (
              <tr key={m.id}>
                <td>
                  <button onClick={() => openHistory(m.productId)} className="text-blue-600 hover:underline font-medium text-left">{m.product?.name || '—'}</button>
                </td>
                <td className="text-gray-500">{m.branch?.name || '—'}</td>
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
      <PaginationBar page={page} onPage={setPage} total={movementsTotal} pageSize={PAGE_SIZE} />

      {showAdjust && (
        <div className="modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Ajustar Inventario</h2>
            {selectedBranch !== '' && (
              <p className="text-xs text-gray-500 mb-3">
                Sucursal: <span className="font-medium text-gray-700">{branches.find((b) => b.id === selectedBranch)?.name}</span>
              </p>
            )}
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="label">Producto *</label>
                <select className="input" value={adjustForm.productId} onChange={(e) => setAdjustForm({ ...adjustForm, productId: Number(e.target.value) })} required>
                  <option value={0}>Seleccionar...</option>
                  {products.map((p: any) => (<option key={p.id} value={p.id}>{p.name} ({p.stock} uds)</option>))}
                </select>
              </div>
              <div>
                <label className="label">Nuevo stock *</label>
                <input type="number" min="0" className="input" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })} required />
                <p className="text-xs text-gray-400 mt-1">Cantidad total a fijar en la sucursal</p>
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
                  <th>Sucursal</th>
                  <th>Cantidad</th>
                  <th>Stock Anterior</th>
                  <th>Stock Actual</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historyData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">Sin historial</td></tr>
                ) : historyData.map((m: any) => (
                  <tr key={m.id}>
                    <td><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[m.type] || ''}`}>{typeLabels[m.type] || m.type}</span></td>
                    <td className="text-gray-500">{m.branch?.name || '—'}</td>
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
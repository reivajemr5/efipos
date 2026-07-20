import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface Purchase {
  id: number
  number: string
  supplier: { id: number; name: string; documentType: string; documentNumber: string }
  subtotal: number
  ivaTotal: number
  total: number
  totalBs: number | null
  status: string
  paymentMethod: string
  dueDate: string | null
  notes: string | null
  createdAt: string
  items: {
    id?: number
    productId: number
    product?: { id: number; name: string; code: string }
    quantity: number
    unitPrice: number
    ivaPercent: number
    subtotal: number
  }[]
}

interface Supplier {
  id: number
  name: string
}

interface Product {
  id: number
  name: string
  code: string
  price: number
  currency: string
  ivaPercent: number
  stock: number
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Purchase | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [items, setItems] = useState<{ productId: number; quantity: number }[]>([])
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchSupplier, setSearchSupplier] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false)
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })

  async function load() {
    const params = filterStatus ? `status=${filterStatus}` : ''
    const [pur, sup, prods] = await Promise.all([
      api.purchases.list(params), api.suppliers.list(), api.products.list(),
    ])
    setPurchases(pur)
    setSuppliers(sup)
    setProducts(prods)
  }

  useEffect(() => { load() }, [filterStatus])

  async function createSupplier(e: React.FormEvent) {
    e.preventDefault()
    try {
      const supplier = await api.suppliers.create(newSupplierForm)
      setSuppliers((prev) => [...prev, supplier])
      setSelectedSupplier(supplier)
      setShowNewSupplierForm(false)
      setNewSupplierForm({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })
    } catch { }
  }

  async function createPurchase() {
    if (!selectedSupplier || items.length === 0) return
    await api.purchases.create({
      supplierId: selectedSupplier.id,
      paymentMethod,
      dueDate: dueDate || null,
      notes: notes || null,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    })
    setShowForm(false); setSelectedSupplier(null); setItems([]); setDueDate(''); setNotes(''); load()
  }

  async function markAsPaid(id: number) {
    await api.purchases.pay(id)
    setShowDetail(null); load()
  }

  async function cancelPurchase(id: number) {
    if (!confirm('¿Anular esta compra? Se restaurará el stock.')) return
    await api.purchases.cancel(id)
    setShowDetail(null); load()
  }

  function addItem(productId: number) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) return prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId, quantity: 1 }]
    })
  }

  function updateQty(productId: number, quantity: number) {
    if (quantity <= 0) { setItems((prev) => prev.filter((i) => i.productId !== productId)); return }
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity } : i))
  }

  function calcItemTotal(item: { productId: number; quantity: number }) {
    const p = products.find((x) => x.id === item.productId)
    if (!p) return 0
    return Number(p.price) * item.quantity * (1 + Number(p.ivaPercent) / 100)
  }

  function calcSubtotal() {
    return items.reduce((sum, item) => {
      const p = products.find((x) => x.id === item.productId)
      if (!p) return sum
      return sum + Number(p.price) * item.quantity
    }, 0)
  }

  function calcIva() {
    return items.reduce((sum, item) => {
      const p = products.find((x) => x.id === item.productId)
      if (!p) return sum
      return sum + Number(p.price) * item.quantity * Number(p.ivaPercent) / 100
    }, 0)
  }

  const statusBadge = (s: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-amber-100 text-amber-800',
      pagada: 'bg-green-100 text-green-800',
      anulada: 'bg-red-100 text-red-800',
    }
    return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[s] || ''}`}>{s}</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Compras</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800">+ Nueva</button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'pendiente', 'pagada', 'anulada'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === s ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {s === '' ? 'Todas' : s === 'pendiente' ? 'Pendientes' : s === 'pagada' ? 'Pagadas' : 'Anuladas'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Nueva Compra</h3>

            <label className="block text-sm font-medium mb-1">Proveedor</label>
            {selectedSupplier ? (
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-2">
                <span>{selectedSupplier.name}</span>
                <button onClick={() => setSelectedSupplier(null)} className="text-red-500 text-sm">Cambiar</button>
              </div>
            ) : (
              <div className="relative mb-2">
                <input value={searchSupplier} onChange={(e) => setSearchSupplier(e.target.value)} placeholder="Buscar proveedor..."
                  className="w-full px-3 py-2 border rounded-lg" onFocus={() => setShowSupplierPicker(true)} />
                {showSupplierPicker && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto z-10 shadow">
                    {suppliers.filter((s) => s.name.toLowerCase().includes(searchSupplier.toLowerCase())).map((s) => (
                      <button key={s.id} onClick={() => { setSelectedSupplier(s); setShowSupplierPicker(false); setSearchSupplier('') }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm">{s.name}</button>
                    ))}
                    <button onClick={() => { setShowNewSupplierForm(true); setShowSupplierPicker(false) }}
                      className="w-full text-left px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium border-t">+ Nuevo proveedor</button>
                  </div>
                )}
              </div>
            )}

            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-3">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
            </select>

            <div className="flex gap-2 mb-3">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Fecha vencimiento" />
            </div>

            <label className="block text-sm font-medium mb-1">Productos</label>
            <div className="space-y-2 mb-3">
              {items.map((item) => {
                const p = products.find((x) => x.id === item.productId)
                if (!p) return null
                return (
                  <div key={item.productId} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <span className="flex-1 text-sm">{p.name}</span>
                    <input type="number" value={item.quantity} min="1"
                      onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                      className="w-16 px-2 py-1 border rounded text-center text-sm" />
                    <span className="text-sm font-mono w-20 text-right">${calcItemTotal(item).toFixed(2)}</span>
                    <button onClick={() => updateQty(item.productId, 0)} className="text-red-500 text-sm">✕</button>
                  </div>
                )
              })}
            </div>

            {showProductPicker && (
              <div className="max-h-40 overflow-y-auto border rounded-lg mb-3">
                {products.filter((p) => p.name.toLowerCase().includes(searchProduct.toLowerCase())).map((p) => (
                  <button key={p.id} onClick={() => { addItem(p.id); setSearchProduct('') }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-gray-500">${Number(p.price).toFixed(2)} (stock: {p.stock})</span>
                  </button>
                ))}
              </div>
            )}
            <input value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} placeholder="Buscar y agregar productos..."
              className="w-full px-3 py-2 border rounded-lg mb-3" onFocus={() => setShowProductPicker(true)}
              onBlur={() => setTimeout(() => setShowProductPicker(false), 200)} />

            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)"
              className="w-full px-3 py-2 border rounded-lg mb-3" />

            <div className="border-t pt-3 text-right space-y-1">
              <p className="text-sm text-gray-600">Subtotal: <span className="font-mono">${calcSubtotal().toFixed(2)}</span></p>
              <p className="text-sm text-gray-600">IVA: <span className="font-mono">${calcIva().toFixed(2)}</span></p>
              <p className="text-lg font-bold">Total: <span className="font-mono">${(calcSubtotal() + calcIva()).toFixed(2)}</span></p>
            </div>

            <div className="flex gap-2 pt-3">
              <button onClick={createPurchase} disabled={!selectedSupplier || items.length === 0}
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-800">Registrar Compra</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showNewSupplierForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowNewSupplierForm(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Nuevo Proveedor</h3>
            <form onSubmit={createSupplier} className="space-y-3">
              <input value={newSupplierForm.name} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2 border rounded-lg" required />
              <div className="flex gap-2">
                <select value={newSupplierForm.documentType} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, documentType: e.target.value })} className="px-3 py-2 border rounded-lg">
                  <option value="V">V</option><option value="J">J</option><option value="E">E</option>
                </select>
                <input value={newSupplierForm.documentNumber} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, documentNumber: e.target.value })} placeholder="N° documento" className="flex-1 px-3 py-2 border rounded-lg" required />
              </div>
              <input value={newSupplierForm.phone} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })} placeholder="Teléfono" className="w-full px-3 py-2 border rounded-lg" />
              <input value={newSupplierForm.address} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, address: e.target.value })} placeholder="Dirección" className="w-full px-3 py-2 border rounded-lg" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800">Crear y seleccionar</button>
                <button type="button" onClick={() => setShowNewSupplierForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDetail(null)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{showDetail.number}</h3>
                <p className="text-sm text-gray-500">{new Date(showDetail.createdAt).toLocaleString()}</p>
              </div>
              {statusBadge(showDetail.status)}
            </div>
            <p className="text-sm mb-1"><strong>Proveedor:</strong> {showDetail.supplier.name}</p>
            <p className="text-sm mb-1"><strong>Pago:</strong> {showDetail.paymentMethod}</p>
            {showDetail.dueDate && <p className="text-sm mb-3"><strong>Vence:</strong> {new Date(showDetail.dueDate).toLocaleDateString()}</p>}
            {showDetail.notes && <p className="text-sm mb-3 text-gray-600">{showDetail.notes}</p>}
            <table className="w-full text-sm mb-3">
              <thead><tr className="border-b"><th className="text-left py-1">Producto</th><th className="text-right py-1">Cant</th><th className="text-right py-1">Total</th></tr></thead>
              <tbody>
                {showDetail.items.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1">{item.product?.name}</td>
                    <td className="text-right py-1">{item.quantity}</td>
                    <td className="text-right py-1 font-mono">${Number(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right space-y-1 border-t pt-2">
              <p className="text-sm">Subtotal: ${Number(showDetail.subtotal).toFixed(2)}</p>
              <p className="text-sm">IVA: ${Number(showDetail.ivaTotal).toFixed(2)}</p>
              <p className="text-lg font-bold">Total: ${Number(showDetail.total).toFixed(2)}</p>
            </div>
            <div className="flex gap-2 mt-4">
              {showDetail.status === 'pendiente' && (
                <button onClick={() => markAsPaid(showDetail.id)} className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-600">Marcar Pagada</button>
              )}
              {showDetail.status !== 'anulada' && (
                <button onClick={() => cancelPurchase(showDetail.id)} className="flex-1 bg-red-600 text-white py-2 rounded-lg">Anular</button>
              )}
              <button onClick={() => setShowDetail(null)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {purchases.map((p) => (
          <div key={p.id} onClick={() => setShowDetail(p)} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
            <div>
              <p className="font-semibold text-gray-800">{p.number} {statusBadge(p.status)}</p>
              <p className="text-sm text-gray-500">{p.supplier.name} · {new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
            <p className="font-mono font-semibold">${Number(p.total).toFixed(2)}</p>
          </div>
        ))}
        {purchases.length === 0 && <p className="text-gray-400 text-center py-8">No hay compras registradas</p>}
      </div>
    </div>
  )
}

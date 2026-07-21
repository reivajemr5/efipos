import { useState, useEffect, useRef } from 'react'
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
  documentType: string
  documentNumber: string
}

interface Product {
  id: number
  name: string
  code: string
  price: number
  currency: string
  ivaPercent: number
  stock: number
  minStock: number
  barcode?: string | null
  cost?: number | null
  suppliers: { supplier: { id: number; name: string } }[]
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Purchase | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [items, setItems] = useState<{ productId: number; quantity: number }[]>([])
  const [purchaseType, setPurchaseType] = useState('pedido')
  const [paymentMethod, setPaymentMethod] = useState('efectivo_bs')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchSupplier, setSearchSupplier] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showLowStock, setShowLowStock] = useState(false)
  const [supplierPickIdx, setSupplierPickIdx] = useState(0)
  const [productPickIdx, setProductPickIdx] = useState(0)
  const supplierSearchRef = useRef<HTMLInputElement>(null)
  const productSearchRef = useRef<HTMLInputElement>(null)
  const [showReceiveForm, setShowReceiveForm] = useState(false)
  const [receiveItems, setReceiveItems] = useState<{ productId: number; quantity: number }[]>([])
  const [receiveId, setReceiveId] = useState<number | null>(null)
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false)
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [newProductForm, setNewProductForm] = useState({ code: '', name: '', price: '', currency: 'usd', ivaPercent: '16' })
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  function filteredProducts() {
    let list = products
    if (selectedSupplier) {
      list = list.filter((p) => p.suppliers?.some((s) => s.supplier.id === selectedSupplier.id))
    }
    if (showLowStock) {
      list = list.filter((p) => p.stock <= p.minStock)
    }
    return list.sort((a, b) => a.stock / (a.minStock || 1) - b.stock / (b.minStock || 1))
  }

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

  function addReceiveItem(productId: number) {
    setReceiveItems((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) return prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId, quantity: 1 }]
    })
  }

  function updateReceiveQty(productId: number, quantity: number) {
    if (quantity <= 0) { setReceiveItems((prev) => prev.filter((i) => i.productId !== productId)); return }
    setReceiveItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity } : i))
  }

  function openReceiveForm(purchase: Purchase) {
    setReceiveId(purchase.id)
    setReceiveItems(purchase.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
    setShowReceiveForm(true)
    setShowDetail(null)
  }

  async function confirmReceive() {
    if (!receiveId || receiveItems.length === 0) return
    await api.purchases.receive(receiveId, { items: receiveItems })
    setShowReceiveForm(false); setReceiveId(null); setReceiveItems([]); load()
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault()
    try {
      const product = await api.products.create({
        ...newProductForm,
        price: Number(newProductForm.price),
        ivaPercent: Number(newProductForm.ivaPercent),
        stock: 0, minStock: 1,
      })
      setProducts((prev) => [...prev, product])
      setShowNewProductForm(false)
      setNewProductForm({ code: '', name: '', price: '', currency: 'usd', ivaPercent: '16' })
      addItem(product.id)
    } catch { }
  }

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
      type: purchaseType,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    })
    setShowForm(false); setSelectedSupplier(null); setItems([]); setDueDate(''); setNotes(''); setPurchaseType('pedido'); load()
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
    const existingOrder = purchases.find(
      (p) => p.status === 'pedido' && p.supplier.id !== selectedSupplier?.id && p.items.some((i) => i.productId === productId)
    )
    if (existingOrder) {
      setDuplicateWarning(`"${products.find((p) => p.id === productId)?.name}" ya tiene un pedido pendiente con ${existingOrder.supplier.name} (${existingOrder.number})`)
    }
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
      pedido: 'bg-amber-100 text-amber-800',
      recibido: 'bg-blue-100 text-blue-800',
      pagada: 'bg-green-100 text-green-800',
      anulada: 'bg-red-100 text-red-800',
    }
    const labels: Record<string, string> = {
      pedido: 'Pedido',
      recibido: 'Recibida',
      pagada: 'Pagada',
      anulada: 'Anulada',
    }
    return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[s] || ''}`}>{labels[s] || s}</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Compras</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800">+ Nueva</button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'pedido', 'recibido', 'pagada', 'anulada'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === s ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {s === '' ? 'Todas' : s === 'pedido' ? 'Pedidos' : s === 'recibido' ? 'Recibidas' : s === 'pagada' ? 'Pagadas' : 'Anuladas'}
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
                <input ref={supplierSearchRef} value={searchSupplier} onChange={(e) => { setSearchSupplier(e.target.value); setSupplierPickIdx(0) }}
                  placeholder="Buscar proveedor (nombre o RIF)..."
                  className="w-full px-3 py-2 border rounded-lg"
                  onFocus={() => { setShowSupplierPicker(true); setSupplierPickIdx(0) }}
                  onKeyDown={(e) => {
                    const filtered = suppliers.filter((s) =>
                      s.name.toLowerCase().includes(searchSupplier.toLowerCase()) ||
                      s.documentNumber.includes(searchSupplier))
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSupplierPickIdx((i) => Math.min(i + 1, filtered.length)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSupplierPickIdx((i) => Math.max(i - 1, 0)) }
                    if (e.key === 'Enter') {
                      if (filtered[supplierPickIdx]) { setSelectedSupplier(filtered[supplierPickIdx]); setShowSupplierPicker(false); setSearchSupplier('') }
                      else { setShowNewSupplierForm(true); setShowSupplierPicker(false) }
                    }
                    if (e.key === 'Escape') setShowSupplierPicker(false)
                  }} />
                {showSupplierPicker && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto z-10 shadow">
                    {suppliers.filter((s) =>
                      s.name.toLowerCase().includes(searchSupplier.toLowerCase()) ||
                      s.documentNumber.includes(searchSupplier)
                    ).map((s, i) => (
                      <button key={s.id} onClick={() => { setSelectedSupplier(s); setShowSupplierPicker(false); setSearchSupplier('') }}
                        className={`w-full text-left px-3 py-2 text-sm ${i === supplierPickIdx ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                        {s.name} - {s.documentType}{s.documentNumber}
                      </button>
                    ))}
                    <button onClick={() => { setShowNewSupplierForm(true); setShowSupplierPicker(false) }}
                      className={`w-full text-left px-3 py-2 text-sm font-medium border-t ${supplierPickIdx === suppliers.filter((s) => s.name.toLowerCase().includes(searchSupplier.toLowerCase()) || s.documentNumber.includes(searchSupplier)).length ? 'bg-blue-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>+ Nuevo proveedor</button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <button onClick={() => setPurchaseType('pedido')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${purchaseType === 'pedido' ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>Pedido</button>
              <button onClick={() => setPurchaseType('factura')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${purchaseType === 'factura' ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>Factura de Compra</button>
            </div>
            {purchaseType === 'pedido' && <p className="text-xs text-gray-500 mb-2">El pedido no afecta el stock. Al recibirlo se incrementará automáticamente.</p>}

            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-3">
              <option value="efectivo_bs">Efectivo Bs</option>
              <option value="efectivo_usd">Efectivo $</option>
              <option value="credito">Crédito</option>
              <option value="tarjeta_debito">Tarjeta de Débito</option>
              <option value="tarjeta_credito">Tarjeta de Crédito</option>
              <option value="cheque">Cheque</option>
              <option value="pago_movil">Pago Móvil</option>
              <option value="biopago">Biopago</option>
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

            <div className="flex items-center gap-2 mb-2">
              {selectedSupplier && (
                <span className="text-xs text-gray-500">Productos de: <strong>{selectedSupplier.name}</strong></span>
              )}
              <label className="ml-auto flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} className="rounded" />
                Solo bajo stock
              </label>
            </div>
            {duplicateWarning && (
              <div className="bg-amber-50 border border-amber-300 text-amber-800 text-xs px-3 py-2 rounded-lg mb-2 flex justify-between items-center">
                <span>⚠️ {duplicateWarning}</span>
                <button onClick={() => setDuplicateWarning(null)} className="text-amber-600 font-bold ml-2">✕</button>
              </div>
            )}
            {showProductPicker && (
              <div className="max-h-40 overflow-y-auto border rounded-lg mb-3">
                {filteredProducts().filter((p) =>
                  p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                  p.code.toLowerCase().includes(searchProduct.toLowerCase())
                ).map((p, i) => {
                  const lowStock = p.stock <= p.minStock
                  return (
                    <button key={p.id} onClick={() => { addItem(p.id); setSearchProduct(''); setShowProductPicker(false) }}
                      className={`w-full text-left px-3 py-2 text-sm flex justify-between ${i === productPickIdx ? 'bg-blue-100' : lowStock ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-100'}`}>
                      <span>{p.code} - {p.name}</span>
                      <span className="text-gray-500">${Number(p.price).toFixed(2)} {lowStock && <span className="text-amber-700 font-semibold">stock: {p.stock}</span>}</span>
                    </button>
                  )
                })}
                {filteredProducts().length === 0 && <p className="text-xs text-gray-400 text-center py-3">No hay productos disponibles de este proveedor</p>}
                <button onClick={() => { setShowNewProductForm(true); setShowProductPicker(false) }}
                  className={`w-full text-left px-3 py-2 text-sm font-medium border-t ${productPickIdx === filteredProducts().filter((p) => p.name.toLowerCase().includes(searchProduct.toLowerCase()) || p.code.toLowerCase().includes(searchProduct.toLowerCase())).length ? 'bg-blue-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>+ Nuevo producto</button>
              </div>
            )}
            <input ref={productSearchRef} value={searchProduct} onChange={(e) => { setSearchProduct(e.target.value); setProductPickIdx(0) }}
              placeholder="Buscar por nombre o código..."
              className="w-full px-3 py-2 border rounded-lg mb-3"
              onFocus={() => { setShowProductPicker(true); setProductPickIdx(0) }}
              onKeyDown={(e) => {
                const filtered = filteredProducts().filter((p) =>
                  p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                  p.code.toLowerCase().includes(searchProduct.toLowerCase()))
                if (e.key === 'ArrowDown') { e.preventDefault(); setProductPickIdx((i) => Math.min(i + 1, filtered.length)) }
                if (e.key === 'ArrowUp') { e.preventDefault(); setProductPickIdx((i) => Math.max(i - 1, 0)) }
                if (e.key === 'Enter') {
                  if (filtered[productPickIdx]) { addItem(filtered[productPickIdx].id); setSearchProduct(''); setShowProductPicker(false) }
                  else { setShowNewProductForm(true); setShowProductPicker(false) }
                }
                if (e.key === 'Escape') setShowProductPicker(false)
              }} />

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

      {showReceiveForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReceiveForm(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Recibir Pedido</h3>
            <p className="text-sm text-gray-500 mb-3">Ajusta las cantidades que realmente llegaron. Los items con cantidad 0 se eliminarán.</p>

            <div className="space-y-2 mb-3">
              {receiveItems.map((item) => {
                const p = products.find((x) => x.id === item.productId)
                if (!p) return null
                return (
                  <div key={item.productId} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <span className="flex-1 text-sm">{p.name}</span>
                    <input type="number" value={item.quantity} min="0"
                      onChange={(e) => updateReceiveQty(item.productId, Number(e.target.value))}
                      className="w-16 px-2 py-1 border rounded text-center text-sm" />
                    <button onClick={() => updateReceiveQty(item.productId, 0)} className="text-red-500 text-sm">✕</button>
                  </div>
                )
              })}
            </div>

            <label className="flex items-center gap-1 text-xs text-gray-500 mb-2 cursor-pointer">
              <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} className="rounded" />
              Solo bajo stock
            </label>
            <input value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} placeholder="Agregar productos adicionales..."
              className="w-full px-3 py-2 border rounded-lg mb-3" onFocus={() => setShowProductPicker(true)}
              onBlur={() => setTimeout(() => setShowProductPicker(false), 200)} />
            {showProductPicker && (
              <div className="max-h-32 overflow-y-auto border rounded-lg mb-3">
                {filteredProducts().filter((p) => p.name.toLowerCase().includes(searchProduct.toLowerCase())).map((p) => {
                  const lowStock = p.stock <= p.minStock
                  return (
                    <button key={p.id} onClick={() => { addReceiveItem(p.id); setSearchProduct('') }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex justify-between ${lowStock ? 'bg-amber-50' : ''}`}>
                      <span>{p.name}</span>
                      <span className="text-gray-500">${Number(p.price).toFixed(2)} {lowStock && <span className="text-amber-700">stock: {p.stock}</span>}</span>
                    </button>
                  )
                })}
                <button onClick={() => { setShowNewProductForm(true); setShowProductPicker(false) }}
                  className="w-full text-left px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium border-t">+ Nuevo producto</button>
              </div>
            )}

            <div className="flex gap-2 pt-3">
              <button onClick={confirmReceive} disabled={receiveItems.length === 0}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-green-600">Confirmar Recepción</button>
              <button onClick={() => setShowReceiveForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showNewProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowNewProductForm(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Nuevo Producto</h3>
            <form onSubmit={createProduct} className="space-y-3">
              <input value={newProductForm.code} onChange={(e) => setNewProductForm({ ...newProductForm, code: e.target.value })} placeholder="Código" className="w-full px-3 py-2 border rounded-lg" required />
              <input value={newProductForm.name} onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2 border rounded-lg" required />
              <input value={newProductForm.price} onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })} type="number" step="0.01" placeholder="Precio" className="w-full px-3 py-2 border rounded-lg" required />
              <div className="flex gap-2">
                <select value={newProductForm.currency} onChange={(e) => setNewProductForm({ ...newProductForm, currency: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg">
                  <option value="usd">$ USD</option><option value="bs">Bs</option>
                </select>
                <select value={newProductForm.ivaPercent} onChange={(e) => setNewProductForm({ ...newProductForm, ivaPercent: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg">
                  <option value="0">0%</option><option value="8">8%</option><option value="16">16%</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800">Crear y agregar</button>
                <button type="button" onClick={() => setShowNewProductForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Cancelar</button>
              </div>
            </form>
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
              {showDetail.status === 'pedido' && (
                <button onClick={() => openReceiveForm(showDetail)} className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-600">Recibir Pedido</button>
              )}
              {showDetail.status === 'recibido' && (
                <button onClick={() => markAsPaid(showDetail.id)} className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800">Marcar Pagada</button>
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

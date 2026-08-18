import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import ProductFormModal from '../components/ProductFormModal'
import SearchPicker from '../components/SearchPicker'
import TablePickerModal from '../components/TablePickerModal'
import PaginationBar from '../components/PaginationBar'
import LoadPurchaseOrderModal from '../components/LoadPurchaseOrderModal'
import { useSaleModes } from '../hooks/useSaleModes'
import { effectiveFlag, QTY_STEP } from '../utils/config'

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
  cost?: number | null
  currency: string
  ivaPercent: number
  stock: number
  minStock: number
  barcode?: string | null
  suppliers: { supplier: { id: number; name: string } }[]
  decimalQuantity?: boolean
}

interface LineItem {
  productId: number
  quantity: number
  unitPrice: number
  cur: 'usd' | 'bs'
}

export default function Purchases() {
  const saleModes = useSaleModes()
  const PAGE_SIZE = 25
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [purchasesTotal, setPurchasesTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Purchase | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [purchaseType, setPurchaseType] = useState('pedido')
  const [paymentMethod, setPaymentMethod] = useState('efectivo_bs')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmStep, setConfirmStep] = useState(false)
  const [rate] = useState(0)
  const [sourceOrderId, setSourceOrderId] = useState<number | null>(null)
  const [showLoadOrder, setShowLoadOrder] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showSupplierTable, setShowSupplierTable] = useState(false)
  const [showProductTable, setShowProductTable] = useState(false)
  const [productFilterOn, setProductFilterOn] = useState(true)
  const [showReceiveForm, setShowReceiveForm] = useState(false)
  const [receiveItems, setReceiveItems] = useState<{ productId: number; quantity: number }[]>([])
  const [receiveId, setReceiveId] = useState<number | null>(null)
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false)
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const idemRef = useRef<string | null>(null)

  function uuid() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()
  }

  function filteredProducts() {
    let list = products
    if (selectedSupplier) {
      list = list.filter((p) => p.suppliers?.some((s) => s.supplier.id === selectedSupplier.id))
    }
    if (showLowStock) {
      list = list.filter((p) => p.stock <= p.minStock)
    }
    return list.sort((a, b) => a.stock - b.stock)
  }

  function productTableItems() {
    let list = products
    if (selectedSupplier && productFilterOn) {
      list = list.filter((p) => p.suppliers?.some((s) => s.supplier.id === selectedSupplier.id))
    } else if (selectedSupplier && !productFilterOn) {
      list = list.filter((p) => !p.suppliers?.some((s) => s.supplier.id === selectedSupplier.id))
    }
    return list
  }

  function sortByStock(items: any[]) {
    return [...items].sort((a, b) => Number(a.stock) - Number(b.stock))
  }

  async function load() {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    const [pur, sup, prods] = await Promise.all([
      api.purchases.list(params.toString()), api.suppliers.list(), api.products.list(),
    ])
    setPurchases(Array.isArray(pur) ? pur : pur.items)
    setPurchasesTotal(Array.isArray(pur) ? pur.length : pur.total)
    setSuppliers(sup)
    setProducts(prods)
  }

  useEffect(() => { load() }, [filterStatus, page])

  function selectStatus(s: string) {
    setPage(0)
    setFilterStatus(s)
  }

  function allowDecimalQty(p: Product | undefined): boolean {
    return p ? effectiveFlag(saleModes.decimalQuantityMode, p.decimalQuantity) : false
  }

  function addReceiveItem(productId: number) {
    const inc = allowDecimalQty(products.find((x) => x.id === productId)) ? 0.5 : 1
    setReceiveItems((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) return prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + inc } : i)
      return [...prev, { productId, quantity: inc }]
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

  function onProductCreated(product: any) {
    setProducts((prev) => [...prev, product])
    setShowNewProductForm(false)
    addItem(product.id)
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
    if (!selectedSupplier || items.length === 0 || submitting) return
    setSubmitting(true)
    if (!idemRef.current) idemRef.current = uuid()
    try {
      await api.purchases.create({
        supplierId: selectedSupplier.id,
        paymentMethod,
        dueDate: dueDate || null,
        notes: notes || null,
        type: purchaseType,
        currency: 'usd',
        exchangeRate: rate || undefined,
        sourceOrderId: sourceOrderId || undefined,
        requestKey: idemRef.current,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: lineUsdPrice(i) })),
      })
      setShowForm(false); setSelectedSupplier(null); setItems([]); setDueDate(''); setNotes(''); setPurchaseType('pedido'); setConfirmStep(false); setSourceOrderId(null); load(); setSubmitting(false)
    } catch (e: any) {
      alert('No se pudo registrar: ' + (e?.message || 'error'))
      setSubmitting(false)
    }
  }

  function onLoadOrder(order: any) {
    setItems(order.items.map((i: any) => {
      const p = products.find((x) => x.id === i.productId)
      const unitPrice = i.unitPrice > 0 ? Number(i.unitPrice) : (p ? defaultPrice(p) : 0)
      return { productId: i.productId, quantity: i.quantity, unitPrice, cur: 'usd' }
    }))
    setSourceOrderId(order.id)
    setShowLoadOrder(false)
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
    addLine(productId, allowDecimalQty(products.find((p) => p.id === productId)) ? 0.5 : 1)
  }

  function defaultPrice(p: Product): number {
    const c = Number(p.cost)
    return c > 0 ? c : Number(p.price)
  }

  function addLine(productId: number, quantity: number, unitPrice?: number) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) return prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i)
      const p = products.find((x) => x.id === productId)
      return [...prev, { productId, quantity, unitPrice: unitPrice ?? (p ? defaultPrice(p) : 0), cur: 'usd' }]
    })
  }

  function updateQty(productId: number, quantity: number) {
    if (quantity <= 0) { setItems((prev) => prev.filter((i) => i.productId !== productId)); return }
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity } : i))
  }

  function updateLinePrice(productId: number, rawValue: number) {
    setItems((prev) => prev.map((i) => {
      if (i.productId !== productId) return i
      const unitPrice = i.cur === 'bs' && rate > 0 ? rawValue / rate : rawValue
      return { ...i, unitPrice }
    }))
  }

  function toggleCur(productId: number) {
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, cur: i.cur === 'usd' ? 'bs' : 'usd' } : i))
  }

  function lineDisplayPrice(item: LineItem): number {
    return item.cur === 'bs' ? item.unitPrice * rate : item.unitPrice
  }

  function lineUsdPrice(item: LineItem): number {
    return item.cur === 'bs' ? item.unitPrice * rate : item.unitPrice
  }

  function calcItemTotal(item: LineItem) {
    const p = products.find((x) => x.id === item.productId)
    if (!p) return 0
    return lineUsdPrice(item) * item.quantity * (1 + Number(p.ivaPercent) / 100)
  }

  function calcSubtotal() {
    return items.reduce((sum, item) => {
      const p = products.find((x) => x.id === item.productId)
      if (!p) return sum
      return sum + lineUsdPrice(item) * item.quantity
    }, 0)
  }

  function calcIva() {
    return items.reduce((sum, item) => {
      const p = products.find((x) => x.id === item.productId)
      if (!p) return sum
      return sum + lineUsdPrice(item) * item.quantity * Number(p.ivaPercent) / 100
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
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
        <button onClick={() => navigate('/purchases/new')} className="btn-primary">+ Nueva</button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'pedido', 'recibido', 'pagada', 'anulada'].map((s) => (
          <button key={s} onClick={() => selectStatus(s)}
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === s ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {s === '' ? 'Todas' : s === 'pedido' ? 'Pedidos' : s === 'recibido' ? 'Recibidas' : s === 'pagada' ? 'Pagadas' : 'Anuladas'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card p-6 w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nueva Compra</h3>
              <div className="text-xs text-gray-400 font-medium">{confirmStep ? 'Paso 2 de 2 · Confirmar' : 'Paso 1 de 2 · Productos'}</div>
            </div>

            {!confirmStep ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Proveedor</label>
                      {selectedSupplier ? (
                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                          <span className="text-sm">{selectedSupplier.name}</span>
                          <button onClick={() => setSelectedSupplier(null)} className="text-red-500 text-sm">Cambiar</button>
                        </div>
                      ) : (
                        <SearchPicker
                          items={suppliers}
                          onSelect={setSelectedSupplier}
                          filter={(s, q) => s.name.toLowerCase().includes(q.toLowerCase()) || s.documentNumber.includes(q)}
                          renderItem={(s) => <span>{s.name} - {s.documentType}{s.documentNumber}</span>}
                          keyExtractor={(s) => s.id}
                          placeholder="Buscar proveedor (nombre o RIF)..."
                          onCreateNew={() => setShowNewSupplierForm(true)}
                          createNewLabel="+ Crear proveedor"
                          onAdvancedSearch={() => setShowSupplierTable(true)}
                          showOnFocus
                          absolute
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo</label>
                      <div className="flex gap-2">
                        <button onClick={() => setPurchaseType('pedido')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${purchaseType === 'pedido' ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>Pedido</button>
                        <button onClick={() => setPurchaseType('factura')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${purchaseType === 'factura' ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>Factura de Compra</button>
                      </div>
                    </div>
                    {purchaseType === 'pedido' && <p className="text-xs text-gray-500">El pedido no afecta el stock. Al recibirlo se incrementará automáticamente.</p>}
                    {purchaseType === 'factura' && (
                      <button onClick={() => selectedSupplier ? setShowLoadOrder(true) : null}
                        disabled={!selectedSupplier}
                        className="w-full py-2 rounded-lg bg-sky-100 text-sky-800 hover:bg-sky-200 text-sm font-medium disabled:opacity-50">
                        📦 Cargar pedido del proveedor
                      </button>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Notas</label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" rows={2}
                        className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Productos agregados</label>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500">
                          <th className="text-left py-1.5 font-medium">Producto</th>
                          <th className="text-center py-1.5 font-medium w-14">Precio</th>
                          <th className="text-center py-1.5 font-medium w-16">Mon</th>
                          <th className="text-center py-1.5 font-medium w-16">Cant</th>
                          <th className="text-right py-1.5 font-medium">Subtotal</th>
                          <th className="w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const p = products.find((x) => x.id === item.productId)
                          if (!p) return null
                          const lowStock = Number(p.stock) <= Number(p.minStock)
                          return (
                            <tr key={item.productId} className="border-b border-gray-100">
                              <td className="py-1.5 pr-2">
                                <span className="block font-medium text-gray-800">{p.name}</span>
                                <span className="block text-xs text-gray-400">
                                  Costo ${Number(p.cost || 0).toFixed(2)} · Venta ${Number(p.price).toFixed(2)}
                                  <span className={lowStock ? 'text-amber-700' : ''}> · stock {p.stock}</span>
                                </span>
                              </td>
                              <td className="py-1.5">
                                <input type="number" min="0" step="0.01" value={item.cur === 'bs' ? Number(lineDisplayPrice(item)).toFixed(2) : item.unitPrice || ''}
                                  onChange={(e) => updateLinePrice(item.productId, Number(e.target.value))}
                                  className="w-full px-1.5 py-1 border rounded text-right text-sm" />
                              </td>
                              <td className="py-1.5 text-center">
                                <button onClick={() => toggleCur(item.productId)}
                                  className={`px-1.5 py-0.5 rounded text-xs font-semibold ${item.cur === 'usd' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {item.cur === 'usd' ? '$' : 'Bs'}
                                </button>
                              </td>
                              <td className="py-1.5 text-center">
                                <input type="number" min={allowDecimalQty(products.find((x) => x.id === item.productId)) ? QTY_STEP : 1} step={allowDecimalQty(products.find((x) => x.id === item.productId)) ? 0.5 : 1} value={item.quantity}
                                  onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                                  className="w-14 px-1.5 py-1 border rounded text-center text-sm" />
                              </td>
                              <td className="py-1.5 text-right font-mono">${calcItemTotal(item).toFixed(2)}</td>
                              <td className="py-1.5 text-center">
                                <button onClick={() => updateQty(item.productId, 0)} className="text-red-500 text-sm">✕</button>
                              </td>
                            </tr>
                          )
                        })}
                        {items.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-6 text-gray-400">Agrega productos con el buscador</td></tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {selectedSupplier && (
                    <button onClick={() => { setProductFilterOn(true); setShowProductTable(true) }} className="ml-1 text-sm font-medium text-gray-500 hover:text-blue-800">
                      🔍 {selectedSupplier.name}
                    </button>
                  )}
                  <label className="mx-2 flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
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
                <SearchPicker
                  items={filteredProducts()}
                  onSelect={(p) => addItem(p.id)}
                  filter={(p, q) => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())}
                  renderItem={(p) => {
                    const lowStock = p.stock <= p.minStock
                    return (
                      <span className="flex justify-between w-full text-xs">
                        <span>{p.code} - {p.name}</span>
                        <span className={lowStock ? 'text-amber-700' : 'text-gray-500'}>
                          costo ${Number(p.cost || 0).toFixed(2)} · venta ${Number(p.price).toFixed(2)} {lowStock && `· stock ${p.stock}`}
                        </span>
                      </span>
                    )
                  }}
                  keyExtractor={(p) => p.id}
                  placeholder="Buscar producto por nombre o código..."
                  onCreateNew={() => setShowNewProductForm(true)}
                  createNewLabel="+ Nuevo producto"
                  onAdvancedSearch={() => { setProductFilterOn(true); setShowProductTable(true) }}
                />

                <div className="border-t pt-3 mt-3 text-right space-y-1">
                  <p className="text-sm text-gray-600">Subtotal: <span className="font-mono">${calcSubtotal().toFixed(2)}</span></p>
                  <p className="text-sm text-gray-600">IVA: <span className="font-mono">${calcIva().toFixed(2)}</span></p>
                  <p className="text-lg font-bold">Total: <span className="font-mono">${(calcSubtotal() + calcIva()).toFixed(2)}</span></p>
                </div>

                <div className="flex gap-2 pt-3">
                  <button onClick={() => setConfirmStep(true)} disabled={!selectedSupplier || items.length === 0}
                    className="flex-1 bg-blue-900 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-800">Continuar ➜</button>
                  <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 mb-1"><strong>Proveedor:</strong> {selectedSupplier?.name}</p>
                  <p className="text-sm text-gray-700"><strong>Tipo:</strong> {purchaseType === 'factura' ? 'Factura de Compra' : 'Pedido'}</p>
                  <p className="text-sm text-gray-700"><strong>Items:</strong> {items.reduce((c, i) => c + i.quantity, 0)} unidades</p>
                  {sourceOrderId && <p className="text-xs text-sky-700 mt-1">Se cargó desde un pedido; al registrar, este pedido se marca como despachado.</p>}
                  <p className="text-lg font-bold mt-1">Total: <span className="font-mono">${(calcSubtotal() + calcIva()).toFixed(2)}</span></p>
                </div>

                {purchaseType === 'factura' ? (
                  <>
                    <label className="block text-sm font-medium mb-1">Forma de pago</label>
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
                    <label className="block text-sm font-medium mb-1">Fecha de vencimiento</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg mb-3" />
                  </>
                ) : (
                  <p className="text-xs text-gray-500 mb-3">Los pedidos no requieren forma de pago ni fecha.</p>
                )}

                <div className="flex gap-2 pt-3">
                  <button onClick={() => setConfirmStep(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">← Volver</button>
                  <button onClick={createPurchase} disabled={!selectedSupplier || items.length === 0 || submitting}
                    className="flex-1 bg-blue-900 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-800">
                    {submitting ? 'Registrando...' : `Registrar ${purchaseType === 'factura' ? 'Compra' : 'Pedido'}`}
                  </button>
                </div>
              </>
            )}
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
                    <input type="number" value={item.quantity} min="0" step={allowDecimalQty(p) ? 0.5 : 1}
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
            <SearchPicker
              items={filteredProducts()}
              onSelect={(p) => addReceiveItem(p.id)}
              filter={(p, q) => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())}
              renderItem={(p) => {
                const lowStock = p.stock <= p.minStock
                return (
                  <span className="flex justify-between w-full">
                    <span>{p.code} - {p.name}</span>
                    <span className="text-gray-500">{lowStock && <span className="text-amber-700">stock: {p.stock}</span>}</span>
                  </span>
                )
              }}
              keyExtractor={(p) => p.id}
              placeholder="Agregar productos adicionales..."
              onCreateNew={() => setShowNewProductForm(true)}
              createNewLabel="+ Nuevo producto"
              onAdvancedSearch={() => { setProductFilterOn(true); setShowProductTable(true) }}
              className="mb-3"
            />

            <div className="flex gap-2 pt-3">
              <button onClick={confirmReceive} disabled={receiveItems.length === 0}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-green-600">Confirmar Recepción</button>
              <button onClick={() => setShowReceiveForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <ProductFormModal open={showNewProductForm} onClose={() => setShowNewProductForm(false)}
        onSaved={onProductCreated} />

      <TablePickerModal
        open={showSupplierTable} onClose={() => setShowSupplierTable(false)}
        title="Proveedores"
        items={suppliers}
        columns={[
          { key: 'name', label: 'Nombre', render: (s: any) => s.name },
          { key: 'doc', label: 'Documento', render: (s: any) => `${s.documentType}-${s.documentNumber}` },
          { key: 'phone', label: 'Teléfono', render: (s: any) => s.phone || '-' },
        ]}
        filterFn={(s: any, q: string) => s.name.toLowerCase().includes(q.toLowerCase()) || s.documentNumber.includes(q)}
        onSelect={(s: any) => { setSelectedSupplier(s); setShowSupplierTable(false) }}
        searchPlaceholder="Buscar proveedor..."
      />

      <TablePickerModal
        open={showProductTable} onClose={() => setShowProductTable(false)}
        title={selectedSupplier && productFilterOn ? `Productos de ${selectedSupplier.name}` : 'Productos'}
        items={productTableItems()}
        sortFn={sortByStock}
        columns={[
          { key: 'code', label: 'Código', render: (p: any) => p.code },
          { key: 'name', label: 'Nombre', render: (p: any) => p.name },
          { key: 'cost', label: 'Costo', render: (p: any) => <span className="text-emerald-700">${Number(p.cost || 0).toFixed(2)}</span> },
          { key: 'price', label: 'Venta', render: (p: any) => `${p.currency === 'usd' ? '$' : 'Bs.'}${Number(p.price).toFixed(2)}` },
          { key: 'stock', label: 'Stock', render: (p: any) => p.stock <= 0 ? <span className="text-red-500">{p.stock}</span> : p.stock },
        ]}
        filters={[
          { key: 'currency', label: 'Moneda', options: [{ value: 'usd', label: '$ USD' }, { value: 'bs', label: 'Bs' }], filter: (p: any, v: string) => p.currency === v },
          { key: 'stock', label: 'Stock', options: [{ value: 'yes', label: 'Con stock' }, { value: 'no', label: 'Sin stock' }], filter: (p: any, v: string) => v === 'yes' ? p.stock > 0 : p.stock <= 0 },
        ]}
        headerExtra={selectedSupplier ? (
          <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
            <input type="checkbox" checked={productFilterOn} onChange={(e) => setProductFilterOn(e.target.checked)} className="rounded" />
            {productFilterOn ? `Solo ${selectedSupplier.name}` : 'Otros proveedores'}
          </label>
        ) : undefined}
        filterFn={(p: any, q: string) => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())}
        multiSelect
        onMultiSelect={(sel: any[]) => { sel.forEach((p: any) => addItem(p.id)) }}
        onSelect={(p: any) => { addItem(p.id); setShowProductTable(false) }}
        searchPlaceholder="Buscar producto..."
      />

      <LoadPurchaseOrderModal open={showLoadOrder} onClose={() => setShowLoadOrder(false)}
        supplierId={selectedSupplier?.id} onLoad={onLoadOrder} />

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
            <div className="overflow-x-auto">
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
            </div>
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
          <div key={p.id} onClick={() => setShowDetail(p)} className="card p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
            <div>
              <p className="font-semibold text-gray-800">{p.number} {statusBadge(p.status)}</p>
              <p className="text-sm text-gray-500">{p.supplier.name} · {new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
            <p className="font-mono font-semibold">${Number(p.total).toFixed(2)}</p>
          </div>
        ))}
        {purchases.length === 0 && <p className="text-gray-400 text-center py-8">No hay compras registradas</p>}
      </div>
      <PaginationBar page={page} onPage={setPage} total={purchasesTotal} pageSize={PAGE_SIZE} />
    </div>
  )
}

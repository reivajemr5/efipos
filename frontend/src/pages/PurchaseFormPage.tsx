import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import ProductFormModal from '../components/ProductFormModal'
import SearchPicker from '../components/SearchPicker'
import TablePickerModal from '../components/TablePickerModal'
import LoadPurchaseOrderModal from '../components/LoadPurchaseOrderModal'

interface Supplier { id: number; name: string; documentType: string; documentNumber: string }
interface Product {
  id: number; name: string; code: string; price: number; cost?: number | null
  currency: string; ivaPercent: number; stock: number; minStock: number
  suppliers: { supplier: { id: number; name: string } }[]
}
interface LineItem { productId: number; quantity: number; unitPrice: number; cur: 'usd' | 'bs' }

function uuid() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()
}

export default function PurchaseFormPage() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [purchaseType, setPurchaseType] = useState('pedido')
  const [paymentMethod, setPaymentMethod] = useState('efectivo_bs')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmStep, setConfirmStep] = useState(false)
  const [rate, setRate] = useState(0)
  const [sourceOrderId, setSourceOrderId] = useState<number | null>(null)
  const [showLoadOrder, setShowLoadOrder] = useState(false)
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false)
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [showSupplierTable, setShowSupplierTable] = useState(false)
  const [showProductTable, setShowProductTable] = useState(false)
  const [productFilterOn, setProductFilterOn] = useState(true)
  const [showLowStock, setShowLowStock] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const idemRef = useRef<string | null>(null)

  async function load() {
    const [sup, prods, r] = await Promise.all([
      api.suppliers.list(), api.products.list(), api.exchangeRate.get().catch(() => null),
    ])
    setSuppliers(Array.isArray(sup) ? sup : [])
    setProducts(Array.isArray(prods) ? prods : [])
    setRate(Number(r?.rate) || 0)
  }
  useEffect(() => { load() }, [])

  function defaultPrice(p: Product) { const c = Number(p.cost); return c > 0 ? c : Number(p.price) }

  function filteredProducts() {
    let list = products
    if (selectedSupplier) list = list.filter((p) => p.suppliers?.some((s) => s.supplier.id === selectedSupplier.id))
    if (showLowStock) list = list.filter((p) => p.stock <= p.minStock)
    return [...list].sort((a, b) => a.stock - b.stock)
  }
  function productTableItems() {
    let list = products
    if (selectedSupplier && productFilterOn) list = list.filter((p) => p.suppliers?.some((s) => s.supplier.id === selectedSupplier.id))
    else if (selectedSupplier && !productFilterOn) list = list.filter((p) => !p.suppliers?.some((s) => s.supplier.id === selectedSupplier.id))
    return list
  }
  function sortByStock(list: any[]) { return [...list].sort((a, b) => Number(a.stock) - Number(b.stock)) }

  function addLine(productId: number, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) return prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i)
      const p = products.find((x) => x.id === productId)
      return [...prev, { productId, quantity, unitPrice: p ? defaultPrice(p) : 0, cur: 'usd' }]
    })
  }
  function updateQty(productId: number, q: number) {
    if (q <= 0) { setItems((prev) => prev.filter((i) => i.productId !== productId)); return }
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: q } : i))
  }
  function updateLinePrice(productId: number, raw: number) {
    setItems((prev) => prev.map((i) => i.productId !== productId ? i : { ...i, unitPrice: i.cur === 'bs' && rate > 0 ? raw / rate : raw }))
  }
  function toggleCur(productId: number) {
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, cur: i.cur === 'usd' ? 'bs' : 'usd' } : i))
  }
  function lineUsd(item: LineItem) { return item.cur === 'bs' ? item.unitPrice * rate : item.unitPrice }
  function lineDisplay(item: LineItem) { return item.cur === 'bs' ? item.unitPrice * rate : item.unitPrice }
  function calcItemTotal(item: LineItem) { const p = products.find((x) => x.id === item.productId); return p ? lineUsd(item) * item.quantity * (1 + Number(p.ivaPercent) / 100) : 0 }
  function calcSubtotal() { return items.reduce((s, it) => { const p = products.find((x) => x.id === it.productId); return p ? s + lineUsd(it) * it.quantity : s }, 0) }
  function calcIva() { return items.reduce((s, it) => { const p = products.find((x) => x.id === it.productId); return p ? s + lineUsd(it) * it.quantity * Number(p.ivaPercent) / 100 : s }, 0) }

  function onLoadOrder(order: any) {
    setItems((order.items || []).map((i: any) => {
      const p = products.find((x) => x.id === i.productId)
      const unitPrice = i.unitPrice > 0 ? Number(i.unitPrice) : (p ? defaultPrice(p) : 0)
      return { productId: i.productId, quantity: i.quantity, unitPrice, cur: 'usd' }
    }))
    setSourceOrderId(order.id)
    setShowLoadOrder(false)
  }

  async function createSupplier(e: React.FormEvent) {
    e.preventDefault()
    try {
      const s = await api.suppliers.create(newSupplierForm)
      setSuppliers((prev) => [...prev, s])
      setSelectedSupplier(s)
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
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: lineUsd(i) })),
      })
      navigate('/purchases')
    } catch (e: any) {
      alert('No se pudo registrar: ' + (e?.message || 'error'))
      setSubmitting(false)
    }
  }

  const money = (n: number) => `$${n.toFixed(2)}`
  return (
    <div className="page-container" onClick={() => setDuplicateWarning(null)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nueva Compra</h1>
          <p className="text-sm text-gray-500">{confirmStep ? 'Paso 2 de 2 · Confirmar' : 'Paso 1 de 2 · Productos'}</p>
        </div>
        <button onClick={() => navigate('/purchases')} className="btn-primary bg-gray-600 hover:bg-gray-700">← Volver</button>
      </div>

      {confirmStep ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-1"><strong>Proveedor:</strong> {selectedSupplier?.name}</p>
            <p className="text-sm text-gray-700 mb-1"><strong>Tipo:</strong> {purchaseType === 'factura' ? 'Factura de Compra' : 'Pedido'}</p>
            <p className="text-sm text-gray-700 mb-1"><strong>Items:</strong> {items.reduce((c, i) => c + i.quantity, 0)} unidades</p>
            {sourceOrderId && <p className="text-xs text-sky-700 mb-1">Se cargó desde un pedido; al registrar, este pedido se marca como despachado.</p>}
            <p className="text-lg font-bold">Total: <span className="font-mono">{money(calcSubtotal() + calcIva())}</span></p>
          </div>

          {purchaseType === 'factura' ? (
            <>
              <label className="block text-sm font-medium mb-1">Forma de pago</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-3">
                <option value="efectivo_bs">Efectivo Bs</option><option value="efectivo_usd">Efectivo $</option>
                <option value="credito">Crédito</option><option value="tarjeta_debito">Tarjeta de Débito</option>
                <option value="tarjeta_credito">Tarjeta de Crédito</option><option value="cheque">Cheque</option>
                <option value="pago_movil">Pago Móvil</option><option value="biopago">Biopago</option>
              </select>
              <label className="block text-sm font-medium mb-1">Fecha de vencimiento</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-3" />
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Proveedor *</label>
              {selectedSupplier ? (
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                  <span className="text-sm font-medium">{selectedSupplier.name}</span>
                  <button onClick={() => setSelectedSupplier(null)} className="text-red-500 text-sm">Cambiar</button>
                </div>
              ) : (
                <SearchPicker
                  items={suppliers} onSelect={setSelectedSupplier}
                  filter={(s, q) => s.name.toLowerCase().includes(q.toLowerCase()) || s.documentNumber.includes(q)}
                  renderItem={(s) => <span>{s.name} - {s.documentType}{s.documentNumber}</span>}
                  keyExtractor={(s) => s.id} placeholder="Buscar o crear proveedor (nombre o RIF)..."
                  onCreateNew={() => setShowNewSupplierForm(true)} createNewLabel="+ Crear proveedor"
                  onAdvancedSearch={() => setShowSupplierTable(true)}
                  showOnFocus
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
            {purchaseType === 'factura' && (
              <button onClick={() => selectedSupplier ? setShowLoadOrder(true) : null} disabled={!selectedSupplier}
                className="w-full py-2 rounded-lg bg-sky-100 text-sky-800 hover:bg-sky-200 text-sm font-medium disabled:opacity-50">
                📦 Cargar pedido del proveedor
              </button>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>

            <div className="text-sm font-medium mb-1">Productos</div>
            {!selectedSupplier && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Selecciona un proveedor para poder agregar productos.
              </p>
            )}
            {duplicateWarning && (
              <div className="bg-amber-50 border border-amber-300 text-amber-800 text-xs px-3 py-2 rounded-lg mb-2 flex justify-between items-center">
                <span>⚠️ {duplicateWarning}</span>
                <button onClick={() => setDuplicateWarning(null)} className="text-amber-600 font-bold ml-2">✕</button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {selectedSupplier && (
                <button onClick={() => { setProductFilterOn(true); setShowProductTable(true) }} className="text-sm font-medium text-gray-500 hover:text-blue-800">
                  🔍 {selectedSupplier.name}
                </button>
              )}
              <label className="mx-2 flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} className="rounded" />
                Solo bajo stock
              </label>
            </div>
            <div className={selectedSupplier ? '' : 'pointer-events-none opacity-40'}>
              <SearchPicker
                items={filteredProducts()}
                onSelect={(p) => { if (selectedSupplier) addLine(p.id) }}
                filter={(p, q) => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())}
                renderItem={(p) => {
                  const lowStock = p.stock <= p.minStock
                  return (
                    <span className="flex justify-between w-full text-xs">
                      <span>{p.code} - {p.name}</span>
                      <span className={lowStock ? 'text-amber-700' : 'text-gray-500'}>
                        costo {money(Number(p.cost || 0))} · venta {money(Number(p.price))} {lowStock && `· stock ${p.stock}`}
                      </span>
                    </span>
                  )
                }}
                keyExtractor={(p) => p.id} placeholder="Buscar producto por nombre o código..."
                onCreateNew={() => setShowNewProductForm(true)} createNewLabel="+ Nuevo producto"
                onAdvancedSearch={() => { setProductFilterOn(true); setShowProductTable(true) }}
              />
            </div>
          </div>

          <div className="md:col-span-3 bg-white rounded-2xl p-4 shadow-sm h-fit">
            <div className="text-sm font-medium mb-2">Productos agregados</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-1.5 font-medium">Producto</th>
                  <th className="text-center py-1.5 font-medium w-24">Precio</th>
                  <th className="text-center py-1.5 font-medium w-16">Mon</th>
                  <th className="text-center py-1.5 font-medium w-20">Cant</th>
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
                          costo {money(Number(p.cost || 0))} · venta {money(Number(p.price))} {lowStock && <span className="text-amber-700">· stock {p.stock}</span>}
                        </span>
                      </td>
                      <td className="py-1.5">
                        <input type="number" min="0" step="0.01" value={item.cur === 'bs' ? Number(lineDisplay(item)).toFixed(2) : item.unitPrice || ''}
                          onChange={(e) => updateLinePrice(item.productId, Number(e.target.value))} className="w-full px-1.5 py-1 border rounded text-right text-sm" />
                      </td>
                      <td className="py-1.5 text-center">
                        <button onClick={() => toggleCur(item.productId)}
                          className={`px-1.5 py-0.5 rounded text-xs font-semibold ${item.cur === 'usd' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.cur === 'usd' ? '$' : 'Bs'}
                        </button>
                      </td>
                      <td className="py-1.5 text-center">
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                          className="w-14 px-1.5 py-1 border rounded text-center text-sm" />
                      </td>
                      <td className="py-1.5 text-right font-mono">{money(calcItemTotal(item))}</td>
                      <td className="py-1.5 text-center">
                        <button onClick={() => updateQty(item.productId, 0)} className="text-red-500 text-sm">✕</button>
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-gray-400">Agrega productos con el buscador (requiere proveedor)</td></tr>
                )}
              </tbody>
            </table>

            <div className="border-t pt-3 mt-3 text-right space-y-1">
              <p className="text-sm text-gray-600">Subtotal: <span className="font-mono">{money(calcSubtotal())}</span></p>
              <p className="text-sm text-gray-600">IVA: <span className="font-mono">{money(calcIva())}</span></p>
              <p className="text-lg font-bold">Total: <span className="font-mono">{money(calcSubtotal() + calcIva())}</span></p>
            </div>

            <div className="flex gap-2 pt-3">
              <button onClick={() => setConfirmStep(true)} disabled={!selectedSupplier || items.length === 0}
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-800">Continuar ➜</button>
            </div>
          </div>
        </div>
      )}

      <ProductFormModal open={showNewProductForm} onClose={() => setShowNewProductForm(false)}
        onSaved={(p: any) => { setProducts((prev) => [...prev, p]); setShowNewProductForm(false); if (selectedSupplier) addLine(p.id) }} />

      <TablePickerModal open={showSupplierTable} onClose={() => setShowSupplierTable(false)} title="Proveedores" items={suppliers}
        columns={[
          { key: 'name', label: 'Nombre', render: (s: any) => s.name },
          { key: 'doc', label: 'Documento', render: (s: any) => `${s.documentType}-${s.documentNumber}` },
        ]}
        filterFn={(s: any, q: string) => s.name.toLowerCase().includes(q.toLowerCase()) || s.documentNumber.includes(q)}
        onSelect={(s: any) => { setSelectedSupplier(s); setShowSupplierTable(false) }} searchPlaceholder="Buscar proveedor..." />

      <TablePickerModal open={showProductTable} onClose={() => setShowProductTable(false)}
        title={selectedSupplier && productFilterOn ? `Productos de ${selectedSupplier.name}` : 'Productos'}
        items={productTableItems()} sortFn={sortByStock}
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
        onSelect={(p: any) => { if (selectedSupplier) addLine(p.id); setShowProductTable(false) }} searchPlaceholder="Buscar producto..." />

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
    </div>
  )
}
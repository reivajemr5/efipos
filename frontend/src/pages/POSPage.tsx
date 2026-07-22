import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { db } from '../services/db'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import POSHeader from '../components/pos/POSHeader'
import TicketPanel from '../components/pos/TicketPanel'
import type { CartItem } from '../components/pos/TicketPanel'
import ProductGrid from '../components/pos/ProductGrid'

interface Product {
  id: number
  code: string
  name: string
  description?: string | null
  price: number
  currency: string
  ivaPercent: number
  stock: number
  imageUrl?: string | null
  categoryId?: number | null
  category?: { id: number; name: string } | null
}

interface Category {
  id: number
  name: string
}

interface Invoice {
  id: number
  number: string
  client: { id: number; name: string }
  total: number
  totalBs?: number | null
  currency: string
  status: string
  paymentMethod: string
  createdAt: string
}

export default function POSPage() {
  const isOnline = useOnlineStatus()
  const [mode, setMode] = useState<'quick' | 'walkin'>('quick')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showingHistory, setShowingHistory] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
  const [checkoutModal, setCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [successSale, setSuccessSale] = useState<{ number: string; id: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)
  const [discount, setDiscount] = useState(0)

  const loadData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        api.products.list(),
        api.categories.list(),
      ])
      setProducts(prods.map((p: any) => ({ ...p, price: Number(p.price), ivaPercent: Number(p.ivaPercent) })))
      setCategories(cats)
    } catch {
      const cached = await db.products.toArray()
      setProducts(cached.map((p: any) => ({ ...p, price: Number(p.price), ivaPercent: Number(p.ivaPercent) })))
    }
  }, [])

  const loadInvoices = useCallback(async () => {
    try {
      const params = invoiceFilter !== 'all' ? `status=${invoiceFilter}` : ''
      const data = await api.invoices.list(params)
      setInvoices(data)
    } catch {
      // ignore
    }
  }, [invoiceFilter])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { if (showingHistory) loadInvoices() }, [showingHistory, loadInvoices])

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory
    return matchesSearch && matchesCategory
  })

  function handleSelectProduct(product: Product) {
    if (product.stock <= 0) return
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: Number(product.price), ivaPercent: Number(product.ivaPercent) }]
    })
  }

  function handleUpdateQuantity(productId: number, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId))
      return
    }
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)))
  }

  function handleRemove(productId: number) {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  function handleCancel() {
    if (cart.length === 0) return
    setCart([])
    setDiscount(0)
    setNotes('')
  }

  async function handleCheckout() {
    if (cart.length === 0) return
    setCheckoutModal(true)
  }

  async function confirmCheckout() {
    setLoading(true)
    const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const ivaTotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.ivaPercent) / 100, 0)
    const total = Math.max(0, subtotal + ivaTotal - discount)

    try {
      const invoice = await api.invoices.create({
        paymentMethod,
        currency: 'usd',
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      })
      setSuccessSale({ number: invoice.number, id: invoice.id })
      setCart([])
      setDiscount(0)
      setNotes('')
      setCheckoutModal(false)
      if (showingHistory) loadInvoices()
    } catch (err: any) {
      alert('Error al crear factura: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelInvoice(id: number) {
    if (!confirm('¿Anular esta factura?')) return
    try {
      await api.invoices.cancel(id)
      loadInvoices()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handlePrint(id: number) {
    window.open(`/invoices/print/${id}`, '_blank')
  }

  function startNewSale() {
    setSuccessSale(null)
    setCart([])
    setDiscount(0)
    setNotes('')
    setMode('quick')
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const ivaTotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.ivaPercent) / 100, 0)
  const total = Math.max(0, subtotal + ivaTotal - discount)

  if (successSale) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Venta Completada</h2>
          <p className="text-gray-500 mb-1">{successSale.number}</p>
          <p className="text-2xl font-bold text-green-600 mb-6">${total.toFixed(2)}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => handlePrint(successSale.id)}
              className="px-6 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 touch-manipulation"
            >
              Imprimir
            </button>
            <button
              onClick={startNewSale}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 touch-manipulation"
            >
              Nueva Venta
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showingHistory) {
    return (
      <div className="flex flex-col h-full">
        <POSHeader mode={mode} onModeChange={setMode} search={search} onSearchChange={setSearch} onToggleHistory={() => setShowingHistory(false)} showingHistory={true} />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Historial de Facturas</h2>
            <div className="flex gap-2">
              {['all', 'activa', 'anulada'].map((s) => (
                <button
                  key={s}
                  onClick={() => setInvoiceFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium touch-manipulation ${
                    invoiceFilter === s ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s === 'all' ? 'Todas' : s === 'activa' ? 'Activas' : 'Anuladas'}
                </button>
              ))}
            </div>
          </div>
          {invoices.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay facturas</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{inv.number}</p>
                    <p className="text-sm text-gray-500">{inv.client.name}</p>
                    <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">${Number(inv.total).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.status === 'activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {inv.status === 'activa' ? 'Activa' : 'Anulada'}
                    </span>
                    <div className="flex gap-1 mt-1">
                      {inv.status === 'activa' && (
                        <button onClick={() => handleCancelInvoice(inv.id)} className="text-xs text-red-600 hover:underline touch-manipulation">Anular</button>
                      )}
                      <button onClick={() => handlePrint(inv.id)} className="text-xs text-blue-600 hover:underline touch-manipulation">Imprimir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <POSHeader mode={mode} onModeChange={setMode} search={search} onSearchChange={setSearch} onToggleHistory={() => setShowingHistory(true)} showingHistory={false} />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/5 flex flex-col">
          <TicketPanel
            items={cart}
            currency="usd"
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemove}
            onCheckout={handleCheckout}
            onCancel={handleCancel}
            onSaveDraft={handleCheckout}
            onDiscount={() => setShowDiscount(true)}
            onNotes={() => setShowNotes(true)}
          />
        </div>
        <div className="w-3/5 flex flex-col">
          <ProductGrid
            products={filteredProducts}
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectProduct={handleSelectProduct}
          />
        </div>
      </div>

      {checkoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirmar Venta</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Método de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Subtotal: ${subtotal.toFixed(2)}</p>
                <p>IVA: ${ivaTotal.toFixed(2)}</p>
                {discount > 0 && <p className="text-amber-600">Descuento: -${discount.toFixed(2)}</p>}
                <p className="text-lg font-bold text-gray-800">Total: ${total.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCheckoutModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCheckout}
                disabled={loading}
                className="flex-1 py-3 bg-secondary text-white rounded-lg font-bold touch-manipulation disabled:opacity-50"
              >
                {loading ? 'Procesando...' : `Cobrar $${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Notas de la venta</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Notas opcionales..."
            />
            <button
              onClick={() => setShowNotes(false)}
              className="w-full mt-4 py-3 bg-blue-900 text-white rounded-lg font-medium touch-manipulation"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showDiscount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Descuento</h3>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowDiscount(false); setDiscount(0) }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
              >
                Quitar
              </button>
              <button
                onClick={() => setShowDiscount(false)}
                className="flex-1 py-3 bg-blue-900 text-white rounded-lg font-medium touch-manipulation"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

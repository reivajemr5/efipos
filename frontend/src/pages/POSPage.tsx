import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { db } from '../services/db'
import POSHeader from '../components/pos/POSHeader'
import TicketPanel from '../components/pos/TicketPanel'
import type { CartItem } from '../components/pos/TicketPanel'
import ProductGrid from '../components/pos/ProductGrid'
import ClientFormModal from '../components/ClientFormModal'

interface Client {
  id: number; name: string; documentType: string; documentNumber: string
  phone: string | null; address: string | null
}

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

const DEFAULT_CLIENT: Client = { id: 0, name: 'Consumidor Final', documentType: 'V', documentNumber: '0', phone: null, address: null }

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [checkoutModal, setCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [successSale, setSuccessSale] = useState<{ number: string; id: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [selectedClient, setSelectedClient] = useState<Client>(DEFAULT_CLIENT)
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [showCartMobile, setShowCartMobile] = useState(false)
  const [search, setSearch] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [modalSearch, setModalSearch] = useState('')
  const [modalCategory, setModalCategory] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [prods, cats, clis] = await Promise.all([
        api.products.list(),
        api.categories.list(),
        api.clients.list(),
      ])
      setProducts(prods.map((p: any) => ({ ...p, price: Number(p.price), ivaPercent: Number(p.ivaPercent) })))
      setCategories(cats)
      setClients(clis)
    } catch {
      const cached = await db.products.toArray()
      setProducts(cached.map((p: any) => ({ ...p, price: Number(p.price), ivaPercent: Number(p.ivaPercent) })))
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory
    return matchesSearch && matchesCategory
  })

  const modalResults = products.filter((p) => {
    const matchesSearch = !modalSearch || p.name.toLowerCase().includes(modalSearch.toLowerCase()) || p.code.toLowerCase().includes(modalSearch.toLowerCase())
    const matchesCategory = !modalCategory || p.categoryId === modalCategory
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

    try {
      const invoice = await api.invoices.create({
        clientId: selectedClient.id || undefined,
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
    } catch (err: any) {
      alert('Error al crear factura: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadClients(q?: string) {
    try {
      const data = await api.clients.list(q)
      setClients(data)
    } catch { }
  }

  function handleSelectClient(c: Client) {
    setSelectedClient(c)
    setShowClientModal(false)
    setClientSearch('')
  }

  function handleClientCreated(c: Client) {
    setSelectedClient(c)
    setShowNewClientForm(false)
    setShowClientModal(false)
    setClientSearch('')
  }

  async function handlePrint(id: number) {
    window.open(`/invoices/print/${id}`, '_blank')
  }

  function startNewSale() {
    setSuccessSale(null)
    setCart([])
    setDiscount(0)
    setNotes('')
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

  const cartItemCount = cart.reduce((c, i) => c + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.ivaPercent) / 100, 0)

  return (
    <div className="flex flex-col h-full">
      <POSHeader
        clientSearch={clientSearch}
        onClientSearchChange={setClientSearch}
        onClientSearchModal={() => setShowClientModal(true)}
        onClientAdd={() => setShowNewClientForm(true)}
        productSearch={search}
        onProductSearchChange={setSearch}
        onProductSearchModal={() => { setModalSearch(''); setModalCategory(null); setShowProductSearch(true) }}
      />
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex w-2/5 flex-col">
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
        <div className={`flex-1 flex flex-col ${showCartMobile ? 'hidden md:flex' : ''}`}>
          <ProductGrid
            products={filteredProducts}
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectProduct={handleSelectProduct}
          />

        </div>
      </div>

      {cartItemCount > 0 && (
        <button
          onClick={() => setShowCartMobile(true)}
          className="md:hidden fixed bottom-4 right-4 z-40 bg-blue-900 text-white rounded-full shadow-lg flex items-center gap-2 px-4 py-3 touch-manipulation"
        >
          <span className="bg-white text-blue-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartItemCount}</span>
          <span className="font-bold">${cartTotal.toFixed(2)}</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
        </button>
      )}

      {showCartMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col" onClick={() => setShowCartMobile(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative mt-auto bg-white rounded-t-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <h2 className="font-semibold text-gray-800">Ticket de Venta</h2>
              <button onClick={() => setShowCartMobile(false)} className="text-gray-400 p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <TicketPanel
              items={cart}
              currency="usd"
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
              onCheckout={handleCheckout}
              onCancel={() => { handleCancel(); setShowCartMobile(false) }}
              onSaveDraft={handleCheckout}
              onDiscount={() => setShowDiscount(true)}
              onNotes={() => setShowNotes(true)}
            />
          </div>
        </div>
      )}

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
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold touch-manipulation disabled:opacity-50"
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

      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowClientModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">Seleccionar Cliente</h3>
                <button onClick={() => setShowClientModal(false)} className="text-gray-400 p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); loadClients(e.target.value || undefined) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <button
                onClick={() => handleSelectClient(DEFAULT_CLIENT)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 flex items-center gap-2"
              >
                <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">CF</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">Consumidor Final</p>
                  <p className="text-xs text-gray-400">Venta sin identificación</p>
                </div>
              </button>
              <div className="border-t border-gray-100 my-1" />
              {clients.filter((c) => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.documentNumber.includes(clientSearch)).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectClient(c)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                >
                  <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.documentType}-{c.documentNumber}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => { setShowNewClientForm(true) }}
                className="w-full py-2.5 bg-blue-900 text-white rounded-lg font-medium text-sm hover:bg-blue-800 touch-manipulation"
              >
                + Nuevo Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientFormModal open={showNewClientForm} onClose={() => setShowNewClientForm(false)} onSaved={handleClientCreated} />

      {showProductSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowProductSearch(false); setModalSearch(''); setModalCategory(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Buscar Productos</h3>
                <button onClick={() => { setShowProductSearch(false); setModalSearch(''); setModalCategory(null) }} className="text-gray-400 p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setModalCategory(null)} className={`px-3 py-1 rounded-lg text-xs font-medium touch-manipulation ${!modalCategory ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todas</button>
                {categories.map((c) => (
                  <button key={c.id} onClick={() => setModalCategory(c.id)} className={`px-3 py-1 rounded-lg text-xs font-medium touch-manipulation ${modalCategory === c.id ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="px-4 py-2 font-medium">Producto</th>
                    <th className="px-4 py-2 font-medium">Código</th>
                    <th className="px-4 py-2 font-medium text-right">Precio</th>
                    <th className="px-4 py-2 font-medium text-right">Stock</th>
                    <th className="px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modalResults.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin resultados</td></tr>
                  ) : (
                    modalResults.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs overflow-hidden shrink-0">
                              {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                            </div>
                            <span className="font-medium text-gray-800">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{p.code}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800">${Number(p.price).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-xs font-medium ${p.stock <= 0 ? 'text-red-500' : 'text-green-600'}`}>{p.stock}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => { handleSelectProduct(p); setShowProductSearch(false); setModalSearch(''); setModalCategory(null) }}
                            disabled={p.stock <= 0}
                            className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-800 touch-manipulation disabled:opacity-40"
                          >
                            + Agregar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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

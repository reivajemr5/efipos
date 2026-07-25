import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api'
import { db } from '../services/db'
import POSHeader from '../components/pos/POSHeader'
import TicketPanel from '../components/pos/TicketPanel'
import type { CartItem } from '../components/pos/TicketPanel'
import ProductGrid from '../components/pos/ProductGrid'
import ClientFormModal from '../components/ClientFormModal'
import LoadDraftModal from '../components/LoadDraftModal'

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
  const [paymentLines, setPaymentLines] = useState<Array<{ method: string; amount: number; reference: string }>>([])
  const [receivedAmount, setReceivedAmount] = useState(0)
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
  const [showLoadDraft, setShowLoadDraft] = useState(false)
  const [search, setSearch] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [modalSearch, setModalSearch] = useState('')
  const [modalCategory, setModalCategory] = useState<number | null>(null)
  const [lastSaleAmount, setLastSaleAmount] = useState(0)
  const [qtyModalProduct, setQtyModalProduct] = useState<Product | null>(null)
  const [qtyValue, setQtyValue] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const clientInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => { clientInputRef.current?.focus() }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement
      if (e.key === 'Escape') {
        if (checkoutModal) { setCheckoutModal(false); return }
        if (successSale) { setSuccessSale(null); return }
        if (showNotes) { setShowNotes(false); return }
        if (showDiscount) { setShowDiscount(false); return }
        if (showClientModal) { setShowClientModal(false); return }
        if (showProductSearch) { setShowProductSearch(false); return }
        if (showCartMobile) { setShowCartMobile(false); return }
        return
      }
      if (e.key === 'n' && !isInput && successSale && !e.ctrlKey && !e.metaKey) {
        startNewSale()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!successSale && cart.length > 0 && !checkoutModal) {
          e.preventDefault()
          handleCheckout()
        }
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

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

  function handleSearchSubmit() {
    if (filteredProducts.length > 0) {
      handleSelectProduct(filteredProducts[0])
      setSearch('')
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }

  function handleClientSubmit() {
    if (clientSearch.trim()) {
      const match = clients.find((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.documentNumber.includes(clientSearch)
      )
      if (match) { handleSelectClient(match); return }
      setShowNewClientForm(true)
      return
    }
    handleSelectClient(DEFAULT_CLIENT)
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

  async function handleSaveDraft() {
    if (cart.length === 0) return
    try {
      await api.invoices.create({
        clientId: selectedClient.id || undefined,
        status: 'borrador',
        paymentMethod: 'efectivo',
        currency: 'usd',
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      })
      setCart([])
      setDiscount(0)
      setNotes('')
      setSelectedClient(DEFAULT_CLIENT)
    } catch (err: any) {
      alert('Error al guardar borrador: ' + err.message)
    }
  }

  function handleLoadDraft(draft: any) {
    setCart(draft.items.map((i: any) => ({
      productId: i.productId,
      name: i.name || i.product?.name || '',
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      ivaPercent: Number(i.ivaPercent),
    })))
    if (draft.client) {
      setSelectedClient({ id: draft.clientId, name: draft.client.name, documentType: draft.client.documentType, documentNumber: draft.client.documentNumber, phone: draft.client.phone, address: draft.client.address })
    }
    setShowLoadDraft(false)
  }

  function handleCheckout() {
    if (cart.length === 0) return
    const paidTotal = Math.max(0, subtotal + ivaTotal - discount)
    setPaymentLines([{ method: 'efectivo', amount: paidTotal, reference: '' }])
    setReceivedAmount(paidTotal)
    setCheckoutModal(true)
  }

  async function confirmCheckout() {
    setLoading(true)
    const paidTotal = Math.max(0, subtotal + ivaTotal - discount)

    try {
      const activePayments = paymentLines.filter((p) => p.amount > 0)
      const invoice = await api.invoices.create({
        clientId: selectedClient.id || undefined,
        paymentMethod: activePayments.map((p) => p.method).join('+'),
        currency: 'usd',
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        payments: activePayments,
      })
      setLastSaleAmount(paidTotal)
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

  function handlePrint() {
    setTimeout(() => window.print(), 300)
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
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  function handleClientCreated(c: Client) {
    setSelectedClient(c)
    setShowNewClientForm(false)
    setShowClientModal(false)
    setClientSearch('')
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  function startNewSale() {
    setSuccessSale(null)
    setCart([])
    setDiscount(0)
    setNotes('')
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const ivaTotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.ivaPercent) / 100, 0)
  const total = Math.max(0, subtotal + ivaTotal - discount)

  const cartItemCount = cart.reduce((c, i) => c + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.ivaPercent) / 100, 0)

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { display: block !important; position: fixed; top: 0; left: 0; right: 0; background: white; z-index: 9999; padding: 20px; font-size: 12px; }
        }
        .print-area { display: none; }
      `}</style>

      <div className="no-print grid grid-rows-[auto_1fr] h-[calc(100dvh-56px)]">
        <POSHeader
          clientSearch={clientSearch}
          onClientSearchChange={setClientSearch}
          onClientSearchModal={() => setShowClientModal(true)}
          onClientAdd={() => setShowNewClientForm(true)}
          clients={clients}
          onSelectClient={handleSelectClient}
          selectedClient={selectedClient.id ? { id: selectedClient.id, name: selectedClient.name, documentType: selectedClient.documentType, documentNumber: selectedClient.documentNumber, phone: selectedClient.phone, address: selectedClient.address } : null}
          onClearClient={() => setSelectedClient(DEFAULT_CLIENT)}
          productSearch={search}
          onProductSearchChange={setSearch}
          onProductSearchModal={() => { setModalSearch(''); setModalCategory(null); setShowProductSearch(true) }}
          onLoadDraft={() => setShowLoadDraft(true)}
          searchInputRef={searchInputRef}
          onSearchSubmit={handleSearchSubmit}
          clientInputRef={clientInputRef}
          onClientSubmit={handleClientSubmit}
        />
        <div className="grid md:grid-cols-[2fr_3fr] overflow-hidden min-h-0">
          <div className="hidden md:flex flex-col min-h-0 h-full">
            <TicketPanel
              items={cart}
              currency="usd"
              discount={discount}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
              onCheckout={handleCheckout}
              onCancel={handleCancel}
              onSaveDraft={handleSaveDraft}
              onDiscount={() => setShowDiscount(true)}
              onNotes={() => setShowNotes(true)}
            />
          </div>
          <div className={`overflow-y-auto min-h-0 ${showCartMobile ? 'hidden md:block' : ''}`}>
            <ProductGrid
              products={filteredProducts}
              categories={categories}
              selectedCategoryId={selectedCategory}
              onSelectCategory={setSelectedCategory}
               onSelectProduct={handleSelectProduct}
               onSelectProductQuantity={(p) => { setQtyModalProduct(p); setQtyValue(1) }}
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
                discount={discount}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
                onCheckout={handleCheckout}
                onCancel={() => { handleCancel(); setShowCartMobile(false) }}
                onSaveDraft={handleSaveDraft}
                onDiscount={() => setShowDiscount(true)}
                onNotes={() => setShowNotes(true)}
              />
            </div>
          </div>
        )}

        {checkoutModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Confirmar Venta</h3>
              <p className="text-sm text-gray-500 mb-4">Total a cobrar: <span className="font-bold text-gray-800">${total.toFixed(2)}</span></p>

              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">Métodos de pago</label>
                {paymentLines.map((line, i) => {
                  const lineTotal = paymentLines.reduce((s, l) => s + l.amount, 0)
                  const remaining = total - (lineTotal - line.amount)
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={line.method}
                        onChange={(e) => {
                          const next = [...paymentLines]
                          next[i] = { ...next[i], method: e.target.value }
                          setPaymentLines(next)
                        }}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[110px]"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="pago_movil">Pago Móvil</option>
                        <option value="bio_pago">Bio Pago</option>
                        <option value="cashea">Cashea</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.amount || ''}
                          onChange={(e) => {
                            const next = [...paymentLines]
                            next[i] = { ...next[i], amount: Math.max(0, Number(e.target.value) || 0) }
                            setPaymentLines(next)
                          }}
                          className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder={remaining > 0 ? `Restan $${remaining.toFixed(2)}` : '0.00'}
                        />
                      </div>
                      {paymentLines.length > 1 && (
                        <button
                          onClick={() => setPaymentLines(paymentLines.filter((_, j) => j !== i))}
                          className="p-2 text-gray-400 hover:text-red-600 touch-manipulation"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  )
                })}

                {paymentLines.some((l) => l.method === 'efectivo') && (
                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-sm text-gray-600 min-w-[110px]">Recibido $</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receivedAmount || ''}
                      onChange={(e) => setReceivedAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {paymentLines.some((l) => l.method === 'efectivo') && receivedAmount > total && (
                  <p className="text-sm text-green-600 font-medium">
                    Cambio: ${(receivedAmount - total).toFixed(2)}
                  </p>
                )}

                <button
                  onClick={() => {
                    const lineTotal = paymentLines.reduce((s, l) => s + l.amount, 0)
                    const rest = Math.max(0, total - lineTotal)
                    setPaymentLines([...paymentLines, { method: 'efectivo', amount: Number(rest.toFixed(2)), reference: '' }])
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium touch-manipulation"
                >
                  + Agregar otro método
                </button>
              </div>

              <div className="text-xs text-gray-500 space-y-1 mb-4">
                <p>Subtotal: ${subtotal.toFixed(2)}</p>
                <p>IVA: ${ivaTotal.toFixed(2)}</p>
                {discount > 0 && <p className="text-amber-600">Descuento: -${discount.toFixed(2)}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCheckoutModal(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCheckout}
                  disabled={loading || paymentLines.reduce((s, l) => s + l.amount, 0) < total - 0.01}
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

        <ClientFormModal open={showNewClientForm} onClose={() => setShowNewClientForm(false)} onSaved={handleClientCreated} initialQuery={clientSearch} existingClients={clients} />

        <LoadDraftModal open={showLoadDraft} onClose={() => setShowLoadDraft(false)} onLoad={handleLoadDraft} />

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

        {qtyModalProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setQtyModalProduct(null)}>
            <div className="bg-white rounded-2xl w-full max-w-xs p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{qtyModalProduct.name}</h3>
              <p className="text-sm text-gray-500 mb-4">${Number(qtyModalProduct.price).toFixed(2)} c/u</p>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setQtyValue(Math.max(1, qtyValue - 1))}
                  className="w-10 h-10 rounded-lg bg-gray-200 text-gray-700 text-lg font-bold hover:bg-gray-300 touch-manipulation"
                >−</button>
                <input
                  type="number"
                  min="1"
                  max={qtyModalProduct.stock}
                  value={qtyValue}
                  onChange={(e) => setQtyValue(Math.max(1, Math.min(qtyModalProduct.stock, Number(e.target.value) || 1)))}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 text-center border border-gray-300 rounded-lg py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => setQtyValue(Math.min(qtyModalProduct.stock, qtyValue + 1))}
                  className="w-10 h-10 rounded-lg bg-gray-200 text-gray-700 text-lg font-bold hover:bg-gray-300 touch-manipulation"
                >+</button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setQtyModalProduct(null)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
                >Cancelar</button>
                <button
                  onClick={() => {
                    if (!qtyModalProduct) return
                    for (let i = 0; i < qtyValue; i++) handleSelectProduct(qtyModalProduct)
                    setQtyModalProduct(null)
                    setQtyValue(1)
                  }}
                  className="flex-1 py-3 bg-blue-900 text-white rounded-lg font-bold touch-manipulation"
                >Agregar ({qtyValue})</button>
              </div>
            </div>
          </div>
        )}

        {successSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Venta Completada</h2>
              <p className="text-gray-500 mb-1">{successSale.number}</p>
              <p className="text-2xl font-bold text-green-600 mb-4">${lastSaleAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mb-6"><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> Imprimir · <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">N</kbd> Nueva Venta · <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Esc</kbd> Cerrar</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handlePrint}
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
        )}
      </div>

      <div className="print-area" id="print-area">
        <div style={{ maxWidth: 300, margin: '0 auto', fontFamily: 'monospace' }}>
          <h2 style={{ textAlign: 'center', margin: '0 0 4px' }}>EfiPOS</h2>
          <p style={{ textAlign: 'center', fontSize: 11, margin: '0 0 8px', color: '#666' }}>
            {successSale?.number || 'Factura'}
          </p>
          <hr style={{ border: 'none', borderTop: '1px dashed #999' }} />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #999' }}>
                <th style={{ textAlign: 'left', padding: '2px 0' }}>Prod</th>
                <th style={{ textAlign: 'center', padding: '2px 0' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '2px 0' }}>P/U</th>
                <th style={{ textAlign: 'right', padding: '2px 0' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.productId}>
                  <td style={{ padding: '2px 0' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '2px 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>${item.unitPrice.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>${(item.unitPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr style={{ border: 'none', borderTop: '1px dashed #999' }} />
          <div style={{ fontSize: 11 }}>
            <p style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </p>
            <p style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span>IVA</span><span>${ivaTotal.toFixed(2)}</span>
            </p>
            {discount > 0 && (
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', color: '#d97706' }}>
                <span>Descuento</span><span>-${discount.toFixed(2)}</span>
              </p>
            )}
            <p style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: 14, fontWeight: 'bold' }}>
              <span>Total</span><span>${lastSaleAmount.toFixed(2)}</span>
            </p>
          </div>
          <hr style={{ border: 'none', borderTop: '1px dashed #999' }} />
          <p style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 8 }}>
            {selectedClient.id > 0 ? selectedClient.name : 'Consumidor Final'}<br />
            {new Date().toLocaleDateString('es')} {new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </>
  )
}

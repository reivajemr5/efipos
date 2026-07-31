import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api'
import POSHeader from '../components/pos/POSHeader'
import type { CartItem } from '../components/pos/TicketPanel'
import ProductGrid from '../components/pos/ProductGrid'
import ClientFormModal from '../components/ClientFormModal'
import LoadModal from '../components/LoadModal'
import { useNavigate } from 'react-router-dom'

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
  barcode?: string | null
  categoryId?: number | null
  category?: { id: number; name: string } | null
}

interface Category {
  id: number
  name: string
}

const DEFAULT_CLIENT: Client = { id: 0, name: 'Consumidor Final', documentType: 'V', documentNumber: '0', phone: null, address: null }

export default function Quotes() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [successQuote, setSuccessQuote] = useState<{ number: string; id: number } | null>(null)
  const [loading, setLoading] = useState(false)
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
  const [validDays, setValidDays] = useState('30')
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null)
  const [editingQuoteNumber, setEditingQuoteNumber] = useState('')
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showQuoteList, setShowQuoteList] = useState(false)
  const [quotesList, setQuotesList] = useState<any[]>([])
  const [quoteListLoading, setQuoteListLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const clientInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

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
    } catch {}
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => { clientInputRef.current?.focus() }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (successQuote) { setSuccessQuote(null); return }
        if (showClientModal) { setShowClientModal(false); return }
        if (showProductSearch) { setShowProductSearch(false); return }
        if (showCartMobile) { setShowCartMobile(false); return }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && cart.length > 0 && !successQuote) {
        e.preventDefault()
        handleCreateQuote()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase()
    const matchesSearch = !search || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory
    return matchesSearch && matchesCategory
  })

  const modalResults = products.filter((p) => {
    const q = modalSearch.toLowerCase()
    const matchesSearch = !modalSearch || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
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

  function handleSelectProductQuantity(product: Product) {
    if (product.stock <= 0) return
    const existing = cart.find((i) => i.productId === product.id)
    if (existing) {
      handleUpdateQuantity(product.id, existing.quantity + 1)
    } else {
      setCart((prev) => [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: Number(product.price), ivaPercent: Number(product.ivaPercent) }])
    }
    setShowProductSearch(false)
  }

  function handleUpdateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) { handleRemove(productId); return }
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity } : i))
  }

  function handleRemove(productId: number) {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  function handleCancel() {
    setCart([])
    setSelectedClient(DEFAULT_CLIENT)
    setEditingQuoteId(null)
    setEditingQuoteNumber('')
    setTimeout(() => clientInputRef.current?.focus(), 0)
  }

  function handleLoadQuote(source: { type: string; id: number; items: any[]; client: any }) {
    if (source.type !== 'quote') return
    const items = source.items.map((i: any) => ({
      productId: i.productId,
      name: i.name || i.product?.name || `Producto #${i.productId}`,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      ivaPercent: Number(i.ivaPercent),
    }))
    setCart(items)
    setEditingQuoteId(source.id)
    setEditingQuoteNumber(source.client?.name ? `COTI-${source.id}` : `COTI-${source.id}`)
    if (source.client?.id) {
      setSelectedClient({ id: source.client.id, name: source.client.name, documentType: source.client.documentType || 'V', documentNumber: source.client.documentNumber || '', phone: null, address: null })
    }
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  async function handleCreateQuote() {
    if (cart.length === 0) return
    if (!selectedClient || selectedClient.id === 0) {
      if (!confirm('¿Generar cotización sin cliente asignado?')) return
    }
    setLoading(true)
    try {
      const items = cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }))
      const validUntil = new Date(Date.now() + Number(validDays) * 86400000).toISOString()
      const data = { clientId: selectedClient.id || undefined, validUntil, items }
      if (editingQuoteId) {
        await api.quotes.update(editingQuoteId, data)
        setSuccessQuote({ number: editingQuoteNumber, id: editingQuoteId })
        setEditingQuoteId(null)
        setEditingQuoteNumber('')
      } else {
        const quote = await api.quotes.create(data)
        setSuccessQuote({ number: quote.number || '', id: quote.id })
      }
      setCart([])
      setSelectedClient(DEFAULT_CLIENT)
      setValidDays('30')
    } catch (err: any) {
      alert('Error al crear cotización: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit() {
    if (filteredProducts.length > 0) {
      const first = filteredProducts[0]
      if (first.stock > 0) handleSelectProduct(first)
    }
  }

  function handleSearchArrowDown() {
    const firstCard = document.querySelector<HTMLButtonElement>('.product-card-btn')
    firstCard?.focus()
  }

  function handleClientSubmit() {
    if (clientSearch.length >= 3 && clients.length > 0) {
      setSelectedClient(clients[0])
      setClientSearch('')
    } else {
      setShowClientModal(true)
    }
  }

  function handleSelectClient(c: Client) {
    setSelectedClient(c)
    setShowClientModal(false)
    setClientSearch('')
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  function startNewQuote() {
    setSuccessQuote(null)
    setCart([])
    setSelectedClient(DEFAULT_CLIENT)
    setEditingQuoteId(null)
    setEditingQuoteNumber('')
    setValidDays('30')
    setShowCartMobile(false)
    setTimeout(() => clientInputRef.current?.focus(), 0)
  }

  async function loadQuotesList() {
    setQuoteListLoading(true)
    try {
      const data = await api.quotes.list()
      setQuotesList(data)
      setShowQuoteList(true)
    } catch {} finally { setQuoteListLoading(false) }
  }

  async function printQuoteById(id: number) {
    try {
      const data = await api.quotes.print(id)
      const win = window.open('', '_blank')
      if (!win) return
      const rate = data.quote.exchangeRate || 1
      const itemsHtml = data.quote.items.map((item: any) =>
        `<tr><td style="padding:4px 6px;font-size:10px">${item.product?.code || ''}</td><td style="padding:4px 6px;font-size:10px">${item.product?.name}</td><td style="padding:4px 6px;text-align:center;font-size:10px">${item.quantity}</td><td style="padding:4px 6px;text-align:right;font-size:10px">$${Number(item.unitPrice).toFixed(2)}</td><td style="padding:4px 6px;text-align:right;font-size:10px">Bs.${(Number(item.unitPrice) * rate).toFixed(2)}</td><td style="padding:4px 6px;text-align:right;font-size:10px">$${Number(item.subtotal).toFixed(2)}</td><td style="padding:4px 6px;text-align:right;font-size:10px">Bs.${(Number(item.subtotal) * rate).toFixed(2)}</td></tr>`
      ).join('')
      win.document.write(`<!DOCTYPE html><html><head><title>${data.quote.number}</title><style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#1E40AF;color:#fff;font-size:10px}hr{border:none;border-top:2px solid #333}.header{text-align:center;margin-bottom:20px}.header h1{font-size:18px;margin:0 0 4px}.header p{margin:2px 0;color:#555;font-size:11px}.info{display:flex;justify-content:space-between;margin:15px 0;font-size:11px}.totals{text-align:right;margin-top:15px;font-size:12px}.totals p{margin:3px 0}.totals .grand{font-size:16px;font-weight:bold}@media print{body{padding:15px}}@page{size:letter;margin:15mm}</style></head><body><div class="header"><h1>${data.company.name}</h1><p>RIF: ${data.company.rif}</p><p>${data.company.address} · ${data.company.phone}</p><hr><h2 style="margin:10px 0 0">COTIZACIÓN</h2><p style="font-size:14px;font-weight:bold;color:#1E40AF;margin:2px 0">${data.quote.number}</p></div><div class="info"><div><strong>Cliente:</strong> ${data.quote.client?.name || 'Consumidor Final'}<br><strong>Documento:</strong> ${data.quote.client?.documentType || ''}-${data.quote.client?.documentNumber || '0'}</div><div style="text-align:right"><strong>Fecha:</strong> ${new Date(data.quote.createdAt).toLocaleDateString('es')}<br><strong>Válido hasta:</strong> ${new Date(data.quote.validUntil).toLocaleDateString('es')}</div></div><table><thead><tr><th>Código</th><th>Producto</th><th>Cant</th><th>P/U $</th><th>P/U Bs.</th><th>Total $</th><th>Total Bs.</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="totals"><p>Subtotal: $${Number(data.quote.subtotal).toFixed(2)} · Bs.${(Number(data.quote.subtotal) * rate).toFixed(2)}</p><p>IVA: $${Number(data.quote.ivaTotal).toFixed(2)} · Bs.${(Number(data.quote.ivaTotal) * rate).toFixed(2)}</p><p class="grand">Total: $${Number(data.quote.total).toFixed(2)} · Bs.${(Number(data.quote.total) * rate).toFixed(2)}</p></div><hr><p style="font-size:10px;color:#888;text-align:center">Tasa BCV: Bs.${rate.toFixed(2)}/$</p><p style="font-size:10px;color:#888;text-align:center;margin-top:20px">Gracias por su preferencia</p></body></html>`)
      win.document.close()
      win.print()
    } catch {}
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const ivaTotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.ivaPercent) / 100, 0)
  const total = Math.max(0, subtotal + ivaTotal)

  const cartItemCount = cart.reduce((c, i) => c + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.ivaPercent) / 100, 0)

  return (
    <>
      <div className="no-print flex flex-col h-[calc(100dvh-56px)]">
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
          searchInputRef={searchInputRef}
          onSearchSubmit={handleSearchSubmit}
          onSearchArrowDown={handleSearchArrowDown}
          clientInputRef={clientInputRef}
          onClientSubmit={handleClientSubmit}
          exchangeRate={0}
          onLoadDraft={() => setShowLoadModal(true)}
        />

        <div className="flex items-center justify-between px-4 py-1 bg-gray-50 border-b border-gray-200 shrink-0">
          <span className="text-xs text-gray-500">Cotizaciones</span>
          <button
            onClick={loadQuotesList}
            className="text-xs text-blue-700 font-medium hover:underline touch-manipulation"
          >
            📋 Ver lista
          </button>
        </div>

        {editingQuoteId && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-800 shrink-0">
            <span className="font-medium">📝 Editando Cotización {editingQuoteNumber}</span>
            <button
              onClick={() => { setEditingQuoteId(null); setEditingQuoteNumber(''); setCart([]); setSelectedClient(DEFAULT_CLIENT) }}
              className="ml-auto px-2 py-0.5 bg-blue-200 text-blue-800 rounded hover:bg-blue-300 touch-manipulation"
            >
              Cancelar edición
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 grid md:grid-cols-[2fr_3fr]">
          <div className="hidden md:flex flex-col min-h-0 h-full">
            <div className="flex flex-col h-full min-h-0 bg-white border-r border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                <h2 className="text-sm font-semibold text-gray-700">Nueva Cotización</h2>
                <p className="text-xs text-gray-400">{cartItemCount} items · Válida {validDays} días</p>
              </div>
              <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0">
                <label className="text-xs text-gray-500 mr-2">Validez:</label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="w-16 px-2 py-1 border rounded text-sm text-center"
                  min="1"
                />
                <span className="text-xs text-gray-500 ml-1">días</span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm px-4 text-center">
                    Selecciona productos del catálogo para añadirlos a la cotización
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">${item.unitPrice.toFixed(2)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 touch-manipulation"
                        >-</button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 touch-manipulation"
                        >+</button>
                      </div>
                      <p className="w-20 text-right text-sm font-mono font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="p-1 text-red-400 hover:text-red-600 touch-manipulation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-white border-t border-gray-200">
                <div className="px-4 py-3 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal ({cartItemCount} items)</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IVA</span>
                    <span className="font-medium">${ivaTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-1">
                    <span>Total</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={handleCreateQuote}
                  disabled={cart.length === 0 || loading}
                  className="w-full py-4 bg-blue-900 text-white text-lg font-bold hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
                >
                  {loading ? 'Generando...' : `Generar Cotización $${total.toFixed(2)}`}
                </button>
              </div>
              <div className="flex gap-2 px-3 py-2 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors touch-manipulation"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
          <div className={`overflow-y-auto min-h-0 w-full max-w-full ${showCartMobile ? 'hidden md:block' : ''}`}>
            <ProductGrid
              products={filteredProducts}
              categories={categories}
              selectedCategoryId={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onSelectProduct={handleSelectProduct}
              onSelectProductQuantity={(p) => { handleSelectProductQuantity(p) }}
              onArrowUpFromFirst={() => searchInputRef.current?.focus()}
              exchangeRate={0}
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
          <div className="fixed inset-0 z-50 flex flex-col md:hidden" onClick={() => setShowCartMobile(false)}>
            <div className="flex-1 bg-black/50" onClick={() => setShowCartMobile(false)} />
            <div className="bg-white max-h-[70vh] flex flex-col rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                <h3 className="font-bold text-gray-800">Nueva Cotización</h3>
                <button onClick={() => setShowCartMobile(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-4 py-2 border-b border-gray-100 shrink-0">
                <label className="text-xs text-gray-500 mr-2">Validez:</label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="w-16 px-2 py-1 border rounded text-sm text-center"
                  min="1"
                />
                <span className="text-xs text-gray-500 ml-1">días</span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">${item.unitPrice.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 touch-manipulation">-</button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 touch-manipulation">+</button>
                    </div>
                    <p className="w-20 text-right text-sm font-mono font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                    <button onClick={() => handleRemove(item.productId)} className="p-1 text-red-400 hover:text-red-600 touch-manipulation">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="shrink-0">
                <div className="px-4 py-3 space-y-1 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal ({cartItemCount} items)</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IVA</span>
                    <span className="font-medium">${ivaTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-1">
                    <span>Total</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setShowCartMobile(false); handleCreateQuote() }}
                  disabled={cart.length === 0 || loading}
                  className="w-full py-4 bg-blue-900 text-white text-lg font-bold hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
                >
                  {loading ? 'Generando...' : `Generar Cotización $${total.toFixed(2)}`}
                </button>
                <div className="flex gap-2 px-3 py-2 bg-gray-50 border-t border-gray-200">
                  <button onClick={() => { setShowCartMobile(false); handleCancel() }} className="flex-1 py-2.5 px-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 touch-manipulation">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showProductSearch && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowProductSearch(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
                <h3 className="text-lg font-bold text-gray-800">Buscar Producto</h3>
                <button onClick={() => setShowProductSearch(false)} className="text-gray-400 p-1 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 border-b border-gray-200 space-y-2 shrink-0">
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Buscar por nombre, código o código de barras..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setModalCategory(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      modalCategory === null ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >Todas</button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setModalCategory(cat.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        modalCategory === cat.id ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >{cat.name}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {modalResults.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">Sin resultados</p>
                ) : (
                  modalResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProductQuantity(p)}
                      disabled={p.stock <= 0}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-left"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.code} · Stock: {p.stock}</p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-gray-800">${Number(p.price).toFixed(2)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {successQuote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">Cotización Creada</h3>
              <p className="text-gray-500 mb-2">Número: {successQuote.number}</p>
              <p className="text-sm text-gray-400 mb-6">Se ha generado la cotización correctamente</p>
              <div className="space-y-3">
                <button
                  onClick={startNewQuote}
                  className="w-full py-3 bg-blue-900 text-white rounded-lg font-bold touch-manipulation"
                >
                  Nueva Cotización
                </button>
                <button
                  onClick={async () => {
                    try {
                      const data = await api.quotes.print(successQuote.id)
                      const win = window.open('', '_blank')
                      if (!win) return
                      const rate = data.quote.exchangeRate || 1
                      const itemsHtml = data.quote.items.map((item: any) => {
                        const pu = item.unitPrice
                        const tot = item.subtotal
                        return `<tr><td style="padding:4px 6px;font-size:10px">${item.product?.code || ''}</td><td style="padding:4px 6px;font-size:10px">${item.product?.name}</td><td style="padding:4px 6px;text-align:center;font-size:10px">${item.quantity}</td><td style="padding:4px 6px;text-align:right;font-size:10px">$${pu.toFixed(2)}</td><td style="padding:4px 6px;text-align:right;font-size:10px">Bs.${(pu * rate).toFixed(2)}</td><td style="padding:4px 6px;text-align:right;font-size:10px">$${tot.toFixed(2)}</td><td style="padding:4px 6px;text-align:right;font-size:10px">Bs.${(tot * rate).toFixed(2)}</td></tr>`
                      }).join('')
                      win.document.write(`<!DOCTYPE html><html><head><title>${data.quote.number}</title><style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#1E40AF;color:#fff;font-size:10px}hr{border:none;border-top:2px solid #333}.header{text-align:center;margin-bottom:20px}.header h1{font-size:18px;margin:0 0 4px}.header p{margin:2px 0;color:#555;font-size:11px}.info{display:flex;justify-content:space-between;margin:15px 0;font-size:11px}.totals{text-align:right;margin-top:15px;font-size:12px}.totals p{margin:3px 0}.totals .grand{font-size:16px;font-weight:bold}@media print{body{padding:15px}}@page{size:letter;margin:15mm}</style></head><body><div class="header"><h1>${data.company.name}</h1><p>RIF: ${data.company.rif}</p><p>${data.company.address} · ${data.company.phone}</p><hr><h2 style="margin:10px 0 0">COTIZACIÓN</h2><p style="font-size:14px;font-weight:bold;color:#1E40AF;margin:2px 0">${data.quote.number}</p></div><div class="info"><div><strong>Cliente:</strong> ${data.quote.client?.name || 'Consumidor Final'}<br><strong>Documento:</strong> ${data.quote.client?.documentType || ''}-${data.quote.client?.documentNumber || '0'}</div><div style="text-align:right"><strong>Fecha:</strong> ${new Date(data.quote.createdAt).toLocaleDateString('es')}<br><strong>Válido hasta:</strong> ${new Date(data.quote.validUntil).toLocaleDateString('es')}</div></div><table><thead><tr><th>Código</th><th>Producto</th><th>Cant</th><th>P/U $</th><th>P/U Bs.</th><th>Total $</th><th>Total Bs.</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="totals"><p>Subtotal: $${Number(data.quote.subtotal).toFixed(2)} · Bs.${(Number(data.quote.subtotal) * rate).toFixed(2)}</p><p>IVA: $${Number(data.quote.ivaTotal).toFixed(2)} · Bs.${(Number(data.quote.ivaTotal) * rate).toFixed(2)}</p><p class="grand">Total: $${Number(data.quote.total).toFixed(2)} · Bs.${(Number(data.quote.total) * rate).toFixed(2)}</p></div><hr><p style="font-size:10px;color:#888;text-align:center">Tasa BCV: Bs.${rate.toFixed(2)}/$ · Términos: Válido por ${validDays} días</p><p style="font-size:10px;color:#888;text-align:center;margin-top:20px">Gracias por su preferencia</p></body></html>`)
                      win.document.close()
                      win.print()
                    } catch {}
                  }}
                  className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
                >
                  Imprimir Cotización
                </button>
                <button
                  onClick={() => navigate('/quotes')}
                  className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg font-medium touch-manipulation"
                >
                  Ver Cotizaciones
                </button>
              </div>
            </div>
          </div>
        )}

        {showQuoteList && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQuoteList(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
                <h3 className="text-lg font-bold text-gray-800">Cotizaciones</h3>
                <button onClick={() => setShowQuoteList(false)} className="text-gray-400 p-1 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {quoteListLoading ? (
                  <p className="text-gray-400 text-center py-8 text-sm">Cargando...</p>
                ) : quotesList.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">No hay cotizaciones</p>
                ) : (
                  quotesList.map((q: any) => (
                    <div key={q.id} className="flex items-center gap-2 p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{q.number}</p>
                        <p className="text-xs text-gray-400">{q.client?.name || 'Consumidor Final'} · {new Date(q.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-gray-700">${Number(q.total).toFixed(2)}</span>
                      <button
                        onClick={() => printQuoteById(q.id)}
                        className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-800 touch-manipulation"
                      >
                        Imprimir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <LoadModal
          open={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          onLoad={(source) => { setShowLoadModal(false); handleLoadQuote(source) }}
        />

        <ClientFormModal open={showNewClientForm} onClose={() => setShowNewClientForm(false)}
          onSaved={(client: any) => { setClients((prev) => [...prev, client]); setSelectedClient(client); setShowNewClientForm(false) }} />
      </div>
    </>
  )
}

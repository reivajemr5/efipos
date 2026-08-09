import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api'
import POSHeader from '../components/pos/POSHeader'
import DiscountModal from '../components/pos/DiscountModal'
import type { CartItem } from '../components/pos/TicketPanel'
import ProductGrid from '../components/pos/ProductGrid'
import TicketItem from '../components/pos/TicketItem'
import TicketFooter from '../components/pos/TicketFooter'
import ClientFormModal from '../components/ClientFormModal'
import LoadModal from '../components/LoadModal'
import PaginationBar from '../components/PaginationBar'
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
  const [quoteListTotal, setQuoteListTotal] = useState(0)
  const [quoteListPage, setQuoteListPage] = useState(0)
  const QUOTE_PAGE_SIZE = 25
  const [printModal, setPrintModal] = useState<{ id: number } | null>(null)
  const [exchangeRate, setExchangeRate] = useState(0)
  const [rateChecked, setRateChecked] = useState(false)
  const [manualRate, setManualRate] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [showDiscount, setShowDiscount] = useState(false)
  const [lineDiscountProduct, setLineDiscountProduct] = useState<number | null>(null)
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

  const loadRate = useCallback(async () => {
    const data = await api.exchangeRate.get().catch(() => ({ rate: 0 }))
    if (data?.rate) setExchangeRate(Number(data.rate))
    else {
      const auto = await api.exchangeRate.autoUpdate().catch(() => null)
      if (auto?.rate) setExchangeRate(Number(auto.rate))
    }
    setRateChecked(true)
  }, [])

  useEffect(() => { loadRate() }, [loadRate])

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
    setLineDiscountProduct((cur) => (cur === productId ? null : cur))
  }

  function handleCancel() {
    setCart([])
    setDiscount(0)
    setLineDiscountProduct(null)
    setSelectedClient(DEFAULT_CLIENT)
    setEditingQuoteId(null)
    setEditingQuoteNumber('')
    setTimeout(() => clientInputRef.current?.focus(), 0)
  }

  function handleLoadQuote(source: { type: string; id: number; items: any[]; client: any; discount?: number }) {
    if (source.type !== 'quote') return
    const items = source.items.map((i: any) => ({
      productId: i.productId,
      name: i.name || i.product?.name || `Producto #${i.productId}`,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      ivaPercent: Number(i.ivaPercent),
      discount: i.discount ? Number(i.discount) : 0,
    }))
    setCart(items)
    setDiscount(source.discount ? Number(source.discount) : 0)
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
        discount: i.discount || undefined,
      }))
      const validUntil = new Date(Date.now() + Number(validDays) * 86400000).toISOString()
      const data = { clientId: selectedClient.id || undefined, validUntil, items, exchangeRate: exchangeRate > 0 ? exchangeRate : undefined, discount: discount || undefined }
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
      setDiscount(0)
      setLineDiscountProduct(null)
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

  async function loadQuotesList(pageOverride?: number) {
    const p = pageOverride ?? quoteListPage
    setQuoteListLoading(true)
    try {
      const data = await api.quotes.list(`limit=${QUOTE_PAGE_SIZE}&offset=${p * QUOTE_PAGE_SIZE}`)
      setQuotesList(Array.isArray(data) ? data : data.items)
      setQuoteListTotal(Array.isArray(data) ? data.length : data.total)
      setShowQuoteList(true)
    } catch {} finally { setQuoteListLoading(false) }
  }

  async function printQuoteById(id: number, currency: 'usd' | 'bs' | 'both') {
    const win = window.open('', '_blank')
    if (!win) { alert('Permite ventanas emergentes para imprimir'); return }
    win.document.open()
    win.document.write('<html><head><title>Cargando...</title></head><body><p style="font-family:sans-serif;padding:40px;text-align:center;color:#999">Cargando cotización...</p></body></html>')
    win.document.close()
    try {
      const data = await api.quotes.print(id)
      const rate = Number(data.quote.exchangeRate) || Number(exchangeRate) || 1
      const showUsd = currency === 'usd' || currency === 'both'
      const showBs = currency === 'bs' || currency === 'both'

      const hasLineDisc = data.quote.items.some((it: any) => Number(it.discount) > 0)
      const itemsHtml = data.quote.items.map((item: any) => {
        const pu = Number(item.unitPrice)
        const lineDisc = Number(item.discount) || 0
        const tot = Number(item.subtotal)
        let cols = `<td style="padding:4px 6px;font-size:10px">${item.product?.code || ''}</td><td style="padding:4px 6px;font-size:10px">${item.product?.name || ''}</td><td style="padding:4px 6px;text-align:center;font-size:10px">${item.quantity}</td>`
        if (showUsd) cols += `<td style="padding:4px 6px;text-align:right;font-size:10px">$${pu.toFixed(2)}</td>`
        if (showBs) cols += `<td style="padding:4px 6px;text-align:right;font-size:10px">Bs.${(pu * rate).toFixed(2)}</td>`
        if (hasLineDisc) {
          cols += `<td style="padding:4px 6px;text-align:right;font-size:10px;color:#d97706">${lineDisc > 0 ? `-${showUsd ? `$${lineDisc.toFixed(2)}` : `Bs.${(lineDisc * rate).toFixed(2)}`}` : ''}</td>`
        }
        if (showUsd) cols += `<td style="padding:4px 6px;text-align:right;font-size:10px">$${tot.toFixed(2)}</td>`
        if (showBs) cols += `<td style="padding:4px 6px;text-align:right;font-size:10px">Bs.${(tot * rate).toFixed(2)}</td>`
        return `<tr>${cols}</tr>`
      }).join('')

      let thPrecio = ''
      const lineDiscHeader = `<th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Descto.</th>`
      if (currency === 'both') thPrecio = `<th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">P/U $</th><th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">P/U Bs.</th>${hasLineDisc ? lineDiscHeader : ''}<th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Total $</th><th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Total Bs.</th>`
      else if (currency === 'usd') thPrecio = `<th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Precio</th>${hasLineDisc ? lineDiscHeader : ''}<th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Total</th>`
      else thPrecio = `<th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">P/U Bs.</th>${hasLineDisc ? lineDiscHeader : ''}<th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Total Bs.</th>`

      let totalsHtml = ''
      const s = Number(data.quote.subtotal)
      const i = Number(data.quote.ivaTotal)
      const d = Number(data.quote.discount) || 0
      const t = Number(data.quote.total)
      const discLine = (u: string, b: string) => `<p style="color:#d97706">Descuento: -${u}${b ? ` · -${b}` : ''}</p>`
      if (currency === 'both') {
        totalsHtml = `<p>Subtotal: $${s.toFixed(2)} · Bs.${(s * rate).toFixed(2)}</p><p>IVA: $${i.toFixed(2)} · Bs.${(i * rate).toFixed(2)}</p>${d > 0 ? discLine(`$${d.toFixed(2)}`, `Bs.${(d * rate).toFixed(2)}`) : ''}<p class="grand">Total: $${t.toFixed(2)} · Bs.${(t * rate).toFixed(2)}</p>`
      } else if (currency === 'usd') {
        totalsHtml = `<p>Subtotal: $${s.toFixed(2)}</p><p>IVA: $${i.toFixed(2)}</p>${d > 0 ? discLine(`$${d.toFixed(2)}`, '') : ''}<p class="grand">Total: $${t.toFixed(2)}</p>`
      } else {
        totalsHtml = `<p>Subtotal: Bs.${(s * rate).toFixed(2)}</p><p>IVA: Bs.${(i * rate).toFixed(2)}</p>${d > 0 ? discLine(`Bs.${(d * rate).toFixed(2)}`, '') : ''}<p class="grand">Total: Bs.${(t * rate).toFixed(2)}</p>`
      }

      win.document.open()
      win.document.write(`<!DOCTYPE html><html><head><title>${data.quote.number}</title><style>
        body{font-family:Arial,sans-serif;padding:30px;font-size:12px;color:#333}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th,td{border:1px solid #ccc;padding:6px;text-align:left}
        th{background:#1E40AF;color:#fff;font-size:10px}
        hr{border:none;border-top:2px solid #333}
        .header{text-align:center;margin-bottom:20px}
        .header h1{font-size:18px;margin:0 0 4px}
        .header p{margin:2px 0;color:#555;font-size:11px}
        .info{display:flex;justify-content:space-between;margin:15px 0;font-size:11px}
        .totals{text-align:right;margin-top:15px;font-size:12px}
        .totals p{margin:3px 0}
        .totals .grand{font-size:16px;font-weight:bold}
        .footer{font-size:10px;color:#888;text-align:center;margin-top:20px}
        @media print{body{padding:15px}}
        @page{size:letter;margin:15mm}
      </style></head><body>
        <div class="header">
          <h1>${data.company.name}</h1>
          <p>RIF: ${data.company.rif} · ${data.company.address} · ${data.company.phone}</p>
          <hr>
          <h2 style="margin:10px 0 0">COTIZACIÓN</h2>
          <p style="font-size:14px;font-weight:bold;color:#1E40AF;margin:2px 0">${data.quote.number}</p>
        </div>
        <div class="info">
          <div><strong>Cliente:</strong> ${data.quote.client?.name || 'Consumidor Final'}<br><strong>Documento:</strong> ${data.quote.client?.documentType || ''}-${data.quote.client?.documentNumber || '0'}</div>
          <div style="text-align:right"><strong>Fecha:</strong> ${new Date(data.quote.createdAt).toLocaleDateString('es')}<br><strong>Válido hasta:</strong> ${new Date(data.quote.validUntil).toLocaleDateString('es')}</div>
        </div>
        <table><thead><tr><th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Código</th><th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Producto</th><th style="padding:6px;font-size:10px;background:#1E40AF;color:#fff">Cant</th>${thPrecio}</tr></thead><tbody>${itemsHtml}</tbody></table>
        <div class="totals">${totalsHtml}</div>
        <hr>
        <p class="footer">Tasa BCV: Bs.${rate.toFixed(2)}/$</p>
        <p class="footer">Gracias por su preferencia</p>
      </body></html>`)
      win.document.close()
      win.print()
    } catch (err) {
      console.error('Error al imprimir:', err)
      win.document.open()
      win.document.write(`<html><head><title>Error</title></head><body><p style="font-family:sans-serif;padding:40px;color:red">Error al cargar la cotización: ${err}</p></body></html>`)
      win.document.close()
    }
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity - (i.discount || 0), 0)
  const ivaTotal = cart.reduce((s, i) => s + ((i.unitPrice * i.quantity - (i.discount || 0)) * i.ivaPercent) / 100, 0)
  const total = Math.max(0, subtotal + ivaTotal - discount)

  const cartItemCount = cart.reduce((c, i) => c + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity - (i.discount || 0), 0) + cart.reduce((s, i) => s + ((i.unitPrice * i.quantity - (i.discount || 0)) * i.ivaPercent) / 100, 0)
  const bs = (n: number) => exchangeRate > 0 ? `Bs.${(n * exchangeRate).toFixed(2)}` : ''
  const quoteBs = (q: any) => {
    const stored = q?.totalBs && Number(q.totalBs) > 0 ? Number(q.totalBs) : 0
    const v = stored || (exchangeRate > 0 ? Number(q.total) * exchangeRate : 0)
    return v > 0 ? `Bs.${v.toFixed(2)}` : ''
  }

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
          exchangeRate={exchangeRate}
          onUpdateRate={async () => {
            const auto = await api.exchangeRate.autoUpdate().catch(() => null)
            if (auto?.rate) setExchangeRate(Number(auto.rate))
          }}
          onLoadDraft={() => setShowLoadModal(true)}
        />

        {rateChecked && exchangeRate === 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-800 shrink-0">
            <span>Tasa BCV no disponible. Ingresa la tasa manualmente:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-amber-600">1$ = Bs.</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualRate || ''}
                onChange={(e) => setManualRate(Number(e.target.value))}
                onBlur={() => { if (manualRate > 0) { setExchangeRate(manualRate); api.exchangeRate.update(manualRate).catch(() => {}) } }}
                onKeyDown={(e) => { if (e.key === 'Enter' && manualRate > 0) { setExchangeRate(manualRate); api.exchangeRate.update(manualRate).catch(() => {}); (e.target as HTMLInputElement).blur() } }}
                className="w-24 border border-amber-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="46.50"
              />
            </div>
            <button
              onClick={async () => {
                const auto = await api.exchangeRate.autoUpdate().catch(() => null)
                if (auto?.rate) setExchangeRate(Number(auto.rate))
              }}
              className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 touch-manipulation"
            >
              Auto
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-1 bg-gray-50 border-b border-gray-200 shrink-0">
          <span className="text-xs text-gray-500">Cotizaciones</span>
          <button
            onClick={() => loadQuotesList()}
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
                    <TicketItem
                      key={item.productId}
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemove}
                      onLineDiscount={setLineDiscountProduct}
                      exchangeRate={exchangeRate}
                    />
                  ))
                )}
              </div>
              <div className="bg-white border-t border-gray-200">
                <button
                  onClick={() => setShowDiscount(true)}
                  disabled={cart.length === 0}
                  className={`w-full flex justify-between items-center py-2 px-3 text-sm font-medium border-b touch-manipulation disabled:opacity-40 ${
                    discount > 0 ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span>{discount > 0 ? 'Descuento aplicado ✓' : 'Aplicar descuento'}</span>
                  {discount > 0 && (
                    <span className="font-mono">-${discount.toFixed(2)}{exchangeRate > 0 && ` · -Bs.${(discount * exchangeRate).toFixed(2)}`}</span>
                  )}
                </button>
                <TicketFooter
                  subtotal={subtotal}
                  ivaTotal={ivaTotal}
                  discount={discount}
                  total={total}
                  onCheckout={handleCreateQuote}
                  itemCount={cartItemCount}
                  exchangeRate={exchangeRate}
                  buttonLabel={loading ? 'Generando...' : `Generar Cotización $${total.toFixed(2)}${exchangeRate > 0 ? ` (${bs(total)})` : ''}`}
                />
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
              exchangeRate={exchangeRate}
            />
          </div>
        </div>

        {cartItemCount > 0 && !showCartMobile && (
          <button
            onClick={() => setShowCartMobile(true)}
            className="md:hidden fixed bottom-20 right-4 z-[60] bg-blue-900 text-white rounded-full shadow-lg flex items-center gap-2 px-4 py-3 touch-manipulation"
          >
            <span className="bg-white text-blue-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartItemCount}</span>
            <span className="font-bold">${cartTotal.toFixed(2)}{exchangeRate > 0 && ` · ${bs(cartTotal)}`}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
          </button>
        )}

        {showCartMobile && (
          <div className="fixed inset-0 z-50 flex flex-col md:hidden" onClick={() => setShowCartMobile(false)}>
            <div className="flex-1 bg-black/50" onClick={() => setShowCartMobile(false)} />
            <div className="bg-white max-h-[70vh] flex flex-col rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={(e) => e.stopPropagation()}>
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
                  <TicketItem
                    key={item.productId}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemove}
                    onLineDiscount={setLineDiscountProduct}
                    exchangeRate={exchangeRate}
                  />
                ))}
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => setShowDiscount(true)}
                  disabled={cart.length === 0}
                  className={`w-full flex justify-between items-center py-2 px-4 text-sm font-medium border-b touch-manipulation disabled:opacity-40 ${
                    discount > 0 ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span>{discount > 0 ? 'Descuento aplicado ✓' : 'Aplicar descuento'}</span>
                  {discount > 0 && (
                    <span className="font-mono">-${discount.toFixed(2)}{exchangeRate > 0 && ` · -Bs.${(discount * exchangeRate).toFixed(2)}`}</span>
                  )}
                </button>
                <TicketFooter
                  subtotal={subtotal}
                  ivaTotal={ivaTotal}
                  discount={discount}
                  total={total}
                  onCheckout={() => { setShowCartMobile(false); handleCreateQuote() }}
                  itemCount={cartItemCount}
                  exchangeRate={exchangeRate}
                  buttonLabel={loading ? 'Generando...' : `Generar Cotización $${total.toFixed(2)}${exchangeRate > 0 ? ` (${bs(total)})` : ''}`}
                />
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
                      <span className="text-right shrink-0">
                        <span className="block text-sm font-mono font-semibold text-gray-800">${Number(p.price).toFixed(2)}</span>
                        {exchangeRate > 0 && <span className="block text-[10px] text-gray-400">Bs.{(Number(p.price) * exchangeRate).toFixed(2)}</span>}
                      </span>
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
                  onClick={() => setPrintModal({ id: successQuote.id })}
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
                      <span className="text-sm font-mono font-semibold text-gray-700 text-right">${Number(q.total).toFixed(2)}{quoteBs(q) && <span className="block text-xs text-gray-400">{quoteBs(q)}</span>}</span>
                      <button
                        onClick={() => setPrintModal({ id: q.id })}
                        className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-800 touch-manipulation"
                      >
                        Imprimir
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-200 p-2 shrink-0">
                <PaginationBar
                  page={quoteListPage}
                  total={quoteListTotal}
                  pageSize={QUOTE_PAGE_SIZE}
                  onPage={(p) => { setQuoteListPage(p); loadQuotesList(p) }}
                />
              </div>
            </div>
          </div>
        )}

        {printModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPrintModal(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Imprimir en:</h3>
              <div className="space-y-3">
                <button onClick={() => { const id = printModal.id; setPrintModal(null); printQuoteById(id, 'usd') }} className="w-full py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 touch-manipulation flex items-center justify-center gap-2">
                  <span>$</span> USD
                </button>
                <button onClick={() => { const id = printModal.id; setPrintModal(null); printQuoteById(id, 'bs') }} className="w-full py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 touch-manipulation flex items-center justify-center gap-2">
                  <span>Bs.</span> Bolívares
                </button>
                <button onClick={() => { const id = printModal.id; setPrintModal(null); printQuoteById(id, 'both') }} className="w-full py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-600 touch-manipulation flex items-center justify-center gap-2">
                  <span>$ + Bs.</span> Ambos
                </button>
              </div>
              <button onClick={() => setPrintModal(null)} className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-700 touch-manipulation">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <DiscountModal
          open={showDiscount}
          title="Descuento"
          exchangeRate={exchangeRate}
          baseAmount={subtotal + ivaTotal}
          initialValue={discount}
          onApply={(usd) => setDiscount(usd)}
          onClear={() => setDiscount(0)}
          onClose={() => setShowDiscount(false)}
        />

        {lineDiscountProduct !== null && (() => {
          const line = cart.find((i) => i.productId === lineDiscountProduct)
          if (!line) return null
          return (
            <DiscountModal
              open
              title={`Descuento: ${line.name}`}
              exchangeRate={exchangeRate}
              baseAmount={line.unitPrice * line.quantity}
              initialValue={line.discount || 0}
              onApply={(usd) => setCart((prev) => prev.map((i) => i.productId === lineDiscountProduct ? { ...i, discount: usd } : i))}
              onClear={() => setCart((prev) => prev.map((i) => i.productId === lineDiscountProduct ? { ...i, discount: 0 } : i))}
              onClose={() => setLineDiscountProduct(null)}
            />
          )
        })()}

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

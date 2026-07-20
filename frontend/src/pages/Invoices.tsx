import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { db } from '../services/db'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

interface Product {
  id: number; name: string; code: string; price: number; currency: string; ivaPercent: number; stock: number
}

interface Client {
  id: number; name: string; documentType: string; documentNumber: string
}

interface Invoice {
  id: number
  number: string
  client: { id: number; name: string; documentType?: string; documentNumber?: string }
  user?: { id: number; name: string }
  quote?: { id: number; number: string } | null
  currency: string
  exchangeRate: number | null
  totalBs: number | null
  subtotal: number
  ivaTotal: number
  total: number
  status: string
  paymentMethod: string
  createdAt: string
  cancelledAt?: string | null
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

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Invoice | null>(null)
  const [showPrint, setShowPrint] = useState<Invoice | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [items, setItems] = useState<{ productId: number; quantity: number }[]>([])
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [currency, setCurrency] = useState('usd')
  const [exchangeRate, setExchangeRate] = useState<number>(0)
  const [searchClient, setSearchClient] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [offlineCount, setOfflineCount] = useState(0)
  const isOnline = useOnlineStatus()
  const printRef = useRef<HTMLDivElement>(null)

  async function load() {
    const params = filterStatus ? `status=${filterStatus}` : ''
    try {
      const [inv, cli, prods, rate] = await Promise.all([
        api.invoices.list(params), api.clients.list(), api.products.list(), api.exchangeRate.get(),
      ])
      setInvoices(inv); setClients(cli); setProducts(prods); setExchangeRate(Number(rate.rate))
    } catch {
      const cachedProds = await db.products.toArray()
      const cachedClients = await db.clients.toArray()
      setProducts(cachedProds as any)
      setClients(cachedClients as any)
    }
    const offline = (await db.offlineInvoices.toArray()).filter((i) => !i.synced).length
    setOfflineCount(offline)
  }

  useEffect(() => { load() }, [filterStatus])

  async function createInvoice() {
    if (!selectedClient || items.length === 0) return
    const data = {
      clientId: selectedClient.id,
      paymentMethod,
      currency,
      exchangeRate: currency === 'usd' ? exchangeRate : null,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    }

    if (!isOnline) {
      const invoiceItems = items.map((item) => {
        const p = products.find((x) => x.id === item.productId)
        return {
          productId: item.productId,
          productName: p?.name || '',
          quantity: item.quantity,
          unitPrice: Number(p?.price || 0),
          ivaPercent: Number(p?.ivaPercent || 16),
          subtotal: Number(p?.price || 0) * item.quantity,
        }
      })
      const subtotal = invoiceItems.reduce((s, i) => s + i.subtotal, 0)
      const ivaTotal = invoiceItems.reduce((s, i) => s + i.subtotal * i.ivaPercent / 100, 0)
      await db.offlineInvoices.add({
        localId: crypto.randomUUID(),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        paymentMethod,
        currency,
        exchangeRate: currency === 'usd' ? exchangeRate : null,
        items: invoiceItems,
        subtotal,
        ivaTotal,
        total: subtotal + ivaTotal,
        createdAt: new Date().toISOString(),
        synced: false,
      })
      setShowForm(false); setSelectedClient(null); setItems([]); load()
      return
    }

    await api.invoices.create(data)
    setShowForm(false); setSelectedClient(null); setItems([]); load()
  }

  async function cancelInvoice(id: number) {
    if (!confirm('¿Anular esta factura? Se restaurará el stock.')) return
    await api.invoices.cancel(id)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Facturación</h2>
        <div className="flex items-center gap-2">
          {offlineCount > 0 && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
              {offlineCount} sin sincronizar
            </span>
          )}
          <button onClick={() => setShowForm(true)} className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800">+ Nueva</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'activa', 'anulada'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === s ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {s === '' ? 'Todas' : s === 'activa' ? 'Activas' : 'Anuladas'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Nueva Factura</h3>

            <label className="block text-sm font-medium mb-1">Cliente</label>
            {selectedClient ? (
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-2">
                <span>{selectedClient.name}</span>
                <button onClick={() => setSelectedClient(null)} className="text-red-500 text-sm">Cambiar</button>
              </div>
            ) : (
              <div className="relative mb-2">
                <input value={searchClient} onChange={(e) => setSearchClient(e.target.value)} placeholder="Buscar cliente..."
                  className="w-full px-3 py-2 border rounded-lg" onFocus={() => setShowClientPicker(true)} />
                {showClientPicker && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto z-10 shadow">
                    {clients.filter((c) => c.name.toLowerCase().includes(searchClient.toLowerCase())).map((c) => (
                      <button key={c.id} onClick={() => { setSelectedClient(c); setShowClientPicker(false); setSearchClient('') }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm">{c.name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-3">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="mixto">Mixto</option>
            </select>

            <div className="flex gap-2 mb-3">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="px-3 py-2 border rounded-lg">
                <option value="usd">$ USD</option>
                <option value="bs">Bs</option>
              </select>
              {currency === 'usd' && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Tasa BCV:</span>
                  <input type="number" step="0.01" value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-24 px-2 py-2 border rounded-lg text-sm" />
                </div>
              )}
            </div>

            <label className="block text-sm font-medium mb-1">Productos</label>
            <div className="space-y-2 mb-3">
              {items.map((item) => {
                const p = products.find((x) => x.id === item.productId)
                if (!p) return null
                const lowStock = item.quantity > p.stock
                return (
                  <div key={item.productId} className={`flex items-center gap-2 p-2 rounded-lg ${lowStock ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                    <span className="flex-1 text-sm">{p.name}</span>
                    <input type="number" value={item.quantity} min="1" max={p.stock}
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
                    <span>{p.name} {p.stock <= 0 && <span className="text-red-500">(sin stock)</span>}</span>
                    <span className="text-gray-500">${Number(p.price).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
            <input value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} placeholder="Buscar y agregar productos..."
              className="w-full px-3 py-2 border rounded-lg mb-3" onFocus={() => setShowProductPicker(true)}
              onBlur={() => setTimeout(() => setShowProductPicker(false), 200)} />

            <div className="border-t pt-3 text-right space-y-1">
              <p className="text-sm text-gray-600">Subtotal: <span className="font-mono">{currency === 'usd' ? '$' : 'Bs.'}{(calcSubtotal()).toFixed(2)}</span></p>
              <p className="text-sm text-gray-600">IVA: <span className="font-mono">{currency === 'usd' ? '$' : 'Bs.'}{calcIva().toFixed(2)}</span></p>
              <p className="text-lg font-bold">Total: <span className="font-mono">{currency === 'usd' ? '$' : 'Bs.'}{(calcSubtotal() + calcIva()).toFixed(2)}</span></p>
              {currency === 'usd' && exchangeRate > 0 && (
                <p className="text-sm text-gray-500">Bs. {((calcSubtotal() + calcIva()) * exchangeRate).toFixed(2)}</p>
              )}
            </div>

            <div className="flex gap-2 pt-3">
              <button onClick={createInvoice} disabled={!selectedClient || items.length === 0}
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-800">Confirmar Factura</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancelar</button>
            </div>
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
              <span className={`text-xs px-2 py-0.5 rounded-full ${showDetail.status === 'activa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {showDetail.status}
              </span>
            </div>
            <p className="text-sm mb-1"><strong>Cliente:</strong> {showDetail.client.name}</p>
            <p className="text-sm mb-1"><strong>Pago:</strong> {showDetail.paymentMethod}</p>
            <p className="text-sm mb-1"><strong>Moneda:</strong> {showDetail.currency === 'usd' ? '$' : 'Bs.'}</p>
            {showDetail.quote && <p className="text-sm mb-3"><strong>Cotización:</strong> {showDetail.quote.number}</p>}
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
              <p className="text-sm">Subtotal: {showDetail.currency === 'usd' ? '$' : 'Bs.'}{Number(showDetail.subtotal).toFixed(2)}</p>
              <p className="text-sm">IVA: {showDetail.currency === 'usd' ? '$' : 'Bs.'}{Number(showDetail.ivaTotal).toFixed(2)}</p>
              <p className="text-lg font-bold">Total: {showDetail.currency === 'usd' ? '$' : 'Bs.'}{Number(showDetail.total).toFixed(2)}</p>
              {showDetail.totalBs && <p className="text-sm text-gray-500">Bs. {Number(showDetail.totalBs).toFixed(2)}</p>}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowPrint(showDetail); setShowDetail(null) }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Imprimir</button>
              {showDetail.status === 'activa' && (
                <button onClick={() => cancelInvoice(showDetail.id)} className="flex-1 bg-red-600 text-white py-2 rounded-lg">Anular</button>
              )}
              <button onClick={() => setShowDetail(null)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showPrint && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto p-4">
          <div className="max-w-sm mx-auto" ref={printRef}>
            <div className="text-center mb-4">
              <h2 className="font-bold text-lg">EFI- POS</h2>
              <p className="text-xs">RIF: J-12345678-9</p>
              <p className="text-xs">Av. Principal, Local 1</p>
              <p className="text-xs">Tel: 0412-1234567</p>
            </div>
            <div className="border-t border-b py-2 mb-2 text-center">
              <p className="font-bold">{showPrint.number}</p>
              <p className="text-xs">{new Date(showPrint.createdAt).toLocaleString()}</p>
            </div>
            <p className="text-xs mb-2">Cliente: {showPrint.client.name}</p>
            <table className="w-full text-xs mb-2">
              <thead><tr className="border-b"><th className="text-left">Prod</th><th className="text-right">Cant</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {showPrint.items.map((item, i) => (
                  <tr key={i}>
                    <td className="truncate max-w-[150px]">{item.product?.name}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right font-mono">${Number(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t pt-1 text-xs text-right space-y-0.5">
              <p>Subtotal: {showPrint.currency === 'usd' ? '$' : 'Bs.'}{Number(showPrint.subtotal).toFixed(2)}</p>
              <p>IVA: {showPrint.currency === 'usd' ? '$' : 'Bs.'}{Number(showPrint.ivaTotal).toFixed(2)}</p>
              <p className="font-bold text-sm">Total: {showPrint.currency === 'usd' ? '$' : 'Bs.'}{Number(showPrint.total).toFixed(2)}</p>
              {showPrint.totalBs && <p>Bs. {Number(showPrint.totalBs).toFixed(2)}</p>}
            </div>
            <p className="text-xs text-center mt-4">Forma de pago: {showPrint.paymentMethod}</p>
            <p className="text-xs text-center mt-2">¡Gracias por su compra!</p>
          </div>
          <div className="flex gap-2 mt-6 max-w-sm mx-auto">
            <button onClick={() => window.print()} className="flex-1 bg-blue-900 text-white py-2 rounded-lg">Imprimir</button>
            <button onClick={() => setShowPrint(null)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cerrar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {invoices.map((inv) => (
          <div key={inv.id} onClick={() => setShowDetail(inv)} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
            <div>
              <p className="font-semibold text-gray-800">{inv.number}
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${inv.status === 'activa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {inv.status}
                </span>
              </p>
              <p className="text-sm text-gray-500">{inv.client.name} · {new Date(inv.createdAt).toLocaleDateString()}</p>
            </div>
            <p className="font-mono font-semibold">{inv.currency === 'usd' ? '$' : 'Bs.'}{Number(inv.total).toFixed(2)}</p>
          </div>
        ))}
        {invoices.length === 0 && <p className="text-gray-400 text-center py-8">No hay facturas</p>}
      </div>
    </div>
  )
}

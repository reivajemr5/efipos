import { useState, useEffect } from 'react'
import { api } from '../services/api'
import ProductFormModal from '../components/ProductFormModal'
import SearchPicker from '../components/SearchPicker'
import ClientFormModal from '../components/ClientFormModal'

interface Product {
  id: number; name: string; code: string; price: number; ivaPercent: number; stock: number
}

interface Client {
  id: number; name: string; documentType: string; documentNumber: string
}

interface QuoteItem {
  id?: number
  productId: number
  product?: { id: number; name: string; code: string }
  quantity: number
  unitPrice: number
  ivaPercent: number
  subtotal: number
}

interface Quote {
  id: number
  number: string
  client: { id: number; name: string }
  subtotal: number
  ivaTotal: number
  total: number
  status: string
  validUntil: string
  createdAt: string
  items: QuoteItem[]
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Quote | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [items, setItems] = useState<{ productId: number; quantity: number }[]>([])
  const [validDays, setValidDays] = useState('30')
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [showNewProductForm, setShowNewProductForm] = useState(false)

  async function load() {
    const [q, c, p] = await Promise.all([api.quotes.list(), api.clients.list(), api.products.list()])
    setQuotes(q); setClients(c); setProducts(p)
  }

  useEffect(() => { load() }, [])

  function onClientCreated(client: any) {
    setClients((prev) => [...prev, client])
    setSelectedClient(client)
    setShowNewClientForm(false)
  }

  async function createQuote() {
    if (!selectedClient || items.length === 0) return
    const validUntil = new Date(Date.now() + Number(validDays) * 86400000).toISOString()
    await api.quotes.create({ clientId: selectedClient.id, validUntil, items })
    setShowForm(false); setSelectedClient(null); setItems([]); load()
  }

  async function convert(q: Quote) {
    if (!confirm(`¿Convertir ${q.number} en factura?`)) return
    await api.quotes.convert(q.id)
    load()
    setShowDetail(null)
  }

  async function removeQuote(id: number) {
    if (!confirm('¿Eliminar esta cotización?')) return
    await api.quotes.delete(id)
    load()
  }

  function onProductCreated(product: any) {
    setProducts((prev) => [...prev, product])
    setShowNewProductForm(false)
    addItem(product.id)
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
      activa: 'bg-green-100 text-green-800',
      convertida: 'bg-blue-100 text-blue-800',
      vencida: 'bg-gray-100 text-gray-500',
    }
    return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[s] || ''}`}>{s}</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Cotizaciones</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800">+ Nueva</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Nueva Cotización</h3>

            <label className="block text-sm font-medium mb-1">Cliente</label>
            {selectedClient ? (
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-2">
                <span>{selectedClient.name} ({selectedClient.documentType}-{selectedClient.documentNumber})</span>
                <button onClick={() => setSelectedClient(null)} className="text-red-500 text-sm">Cambiar</button>
              </div>
            ) : (
              <SearchPicker
                items={clients}
                onSelect={setSelectedClient}
                filter={(c, q) => c.name.toLowerCase().includes(q) || c.documentNumber.includes(q)}
                renderItem={(c) => <span>{c.name} - {c.documentType}{c.documentNumber}</span>}
                keyExtractor={(c) => c.id}
                placeholder="Buscar cliente (nombre o cédula)..."
                absolute
                className="mb-2"
              />
            )}

            <label className="block text-sm font-medium mb-1">Válida por</label>
            <input type="number" value={validDays} onChange={(e) => setValidDays(e.target.value)} className="w-20 px-3 py-2 border rounded-lg mb-3" /> días

            <label className="block text-sm font-medium mb-1">Productos</label>
            <div className="space-y-2 mb-3">
              {items.map((item) => {
                const p = products.find((x) => x.id === item.productId)
                if (!p) return null
                return (
                  <div key={item.productId} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
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

            <SearchPicker
              items={products}
              onSelect={(p) => addItem(p.id)}
              filter={(p, q) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)}
              renderItem={(p) => (
                <span className="flex justify-between w-full">
                  <span>{p.code} - {p.name}</span>
                  <span className="text-gray-500">${Number(p.price).toFixed(2)} (stock: {p.stock})</span>
                </span>
              )}
              keyExtractor={(p) => p.id}
              placeholder="Buscar por nombre o código..."
              onCreateNew={() => setShowNewProductForm(true)}
              createNewLabel="+ Nuevo producto"
              className="mb-3"
            />

            <div className="border-t pt-3 text-right space-y-1">
              <p className="text-sm text-gray-600">Subtotal: <span className="font-mono">${calcSubtotal().toFixed(2)}</span></p>
              <p className="text-sm text-gray-600">IVA: <span className="font-mono">${calcIva().toFixed(2)}</span></p>
              <p className="text-lg font-bold">Total: <span className="font-mono">${(calcSubtotal() + calcIva()).toFixed(2)}</span></p>
            </div>

            <div className="flex gap-2 pt-3">
              <button onClick={createQuote} disabled={!selectedClient || items.length === 0}
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-800">Generar Cotización</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <ClientFormModal open={showNewClientForm} onClose={() => setShowNewClientForm(false)}
        onSaved={onClientCreated} />

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDetail(null)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{showDetail.number}</h3>
                <p className="text-sm text-gray-500">{new Date(showDetail.createdAt).toLocaleDateString()}</p>
              </div>
              {statusBadge(showDetail.status)}
            </div>
            <p className="text-sm mb-3"><strong>Cliente:</strong> {showDetail.client.name}</p>
            <p className="text-sm mb-3"><strong>Válida hasta:</strong> {new Date(showDetail.validUntil).toLocaleDateString()}</p>
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
              {showDetail.status === 'activa' && (
                <button onClick={() => convert(showDetail)} className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-600">Convertir a Factura</button>
              )}
              <button onClick={() => { window.print() }} className="flex-1 bg-gray-200 py-2 rounded-lg">Imprimir</button>
              <button onClick={() => setShowDetail(null)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {quotes.map((q) => (
          <div key={q.id} onClick={() => setShowDetail(q)} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
            <div>
              <p className="font-semibold text-gray-800">{q.number} {statusBadge(q.status)}</p>
              <p className="text-sm text-gray-500">{q.client.name} · {new Date(q.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold">${Number(q.total).toFixed(2)}</p>
              <button onClick={(e) => { e.stopPropagation(); removeQuote(q.id) }} className="text-red-500 text-xs hover:underline">Eliminar</button>
            </div>
          </div>
        ))}
        {quotes.length === 0 && <p className="text-gray-400 text-center py-8">No hay cotizaciones</p>}
      </div>

      <ProductFormModal open={showNewProductForm} onClose={() => setShowNewProductForm(false)}
        onSaved={onProductCreated} />
    </div>
  )
}

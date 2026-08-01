import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface LoadItem {
  productId: number
  quantity: number
  unitPrice: number
  ivaPercent: number
  name?: string
  discount?: number
}

interface DraftLike {
  id: number
  number: string
  createdAt: string
  client: { id: number; name: string; documentType: string; documentNumber: string } | null
  clientId: number
  items: LoadItem[]
  total: string
  exchangeRate?: string | number | null
  discount?: string | number | null
}

interface LoadModalProps {
  open: boolean
  onClose: () => void
  onLoad: (source: { type: 'draft' | 'quote'; id: number; items: any[]; client: any; exchangeRate?: number; discount?: number }) => void
}

export default function LoadModal({ open, onClose, onLoad }: LoadModalProps) {
  const [tab, setTab] = useState<'drafts' | 'quotes'>('drafts')
  const [drafts, setDrafts] = useState<DraftLike[]>([])
  const [quotes, setQuotes] = useState<DraftLike[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmData, setConfirmData] = useState<{
    type: 'draft' | 'quote'
    id: number
    number: string
    items: any[]
    client: any
    priceChanges: { name: string; oldPrice: number; newPrice: number }[]
    removedItems: string[]
    exchangeRate?: number
    discount?: number
  } | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    if (!open) { setSearch(''); setConfirmData(null); return }
    loadData()
  }, [open, tab])

  async function loadData() {
    setLoading(true)
    try {
      if (tab === 'drafts') {
        const d = await api.invoices.drafts(search || undefined)
        setDrafts(d)
      } else {
        const q = await api.quotes.list(`status=activa${search ? `&q=${encodeURIComponent(search)}` : ''}`)
        setQuotes(q)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => loadData(), 300)
    return () => clearTimeout(timer)
  }, [search])

  async function handleSelect(source: DraftLike, type: 'draft' | 'quote') {
    setLoadingProducts(true)
    try {
      const currentProducts: any[] = await api.products.list()
      const productMap = new Map(currentProducts.map((p: any) => [p.id, p]))

      const priceChanges: { name: string; oldPrice: number; newPrice: number }[] = []
      const removedItems: string[] = []
      const finalItems: any[] = []

      for (const item of source.items) {
        const current = productMap.get(item.productId)
        if (!current) {
          removedItems.push(item.name || `Producto #${item.productId}`)
          continue
        }
        if (current.stock <= 0) {
          removedItems.push(`${current.name} (stock: ${current.stock})`)
          continue
        }
        const oldPrice = Number(item.unitPrice)
        const newPrice = Number(current.price)
        if (Math.abs(oldPrice - newPrice) > 0.01) {
          priceChanges.push({ name: current.name, oldPrice, newPrice })
        }
        finalItems.push({
          productId: current.id,
          name: current.name,
          quantity: item.quantity,
          unitPrice: newPrice,
          ivaPercent: Number(current.ivaPercent),
          discount: item.discount ? Number(item.discount) : 0,
        })
      }

      const hasChanges = priceChanges.length > 0 || removedItems.length > 0
      const exchangeRate = source.exchangeRate ? Number(source.exchangeRate) : undefined
      const discount = source.discount ? Number(source.discount) : undefined

      if (hasChanges) {
        setConfirmData({
          type,
          id: source.id,
          number: source.number,
          items: finalItems,
          client: source.client,
          priceChanges,
          removedItems,
          exchangeRate,
          discount,
        })
      } else {
        onLoad({
          type,
          id: source.id,
          items: finalItems,
          client: source.client,
          exchangeRate,
          discount,
        })
      }
    } catch { /* ignore */ } finally { setLoadingProducts(false) }
  }

  function handleConfirm() {
    if (!confirmData) return
    onLoad({
      type: confirmData.type,
      id: confirmData.id,
      items: confirmData.items,
      client: confirmData.client,
      exchangeRate: confirmData.exchangeRate,
      discount: confirmData.discount,
    })
    setConfirmData(null)
  }

  const items = tab === 'drafts' ? drafts : quotes

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
            <h3 className="text-lg font-bold text-gray-800">Cargar</h3>
            <button onClick={onClose} className="text-gray-400 p-1 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex border-b border-gray-200 shrink-0">
            <button
              onClick={() => setTab('drafts')}
              className={`flex-1 py-3 text-sm font-medium text-center ${tab === 'drafts' ? 'text-blue-900 border-b-2 border-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Facturas Guardadas
            </button>
            <button
              onClick={() => setTab('quotes')}
              className={`flex-1 py-3 text-sm font-medium text-center ${tab === 'quotes' ? 'text-blue-900 border-b-2 border-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Presupuestos
            </button>
          </div>

          <div className="px-4 py-2 shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadData() } }}
              placeholder="Buscar por nombre, documento o número..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {tab === 'drafts' ? 'No hay facturas guardadas' : 'No hay presupuestos activos'}
              </div>
            ) : items.map((item) => {
              const d = new Date(item.createdAt)
              const dateStr = d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              const itemCount = item.items.reduce((c, i) => c + i.quantity, 0)
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item as any, tab === 'drafts' ? 'draft' : 'quote')}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all bg-white"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-800">{item.number}</span>
                    <span className="text-xs text-gray-400">{dateStr}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.client ? (
                      <span>{item.client.name} ({item.client.documentType}-{item.client.documentNumber})</span>
                    ) : (
                      <span className="text-gray-400">Sin cliente</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{itemCount} items</span>
                    <span className="font-bold text-gray-800">${Number(item.total).toFixed(2)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {confirmData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setConfirmData(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Cargar {confirmData.number}</h3>
            <p className="text-sm text-gray-500 mb-4">Guardado el {new Date(items.find((i: any) => i.id === confirmData.id)?.createdAt || '').toLocaleDateString('es')}</p>

            {confirmData.priceChanges.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-amber-700 mb-2">⚠️ Productos con precio actualizado:</p>
                <div className="space-y-1">
                  {confirmData.priceChanges.map((pc, i) => (
                    <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
                      {pc.name}: <span className="line-through">${pc.oldPrice.toFixed(2)}</span> → <span className="font-semibold">${pc.newPrice.toFixed(2)}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {confirmData.removedItems.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-red-700 mb-2">❌ Productos sin stock (serán eliminados):</p>
                <div className="space-y-1">
                  {confirmData.removedItems.map((name, i) => (
                    <p key={i} className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-1.5">{name}</p>
                  ))}
                </div>
              </div>
            )}

            {confirmData.priceChanges.length === 0 && confirmData.removedItems.length === 0 && (
              <p className="text-sm text-green-700 mb-4 bg-green-50 rounded-lg px-3 py-2">✓ Todos los productos mantienen sus precios y stock.</p>
            )}

            <div className="text-xs text-gray-500 mb-4">
              Se usarán los precios actuales de los productos y la tasa del día.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmData(null)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 bg-blue-900 text-white rounded-lg font-bold touch-manipulation"
              >
                Cargar con cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingProducts && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl p-4 shadow-lg flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600">Verificando productos...</span>
          </div>
        </div>
      )}
    </>
  )
}

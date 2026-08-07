import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface OrderItem { productId: number; quantity: number; unitPrice: number }
interface Order {
  id: number
  number: string
  createdAt: string
  supplier: { id: number; name: string }
  items: OrderItem[]
}

interface LoadPurchaseOrderModalProps {
  open: boolean
  onClose: () => void
  supplierId?: number | null
  onLoad: (order: Order) => void
}

export default function LoadPurchaseOrderModal({ open, onClose, supplierId, onLoad }: LoadPurchaseOrderModalProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.purchases.list('status=pedido')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items
        const mine = supplierId ? list.filter((o: Order) => o.supplier?.id === supplierId) : list
        setOrders(Array.isArray(mine) ? mine : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, supplierId])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-bold text-gray-800">Cargar Pedido</h3>
          <button onClick={onClose} className="text-gray-400 p-1 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100 shrink-0">
          Pedidos pendientes del proveedor
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay pedidos pendientes para este proveedor</div>
          ) : orders.map((order) => {
            const itemCount = order.items.reduce((c, i) => c + i.quantity, 0)
            return (
              <button
                key={order.id}
                onClick={() => onLoad(order)}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all bg-white"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800">{order.number}</span>
                  <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es')}</span>
                </div>
                <div className="text-sm text-gray-600">{order.supplier.name}</div>
                <div className="text-xs text-gray-400 mt-1">{itemCount} unidades</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
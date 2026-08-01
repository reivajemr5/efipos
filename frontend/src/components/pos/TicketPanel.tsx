import TicketItem from './TicketItem'
import TicketFooter from './TicketFooter'
import QuickActions from './QuickActions'

export interface CartItem {
  productId: number
  name: string
  quantity: number
  unitPrice: number
  ivaPercent: number
  discount?: number
}

interface TicketPanelProps {
  items: CartItem[]
  discount?: number
  onUpdateQuantity: (productId: number, qty: number) => void
  onRemove: (productId: number) => void
  onLineDiscount: (productId: number) => void
  onCheckout: () => void
  onCancel: () => void
  onSaveDraft: () => void
  onDiscount: () => void
  onNotes: () => void
  exchangeRate: number
}

export default function TicketPanel({
  items, discount = 0, onUpdateQuantity, onRemove,
  onLineDiscount, onCheckout, onCancel, onSaveDraft, onDiscount, onNotes, exchangeRate,
}: TicketPanelProps) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity - (i.discount || 0), 0)
  const ivaTotal = items.reduce((s, i) => s + ((i.unitPrice * i.quantity - (i.discount || 0)) * i.ivaPercent) / 100, 0)
  const total = Math.max(0, subtotal + ivaTotal - discount)
  const itemCount = items.reduce((c, i) => c + i.quantity, 0)
  const hasDiscount = discount > 0

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border-r border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">Ticket de Venta</h2>
        <p className="text-xs text-gray-400">{itemCount} items</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm px-4 text-center">
            Selecciona productos del catálogo para añadirlos al ticket
          </div>
        ) : (
          items.map((item) => (
            <TicketItem
              key={item.productId}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
              onLineDiscount={onLineDiscount}
              exchangeRate={exchangeRate}
            />
          ))
        )}
      </div>

      <div className="shrink-0">
        <TicketFooter
          subtotal={subtotal}
          ivaTotal={ivaTotal}
          discount={discount}
          total={total}
          onCheckout={onCheckout}
          itemCount={itemCount}
          exchangeRate={exchangeRate}
        />
      </div>

      <div className="shrink-0">
        <QuickActions
          onCancel={onCancel}
          onSaveDraft={onSaveDraft}
          onDiscount={onDiscount}
          onNotes={onNotes}
          itemCount={itemCount}
          hasDiscount={hasDiscount}
        />
      </div>
    </div>
  )
}

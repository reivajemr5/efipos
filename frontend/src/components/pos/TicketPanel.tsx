import TicketItem from './TicketItem'
import TicketFooter from './TicketFooter'
import QuickActions from './QuickActions'

export interface CartItem {
  productId: number
  name: string
  quantity: number
  unitPrice: number
  ivaPercent: number
}

interface TicketPanelProps {
  items: CartItem[]
  currency: string
  onUpdateQuantity: (productId: number, qty: number) => void
  onRemove: (productId: number) => void
  onCheckout: () => void
  onCancel: () => void
  onSaveDraft: () => void
  onDiscount: () => void
  onNotes: () => void
}

export default function TicketPanel({
  items, currency, onUpdateQuantity, onRemove,
  onCheckout, onCancel, onSaveDraft, onDiscount, onNotes,
}: TicketPanelProps) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const ivaTotal = items.reduce((s, i) => s + (i.unitPrice * i.quantity * i.ivaPercent) / 100, 0)
  const total = subtotal + ivaTotal
  const itemCount = items.reduce((c, i) => c + i.quantity, 0)

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">Ticket de Venta</h2>
        <p className="text-xs text-gray-400">{itemCount} items</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm px-4 text-center">
            Selecciona productos del catálogo para añadirlos al ticket
          </div>
        ) : (
          items.map((item) => (
            <TicketItem
              key={item.productId}
              item={item}
              currency={currency}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      <TicketFooter
        subtotal={subtotal}
        ivaTotal={ivaTotal}
        total={total}
        currency={currency}
        onCheckout={onCheckout}
        itemCount={itemCount}
      />

      <QuickActions
        onCancel={onCancel}
        onSaveDraft={onSaveDraft}
        onDiscount={onDiscount}
        onNotes={onNotes}
        itemCount={itemCount}
      />
    </div>
  )
}

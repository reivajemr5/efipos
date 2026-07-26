interface CartItem {
  productId: number
  name: string
  quantity: number
  unitPrice: number
  ivaPercent: number
}

interface TicketItemProps {
  item: CartItem
  onUpdateQuantity: (productId: number, qty: number) => void
  onRemove: (productId: number) => void
  exchangeRate: number
}

export default function TicketItem({ item, onUpdateQuantity, onRemove, exchangeRate }: TicketItemProps) {
  const total = item.unitPrice * item.quantity
  const totalBs = exchangeRate > 0 ? total * exchangeRate : 0

  return (
    <div className="flex items-center gap-2 py-2 px-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
        <p className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} {exchangeRate > 0 && `· Bs.{totalBs.toFixed(2)}`}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold text-lg hover:bg-gray-200 touch-manipulation"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
        <button
          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold text-lg hover:bg-gray-200 touch-manipulation"
        >
          +
        </button>
      </div>

      <div className="text-right min-w-[65px]">
        <p className="text-sm font-semibold text-gray-800">${total.toFixed(2)}</p>
        {exchangeRate > 0 && <p className="text-[10px] text-gray-500">Bs.{totalBs.toFixed(2)}</p>}
      </div>

      <button
        onClick={() => onRemove(item.productId)}
        className="p-1.5 text-gray-400 hover:text-red-500 touch-manipulation"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  )
}

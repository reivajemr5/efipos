interface TicketFooterProps {
  subtotal: number
  ivaTotal: number
  discount: number
  total: number
  currency: string
  onCheckout: () => void
  itemCount: number
}

export default function TicketFooter({ subtotal, ivaTotal, discount, total, currency, onCheckout, itemCount }: TicketFooterProps) {
  const symbol = currency === 'bs' ? 'Bs.' : '$'

  return (
    <div className="bg-white border-t border-gray-200">
      <div className="px-4 py-3 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal ({itemCount} items)</span>
          <span>{symbol} {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>IVA</span>
          <span>{symbol} {ivaTotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>Descuento</span>
            <span>-{symbol} {discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-1">
          <span>Total</span>
          <span>{symbol} {total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        disabled={itemCount === 0}
        className="w-full py-4 bg-green-600 text-white text-lg font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
      >
        Cobrar {symbol} {total.toFixed(2)}
      </button>
    </div>
  )
}

interface TicketFooterProps {
  subtotal: number
  ivaTotal: number
  discount: number
  total: number
  onCheckout: () => void
  itemCount: number
  exchangeRate: number
}

export default function TicketFooter({ subtotal, ivaTotal, discount, total, onCheckout, itemCount, exchangeRate }: TicketFooterProps) {
  const totBs = exchangeRate > 0 ? total * exchangeRate : 0
  const subBs = exchangeRate > 0 ? subtotal * exchangeRate : 0
  const ivaBs = exchangeRate > 0 ? ivaTotal * exchangeRate : 0
  const disBs = exchangeRate > 0 ? discount * exchangeRate : 0

  return (
    <div className="bg-white border-t border-gray-200">
      <div className="px-4 py-3 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal ({itemCount} items)</span>
          <span className="text-right">
            <span className="font-medium">${subtotal.toFixed(2)}</span>
            {exchangeRate > 0 && <span className="ml-2 text-gray-400 text-xs">Bs.{subBs.toFixed(2)}</span>}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>IVA</span>
          <span className="text-right">
            <span className="font-medium">${ivaTotal.toFixed(2)}</span>
            {exchangeRate > 0 && <span className="ml-2 text-gray-400 text-xs">Bs.{ivaBs.toFixed(2)}</span>}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>Descuento</span>
            <span className="text-right">
              <span className="font-medium">-${discount.toFixed(2)}</span>
              {exchangeRate > 0 && <span className="ml-2 text-xs">Bs.{disBs.toFixed(2)}</span>}
            </span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-1">
          <span>Total</span>
          <span className="text-right">
            <span className="font-medium">${total.toFixed(2)}</span>
            {exchangeRate > 0 && <span className="ml-2 text-gray-500 text-sm">Bs.{totBs.toFixed(2)}</span>}
          </span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        disabled={itemCount === 0}
        className="w-full py-4 bg-green-600 text-white text-lg font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
      >
        {exchangeRate > 0
          ? `Cobrar Bs.${totBs.toFixed(2)} ($${total.toFixed(2)})`
          : `Cobrar $${total.toFixed(2)}`
        }
      </button>
    </div>
  )
}

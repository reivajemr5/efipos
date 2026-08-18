import { useState } from 'react'
import { QTY_STEP } from '../../utils/config'

interface CartItem {
  productId: number
  name: string
  quantity: number
  unitPrice: number
  ivaPercent: number
  discount?: number
  allowDecimal?: boolean
  allowPriceOverride?: boolean
}

interface TicketItemProps {
  item: CartItem
  onUpdateQuantity: (productId: number, qty: number) => void
  onUpdatePrice?: (productId: number, price: number) => void
  onRemove: (productId: number) => void
  onLineDiscount: (productId: number) => void
  exchangeRate: number
}

export default function TicketItem({ item, onUpdateQuantity, onUpdatePrice, onRemove, onLineDiscount, exchangeRate }: TicketItemProps) {
  const lineDisc = item.discount || 0
  const total = Math.max(0, item.unitPrice * item.quantity - lineDisc)
  const totalBs = exchangeRate > 0 ? total * exchangeRate : 0
  const [qtyDraft, setQtyDraft] = useState<string | null>(null)
  const [priceDraft, setPriceDraft] = useState<string | null>(null)
  const editingPrice = priceDraft !== null

  function commitQty() {
    if (qtyDraft === null) return
    const val = Number(qtyDraft)
    setQtyDraft(null)
    if (!Number.isFinite(val) || val <= 0) { onRemove(item.productId); return }
    onUpdateQuantity(item.productId, val)
  }

  function commitPrice() {
    if (priceDraft === null) return
    const val = Number(priceDraft)
    setPriceDraft(null)
    if (!Number.isFinite(val) || val < 0) return
    onUpdatePrice?.(item.productId, Math.round(val * 100) / 100)
  }

  const step = item.allowDecimal ? QTY_STEP : 1

  return (
    <div className="flex items-center gap-2 py-2 px-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
        {editingPrice && item.allowPriceOverride ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            className="w-24 text-xs border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        ) : (
          <button
            onClick={() => { if (item.allowPriceOverride) setPriceDraft(String(item.unitPrice)) }}
            disabled={!item.allowPriceOverride}
            className={`text-xs text-left ${item.allowPriceOverride ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-500 cursor-default'}`}
            title={item.allowPriceOverride ? 'Toca para cambiar el precio' : ''}
          >
            ${item.unitPrice.toFixed(2)} {exchangeRate > 0 && `· Bs.${(item.unitPrice * exchangeRate).toFixed(2)}`}
          </button>
        )}
        {lineDisc > 0 && (
          <p className="text-[10px] text-amber-600">Descto: -${lineDisc.toFixed(2)}{exchangeRate > 0 && ` · -Bs.${(lineDisc * exchangeRate).toFixed(2)}`}</p>
        )}
      </div>

      <button
        onClick={() => onLineDiscount(item.productId)}
        className={`shrink-0 px-2 py-1 rounded-md text-xs font-medium border touch-manipulation ${
          lineDisc > 0
            ? 'bg-amber-600 text-white border-amber-600'
            : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
        }`}
      >
        {lineDisc > 0 ? 'Descto. ✓' : 'Descto.'}
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdateQuantity(item.productId, Math.max(item.allowDecimal ? QTY_STEP : 1, item.quantity - (item.allowDecimal ? 0.5 : 1)))}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold text-lg hover:bg-gray-200 touch-manipulation"
        >
          −
        </button>
        {item.allowDecimal ? (
          <input
            type="number"
            min="0"
            step={step}
            value={qtyDraft ?? item.quantity}
            onChange={(e) => setQtyDraft(e.target.value)}
            onBlur={commitQty}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        ) : (
          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
        )}
        <button
          onClick={() => onUpdateQuantity(item.productId, item.quantity + (item.allowDecimal ? 0.5 : 1))}
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
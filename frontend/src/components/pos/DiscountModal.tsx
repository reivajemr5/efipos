import { useEffect, useState } from 'react'
import type { DiscountType } from '../../utils/discount'
import { discountAmountUsd } from '../../utils/discount'

interface DiscountModalProps {
  open: boolean
  title: string
  exchangeRate: number
  baseAmount: number
  defaultType?: DiscountType
  initialValue?: number
  onApply: (usdAmount: number) => void
  onClear: () => void
  onClose: () => void
}

const TYPES: { key: DiscountType; label: string; symbol: string }[] = [
  { key: 'usd', label: 'Dólares', symbol: '$' },
  { key: 'bs', label: 'Bolívares', symbol: 'Bs.' },
  { key: 'percent', label: 'Porcentaje', symbol: '%' },
]

export default function DiscountModal({
  open, title, exchangeRate, baseAmount, defaultType = 'usd', initialValue = 0,
  onApply, onClear, onClose,
}: DiscountModalProps) {
  const [type, setType] = useState<DiscountType>(defaultType)
  const [input, setInput] = useState('')

  useEffect(() => {
    if (open) {
      setType(defaultType)
      setInput(displayForType(initialValue, defaultType))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function displayForType(usd: number, t: DiscountType): string {
    if (usd <= 0) return ''
    if (t === 'usd') return usd.toFixed(2)
    if (t === 'bs') return exchangeRate > 0 ? (usd * exchangeRate).toFixed(2) : ''
    return baseAmount > 0 ? (usd / baseAmount * 100).toFixed(2) : ''
  }

  function switchType(t: DiscountType) {
    const usd = discountAmountUsd(input, type, baseAmount, exchangeRate)
    setType(t)
    setInput(usd > 0 ? displayForType(usd, t) : '')
  }

  if (!open) return null

  const usdPreview = discountAmountUsd(input, type, baseAmount, exchangeRate)
  const hasRate = exchangeRate > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
        <p className="text-xs text-gray-400 mb-4">Base: ${baseAmount.toFixed(2)} {hasRate && `· Bs.${(baseAmount * exchangeRate).toFixed(2)}`}</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {TYPES.map((t) => {
            const disabled = t.key === 'bs' && !hasRate
            return (
              <button
                key={t.key}
                disabled={disabled}
                onClick={() => switchType(t.key)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors touch-manipulation ${
                  type === t.key
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {t.symbol} <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-semibold">{type === 'percent' ? '%' : type === 'bs' ? 'Bs.' : '$'}</span>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {!hasRate && (
          <p className="text-xs text-amber-600 mt-2">Carga la tasa BCV para descontar en Bs.</p>
        )}

        {usdPreview > 0 && (
          <div className="mt-3 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
            Descuento: <span className="font-bold text-amber-600">-${usdPreview.toFixed(2)}</span>
            {hasRate && <span className="text-gray-400"> · -Bs.{(usdPreview * exchangeRate).toFixed(2)}</span>}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => { onClear(); onClose() }}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
          >
            Quitar
          </button>
          <button
            onClick={() => { onApply(usdPreview); onClose() }}
            disabled={usdPreview <= 0}
            className="flex-1 py-3 bg-blue-900 text-white rounded-lg font-medium touch-manipulation disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

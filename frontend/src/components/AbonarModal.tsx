import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

interface Props {
  invoice: any
  onClose: () => void
  onSuccess: () => void
}

const TYPES = [
  { key: 'usd', label: 'Dólares', symbol: '$' },
  { key: 'bs', label: 'Bolívares', symbol: 'Bs.' },
] as const

export default function AbonarModal({ invoice, onClose, onSuccess }: Props) {
  const [type, setType] = useState<'usd' | 'bs'>('usd')
  const [amount, setAmount] = useState(0)
  const [rate, setRate] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToastStore((s: any) => s.addToast)

  useEffect(() => {
    api.exchangeRate.get().then((d: any) => { if (d?.rate) setRate(Number(d.rate)) }).catch(() => {})
  }, [])

  const amountUsd = type === 'usd' ? amount : rate > 0 ? amount / rate : 0
  const amountBs = type === 'usd' ? amount * rate : amount

  async function handleAbonar() {
    if (!invoice || amount <= 0 || rate <= 0 || amountUsd > Number(invoice.balance)) return
    setSubmitting(true)
    try {
      const bs = Math.round(amountBs * 100) / 100
      await api.invoices.abonar(invoice.id, { amountBs: bs, exchangeRate: rate })
      toast('Abono registrado', 'success')
      onSuccess()
    } catch (e: any) {
      toast(e.message || 'Error al abonar', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Abonar a {invoice.number}</h3>
        <p className="text-sm text-gray-500 mb-4">
          Cliente: {invoice.client?.name} · Saldo: <span className="font-semibold text-green-700">${Number(invoice.balance).toFixed(2)}</span>
        </p>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors touch-manipulation ${
                  type === t.key
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t.symbol} <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-semibold">{type === 'usd' ? '$' : 'Bs.'}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              autoFocus
              value={amount || ''}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label">Tasa BCV (Bs./USD)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={rate || ''}
                onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))}
                className="input flex-1"
                placeholder="50.00"
              />
              <button
                onClick={async () => {
                  const d = await api.exchangeRate.autoUpdate().catch(() => null)
                  if (d?.rate) setRate(Number(d.rate))
                }}
                className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 touch-manipulation shrink-0"
              >
                Auto
              </button>
            </div>
          </div>
          {amount > 0 && rate > 0 && (
            <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
              {type === 'usd' ? (
                <>Equivalen a <span className="font-bold text-green-700">Bs. {amountBs.toFixed(2)}</span> a la tasa del día</>
              ) : (
                <>Equivalen a <span className="font-bold text-green-700">${amountUsd.toFixed(2)}</span> USD a la tasa del día</>
              )}
              {amountUsd > Number(invoice.balance) && (
                <p className="text-red-500 text-xs mt-1">Supera el saldo pendiente de ${Number(invoice.balance).toFixed(2)}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
          >
            Cancelar
          </button>
          <button
            onClick={handleAbonar}
            disabled={submitting || amount <= 0 || rate <= 0 || amountUsd > Number(invoice.balance)}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold touch-manipulation disabled:opacity-50"
          >
            {submitting ? 'Procesando...' : 'Abonar'}
          </button>
        </div>
      </div>
    </div>
  )
}

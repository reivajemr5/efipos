import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface DraftItem {
  productId: number
  quantity: number
  unitPrice: number
  ivaPercent: number
  name: string
}

interface Draft {
  id: number
  number: string
  createdAt: string
  client: { id: number; name: string; documentType: string; documentNumber: string } | null
  clientId: number
  items: DraftItem[]
  total: string
}

interface LoadDraftModalProps {
  open: boolean
  onClose: () => void
  onLoad: (draft: Draft) => void
}

export default function LoadDraftModal({ open, onClose, onLoad }: LoadDraftModalProps) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.invoices.drafts()
      .then(setDrafts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  const symbol = '$'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-bold text-gray-800">Cargar Borrador</h3>
          <button onClick={onClose} className="text-gray-400 p-1 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay borradores guardados</div>
          ) : (
            drafts.map((draft) => {
              const d = new Date(draft.createdAt)
              const dateStr = d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              const itemCount = draft.items.reduce((c, i) => c + i.quantity, 0)
              return (
                <button
                  key={draft.id}
                  onClick={() => onLoad(draft)}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all bg-white"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-800">{draft.number}</span>
                    <span className="text-xs text-gray-400">{dateStr}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {draft.client ? (
                      <span>{draft.client.name} ({draft.client.documentType}-{draft.client.documentNumber})</span>
                    ) : (
                      <span className="text-gray-400">Sin cliente</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{itemCount} items</span>
                    <span className="font-bold text-gray-800">{symbol} {Number(draft.total).toFixed(2)}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

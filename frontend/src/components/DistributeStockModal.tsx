import { useState } from 'react'

interface Branch { id: number; name: string }
interface Distribution { branchId: number; quantity: number }

interface Props {
  open: boolean
  branches: Branch[]
  quantity: number
  initial?: Distribution[]
  productName: string
  onClose: () => void
  onSave: (dist: Distribution[]) => void
}

export default function DistributeStockModal({ open, branches, quantity, initial, productName, onClose, onSave }: Props) {
  const [alloc, setAlloc] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {}
    for (const b of branches) m[b.id] = ''
    for (const d of initial || []) m[d.branchId] = String(d.quantity)
    return m
  })

  if (!open) return null

  const total = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0)
  const valid = total === quantity

  function clear() {
    const m: Record<number, string> = {}
    for (const b of branches) m[b.id] = ''
    setAlloc(m)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">Distribuir stock</h3>
        <p className="text-sm text-gray-500 mb-4">{productName} · Total a repartir: <strong>{quantity}</strong></p>

        {branches.map((b) => (
          <div key={b.id} className="flex items-center gap-3 mb-2">
            <label className="flex-1 text-sm text-gray-700">{b.name}</label>
            <input type="number" min="0" value={alloc[b.id]}
              onChange={(e) => setAlloc({ ...alloc, [b.id]: e.target.value })}
              className="w-24 px-3 py-1.5 border rounded-lg text-right text-sm" />
          </div>
        ))}

        <div className={`text-sm mt-2 ${valid ? 'text-emerald-700' : 'text-red-600'}`}>
          Asignado: {total} / {quantity}
        </div>

        <div className="flex gap-2 pt-4">
          <button onClick={clear}
            className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300 text-sm">Quitar todo</button>
          <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300 text-sm">Cancelar</button>
          <button onClick={() => onSave(branches.filter((b) => (Number(alloc[b.id]) || 0) > 0).map((b) => ({ branchId: b.id, quantity: Number(alloc[b.id]) })))}
            disabled={!valid}
            className="flex-1 bg-blue-900 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-800 text-sm">
            Guardar distribución
          </button>
        </div>
      </div>
    </div>
  )
}

interface QuickActionsProps {
  onCancel: () => void
  onSaveDraft: () => void
  onDiscount: () => void
  onNotes: () => void
  itemCount: number
  hasDiscount?: boolean
}

export default function QuickActions({ onCancel, onSaveDraft, onDiscount, onNotes, itemCount, hasDiscount }: QuickActionsProps) {
  return (
    <div className="flex gap-2 px-3 py-2 bg-gray-50 border-t border-gray-200">
      <button
        onClick={onCancel}
        className="flex-1 py-2.5 px-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors touch-manipulation"
      >
        Cancelar
      </button>
      <button
        onClick={onSaveDraft}
        disabled={itemCount === 0}
        className="flex-1 py-2.5 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
      >
        Guardar
      </button>
      <button
        onClick={onNotes}
        className="flex-1 py-2.5 px-3 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors touch-manipulation"
      >
        Notas
      </button>
      <button
        onClick={onDiscount}
        disabled={itemCount === 0}
        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
          hasDiscount
            ? 'bg-amber-600 text-white ring-2 ring-amber-300'
            : 'bg-amber-500 text-white hover:bg-amber-600'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {hasDiscount ? 'Descto. ✓' : 'Descto.'}
      </button>
    </div>
  )
}

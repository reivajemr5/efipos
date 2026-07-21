import { useState, useMemo } from 'react'

interface Column<T> {
  key: string
  label: string
  render: (item: T) => React.ReactNode
  className?: string
}

interface TablePickerModalProps<T> {
  open: boolean
  onClose: () => void
  title: string
  items: T[]
  columns: Column<T>[]
  onSelect: (item: T) => void
  filterFn?: (item: T, query: string) => boolean
  searchPlaceholder?: string
  emptyText?: string
}

export default function TablePickerModal<T>({
  open, onClose, title, items, columns, onSelect,
  filterFn,
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados',
}: TablePickerModalProps<T>) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query || !filterFn) return items
    return items.filter((item) => filterFn(item, query))
  }, [items, query, filterFn])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200">
                {columns.map((col) => (
                  <th key={col.key} className={`text-left py-2 px-2 text-gray-500 font-medium ${col.className || ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr
                  key={i}
                  onClick={() => { onSelect(item); onClose() }}
                  className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`py-2.5 px-2 ${col.className || ''}`}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8 text-gray-400">{emptyText}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

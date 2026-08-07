import { useState, useMemo, useEffect } from 'react'

interface Column<T> {
  key: string
  label: string
  render: (item: T) => React.ReactNode
  className?: string
}

interface FilterDef<T> {
  key: string
  label: string
  options: { value: string; label: string }[]
  filter: (item: T, value: string) => boolean
}

interface TablePickerModalProps<T> {
  open: boolean
  onClose: () => void
  title: string
  items: T[]
  columns: Column<T>[]
  onSelect: (item: T) => void
  multiSelect?: boolean
  onMultiSelect?: (items: T[]) => void
  keyExtractor?: (item: T) => string | number
  filterFn?: (item: T, query: string) => boolean
  filters?: FilterDef<T>[]
  searchPlaceholder?: string
  emptyText?: string
  sortFn?: (items: T[]) => T[]
  headerExtra?: React.ReactNode
}

export default function TablePickerModal<T>({
  open, onClose, title, items, columns, onSelect,
  multiSelect = false, onMultiSelect, keyExtractor,
  filterFn, filters,
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados',
  sortFn,
  headerExtra,
}: TablePickerModalProps<T>) {
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const keyOf = (item: T) => String(keyExtractor ? keyExtractor(item) : (item as any).id)

  function toggleSelect(item: T) {
    setSelected((prev) => {
      const next = new Set(prev)
      const k = keyOf(item)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  useEffect(() => {
    if (open) setSelected(new Set())
  }, [open])

  const filtered = useMemo(() => {
    let result = items
    if (query && filterFn) result = result.filter((item) => filterFn(item, query))
    if (filters) {
      for (const f of filters) {
        const val = filterValues[f.key]
        if (val) result = result.filter((item) => f.filter(item, val))
      }
    }
    if (sortFn) result = sortFn(result)
    return result
  }, [items, query, filterFn, filters, filterValues, sortFn])

  const selectedItems = filtered.filter((item) => selected.has(keyOf(item)))

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <div className="flex items-center gap-3">
            {headerExtra}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
        </div>

        {filters && filters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {filters.map((f) => (
              <select key={f.key} value={filterValues[f.key] || ''}
                onChange={(e) => setFilterValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-xl text-sm">
                <option value="">{f.label}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ))}
            {Object.values(filterValues).some(Boolean) && (
              <button onClick={() => setFilterValues({})}
                className="text-xs text-blue-600 hover:text-blue-800 underline">Limpiar filtros</button>
            )}
          </div>
        )}

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
                {multiSelect && <th className="py-2 px-2 w-8"><input type="checkbox" checked={filtered.length > 0 && selectedItems.length === filtered.length} onChange={(e) => { setSelected(e.target.checked ? new Set(filtered.map((it) => keyOf(it))) : new Set()) }} className="rounded" /></th>}
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
                  onClick={() => { if (multiSelect) toggleSelect(item); else { onSelect(item); onClose() } }}
                  className={`border-b border-gray-50 transition-colors ${multiSelect ? (selected.has(keyOf(item)) ? 'bg-blue-50 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer') : 'hover:bg-blue-50 cursor-pointer'}`}
                >
                  {multiSelect && (
                    <td className="py-2.5 px-2">
                      <input type="checkbox" checked={selected.has(keyOf(item))} onChange={() => toggleSelect(item)} onClick={(e) => e.stopPropagation()} className="rounded" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`py-2.5 px-2 ${col.className || ''}`}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (multiSelect ? 1 : 0)} className="text-center py-8 text-gray-400">{emptyText}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {multiSelect && (
          <div className="flex items-center gap-2 border-t border-gray-200 p-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 touch-manipulation"
            >
              Cancelar
            </button>
            <button
              onClick={() => { if (onMultiSelect) onMultiSelect(selectedItems); setSelected(new Set()); onClose() }}
              disabled={selectedItems.length === 0}
              className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-blue-800 touch-manipulation disabled:opacity-40"
            >
              Agregar {selectedItems.length} producto{selectedItems.length === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

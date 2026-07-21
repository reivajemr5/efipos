import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

type ResultGroup = { label: string; items: any[]; icon: string; route: (item: any) => string }

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>({ products: [], clients: [], invoices: [] })
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) { setResults({ products: [], clients: [], invoices: [] }); return }
    setLoading(true)
    timerRef.current = setTimeout(() => {
      api.search.global(query).then((r) => { setResults(r); setActiveIdx(0) }).finally(() => setLoading(false))
    }, 300)
  }, [query])

  const groups: ResultGroup[] = [
    { label: 'Productos', items: results.products, icon: '📦', route: (i) => '/products' },
    { label: 'Clientes', items: results.clients, icon: '👤', route: (i) => '/clients' },
    { label: 'Facturas', items: results.invoices, icon: '🧾', route: (i) => '/invoices' },
  ]

  const flatItems = groups.flatMap((g) => g.items)
  const totalItems = flatItems.length

  const select = useCallback((idx: number) => {
    let cursor = idx
    for (const g of groups) {
      if (cursor < g.items.length) {
        navigate(g.route(g.items[cursor]))
        onClose()
        return
      }
      cursor -= g.items.length
    }
  }, [navigate, onClose, groups])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, totalItems - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); select(activeIdx) }
    else if (e.key === 'Escape') { onClose() }
  }

  const renderItem = (item: any, idx: number) => (
    <div key={idx}
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${idx === activeIdx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
      onClick={() => select(idx)}
      onMouseEnter={() => setActiveIdx(idx)}
    >
      <span className="text-xs font-mono text-gray-400 w-5">{idx + 1}</span>
      <span className="font-medium truncate flex-1">{item.name || item.number}</span>
      {item.code && <span className="text-xs text-gray-400 font-mono">{item.code}</span>}
      {item.price && <span className="text-xs font-mono text-gray-500">${Number(item.price).toFixed(2)}</span>}
      {item.documentNumber && <span className="text-xs text-gray-400 font-mono">{item.documentNumber}</span>}
      {item.total && <span className="text-xs font-mono text-gray-500">${Number(item.total).toFixed(2)}</span>}
      {item.stock !== undefined && (
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${item.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {item.stock}
        </span>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar productos, clientes, facturas…"
            className="flex-1 outline-none text-sm bg-transparent"
          />
          {loading && <div className="animate-spin w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full" />}
          <button onClick={onClose} className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Esc</button>
        </div>
        {query.trim().length > 0 && query.trim().length < 2 && (
          <p className="text-xs text-gray-400 text-center py-6">Escribe al menos 2 caracteres</p>
        )}
        {query.trim().length >= 2 && totalItems === 0 && !loading && (
          <p className="text-sm text-gray-400 text-center py-6">Sin resultados para "{query}"</p>
        )}
        {groups.map((g) => g.items.length > 0 && (
          <div key={g.label}>
            <div className="px-4 py-1.5 text-xs text-gray-400 uppercase tracking-wider bg-gray-50 flex items-center gap-1.5">
              <span>{g.icon}</span>
              <span>{g.label}</span>
              <span className="text-gray-300">({g.items.length})</span>
            </div>
            {g.items.map((item: any, i: number) => {
              const globalIdx = groups.flatMap((x) => x.items).indexOf(item)
              return renderItem(item, globalIdx)
            })}
          </div>
        ))}
        {totalItems > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex gap-4">
            <span>↑↓ Navegar</span>
            <span>⏎ Abrir</span>
            <span>Esc Cerrar</span>
          </div>
        )}
      </div>
    </div>
  )
}

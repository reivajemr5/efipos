import { useState, useRef, useCallback, useEffect } from 'react'

interface SearchPickerProps<T> {
  items: T[]
  onSelect: (item: T) => void
  filter: (item: T, query: string) => boolean
  renderItem: (item: T, highlighted: boolean) => React.ReactNode
  keyExtractor: (item: T) => string | number
  placeholder?: string
  onCreateNew?: () => void
  createNewLabel?: string
  noResultsText?: string
  minQueryLength?: number
  className?: string
  absolute?: boolean
  onAdvancedSearch?: () => void
}

export default function SearchPicker<T>({
  items, onSelect, filter, renderItem, keyExtractor,
  placeholder = 'Buscar...',
  onCreateNew,
  createNewLabel = '+ Nuevo',
  noResultsText = 'Sin resultados',
  minQueryLength = 2,
  className = '',
  absolute = false,
  onAdvancedSearch,
}: SearchPickerProps<T>) {
  const [query, setQuery] = useState('')
  const [show, setShow] = useState(false)
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = items.filter((item) => filter(item, query))

  const handleSelect = useCallback((item: T) => {
    onSelect(item)
    setQuery('')
    setShow(false)
    setIdx(0)
    inputRef.current?.focus()
  }, [onSelect])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (filtered.length === 0 && !onCreateNew) return
        setIdx((i) => Math.min(i + 1, filtered.length - 1 + (onCreateNew ? 1 : 0)))
        break
      case 'ArrowUp':
        e.preventDefault()
        setIdx((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[idx]) {
          handleSelect(filtered[idx])
        } else if (onCreateNew && idx === filtered.length) {
          onCreateNew()
          setQuery('')
          setShow(false)
          setIdx(0)
        }
        break
      case 'Escape':
        setShow(false)
        setIdx(0)
        break
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dropdownContent = show && query.length >= minQueryLength && (
    <div className={absolute
      ? 'absolute top-full left-0 right-0 bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto z-10 shadow'
      : 'max-h-40 overflow-y-auto border rounded-lg mb-3'}>
      {filtered.map((item, i) => (
        <button
          key={keyExtractor(item)}
          type="button"
          onClick={() => handleSelect(item)}
          className={`w-full text-left px-3 py-2 text-sm ${i === idx ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
        >
          {renderItem(item, i === idx)}
        </button>
      ))}
      {filtered.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">{noResultsText}</p>
      )}
      {onCreateNew && (
        <button
          type="button"
          onClick={() => { onCreateNew(); setQuery(''); setShow(false); setIdx(0) }}
          className={`w-full text-left px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium border-t ${idx === filtered.length ? 'bg-blue-100' : ''}`}
        >
          {createNewLabel}
        </button>
      )}
    </div>
  )

  const input = (
    <div className="flex">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setShow(e.target.value.length >= minQueryLength)
          setIdx(0)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-3 py-2 border rounded-lg"
      />
      {onAdvancedSearch && (
        <button type="button" onClick={onAdvancedSearch}
          className="ml-1.5 px-2 py-2 border rounded-lg bg-gray-50 hover:bg-gray-200 text-gray-500 text-xs shrink-0 whitespace-nowrap"
          title="Búsqueda avanzada">Tabla</button>
      )}
    </div>
  )

  if (absolute) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        {input}
        {dropdownContent}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={className}>
      {input}
      {dropdownContent}
    </div>
  )
}

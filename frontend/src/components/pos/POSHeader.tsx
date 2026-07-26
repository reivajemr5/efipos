import { useRef, useEffect, useState } from 'react'

interface Client {
  id: number; name: string; documentType: string; documentNumber: string
  phone: string | null; address: string | null
}

interface POSHeaderProps {
  clientSearch: string
  onClientSearchChange: (v: string) => void
  onClientSearchModal: () => void
  onClientAdd: () => void
  clients: Client[]
  onSelectClient: (c: Client) => void
  selectedClient: { id: number; name: string; documentType: string; documentNumber: string; phone: string | null; address: string | null } | null
  onClearClient: () => void
  productSearch: string
  onProductSearchChange: (v: string) => void
  onProductSearchModal: () => void
  onLoadDraft?: () => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  onSearchSubmit?: () => void
  onSearchArrowDown?: () => void
  clientInputRef?: React.RefObject<HTMLInputElement | null>
  onClientSubmit?: () => void
}

export default function POSHeader({
  clientSearch, onClientSearchChange, onClientSearchModal, onClientAdd, clients, onSelectClient,
  selectedClient, onClearClient,
  productSearch, onProductSearchChange, onProductSearchModal, onLoadDraft,
  searchInputRef, onSearchSubmit, onSearchArrowDown, clientInputRef, onClientSubmit,
}: POSHeaderProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClientSearchChange('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClientSearchChange])

  const [highlightedIdx, setHighlightedIdx] = useState(-1)

  const showDropdown = clientSearch.length >= 3
  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.documentNumber.includes(clientSearch)
  )

  useEffect(() => { setHighlightedIdx(-1) }, [clientSearch])

  function handleClientKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!showDropdown || filtered.length === 0) return
      setHighlightedIdx((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!showDropdown || filtered.length === 0) return
      setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
      return
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      if (showDropdown && highlightedIdx >= 0 && filtered[highlightedIdx]) {
        onSelectClient(filtered[highlightedIdx])
        onClientSearchChange('')
        return
      }
      onClientSubmit?.()
    }
  }

  return (
    <header className="bg-blue-900 text-white px-3 flex items-center gap-2 shrink-0 h-10">
      <div className="relative flex-1 min-w-0 h-full flex items-center" ref={ref}>
        {selectedClient ? (
          <div className="flex items-center gap-1.5 bg-blue-700 rounded-lg px-2 h-7 w-full min-w-0">
            <span className="text-xs shrink-0">👤</span>
            <span className="text-xs font-medium truncate min-w-0">{selectedClient.name}</span>
            <span className="text-[10px] text-blue-200/80 shrink-0">{selectedClient.documentType}-{selectedClient.documentNumber}</span>
            {selectedClient.address && (
              <span className="text-[10px] text-blue-200/60 truncate hidden sm:inline">{selectedClient.address}</span>
            )}
            <button onClick={onClientSearchModal} className="p-0.5 hover:bg-blue-600 rounded touch-manipulation shrink-0 ml-auto">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
            <button onClick={onClearClient} className="p-0.5 hover:bg-blue-600 rounded touch-manipulation shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
        <div className="flex items-center gap-1 bg-blue-800 rounded-lg px-2 h-7 w-full min-w-0">
          <span className="text-xs shrink-0">👤</span>
          <input
            ref={clientInputRef}
            type="text"
            placeholder="Cliente..."
            value={clientSearch}
            onChange={(e) => onClientSearchChange(e.target.value)}
            onKeyDown={handleClientKeyDown}
            className="flex-1 bg-transparent text-white text-xs placeholder-white/50 outline-none min-w-0"
          />
          <button onClick={onClientSearchModal} className="p-0.5 hover:bg-blue-700 rounded touch-manipulation shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <button onClick={onClientAdd} className="p-0.5 hover:bg-blue-700 rounded touch-manipulation shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        )}

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-sm text-gray-500 mb-2">No se encontró "{clientSearch}"</p>
                <button
                  onClick={() => { onClientAdd() }}
                  className="w-full py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 touch-manipulation"
                >
                  + Crear "{clientSearch}"
                </button>
              </div>
            ) : (
              filtered.map((c, i) => (
                <button
                  key={c.id}
                  onMouseEnter={() => setHighlightedIdx(i)}
                  onClick={() => { onSelectClient(c); onClientSearchChange('') }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 border-b border-gray-50 last:border-0 ${
                    i === highlightedIdx ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.documentType}-{c.documentNumber}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 bg-blue-800 rounded-lg px-2 h-7 flex-1 min-w-0">
        <svg className="w-3.5 h-3.5 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Producto..."
          value={productSearch}
          onChange={(e) => onProductSearchChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (!e.ctrlKey && !e.metaKey) onSearchSubmit?.()
            }
            if (e.key === 'ArrowDown') { e.preventDefault(); onSearchArrowDown?.() }
          }}
          className="flex-1 bg-transparent text-white text-xs placeholder-white/50 outline-none min-w-0"
        />
        <button onClick={onProductSearchModal} className="p-0.5 hover:bg-blue-700 rounded touch-manipulation shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {onLoadDraft && (
          <button onClick={onLoadDraft} className="p-0.5 hover:bg-blue-700 rounded touch-manipulation shrink-0 text-[10px]" title="Cargar Borrador">
            📂
          </button>
        )}
      </div>
    </header>
  )
}

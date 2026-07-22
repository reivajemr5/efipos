import { useRef, useEffect } from 'react'

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
  productSearch: string
  onProductSearchChange: (v: string) => void
  onProductSearchModal: () => void
}

export default function POSHeader({
  clientSearch, onClientSearchChange, onClientSearchModal, onClientAdd, clients, onSelectClient,
  productSearch, onProductSearchChange, onProductSearchModal,
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

  const showDropdown = clientSearch.length >= 3
  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.documentNumber.includes(clientSearch)
  )

  return (
    <header className="bg-blue-900 text-white px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
      <div className="relative min-w-0 flex-1 md:flex-none md:min-w-[200px]" ref={ref}>
        <div className="flex items-center gap-1 bg-blue-800 rounded-lg px-2 py-1">
          <span className="text-sm shrink-0">👤</span>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={clientSearch}
            onChange={(e) => onClientSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm placeholder-white/50 outline-none min-w-0"
          />
          <button onClick={onClientSearchModal} className="p-1 hover:bg-blue-700 rounded touch-manipulation shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <button onClick={onClientAdd} className="p-1 hover:bg-blue-700 rounded touch-manipulation shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

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
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onSelectClient(c); onClientSearchChange('') }}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-100 flex items-center gap-2 border-b border-gray-50 last:border-0"
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

      <div className="flex items-center gap-1 bg-blue-800 rounded-lg px-2 py-1 min-w-0 flex-[2] md:flex-1">
        <svg className="w-4 h-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          placeholder="Buscar productos..."
          value={productSearch}
          onChange={(e) => onProductSearchChange(e.target.value)}
          className="flex-1 bg-transparent text-white text-sm placeholder-white/50 outline-none min-w-0"
        />
        <button onClick={onProductSearchModal} className="p-1 hover:bg-blue-700 rounded touch-manipulation shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
    </header>
  )
}

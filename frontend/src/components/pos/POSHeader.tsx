interface POSHeaderProps {
  clientSearch: string
  onClientSearchChange: (v: string) => void
  onClientSearchModal: () => void
  onClientAdd: () => void
  productSearch: string
  onProductSearchChange: (v: string) => void
  onProductSearchModal: () => void
}

export default function POSHeader({
  clientSearch, onClientSearchChange, onClientSearchModal, onClientAdd,
  productSearch, onProductSearchChange, onProductSearchModal,
}: POSHeaderProps) {
  return (
    <header className="bg-blue-900 text-white px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
      <div className="flex items-center gap-1 bg-blue-800 rounded-lg px-2 py-1 min-w-0 flex-1 md:flex-none md:min-w-[200px]">
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

interface POSHeaderProps {
  clientName: string
  onClientClick: () => void
  onSearchClick: () => void
}

export default function POSHeader({ clientName, onClientClick, onSearchClick }: POSHeaderProps) {
  return (
    <header className="bg-blue-900 text-white px-4 py-3 flex items-center gap-4 shrink-0">
      <button onClick={onClientClick} className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation truncate max-w-[200px]">
        <span>👤</span>
        <span className="truncate">{clientName}</span>
      </button>

      <button onClick={onSearchClick} className="flex-1 max-w-md ml-auto flex items-center gap-2 bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm text-white/80 touch-manipulation">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <span>Buscar productos...</span>
      </button>
    </header>
  )
}

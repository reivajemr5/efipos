import { useState } from 'react'

interface POSHeaderProps {
  mode: 'quick' | 'walkin'
  onModeChange: (mode: 'quick' | 'walkin') => void
  search: string
  onSearchChange: (v: string) => void
  onToggleHistory: () => void
  showingHistory: boolean
}

export default function POSHeader({ mode, onModeChange, search, onSearchChange, onToggleHistory, showingHistory }: POSHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-blue-900 text-white px-4 py-3 flex items-center gap-4 shrink-0">
      <div className="relative">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-blue-800 rounded-lg touch-manipulation">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {menuOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg z-50 py-1 text-gray-800">
            <button onClick={() => { setMenuOpen(false); onToggleHistory() }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
              {showingHistory ? 'Volver a POS' : 'Historial'}
            </button>
            <button onClick={() => { setMenuOpen(false); window.location.href = '/reports' }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
              Reportes
            </button>
          </div>
        )}
      </div>

      <div className="flex bg-blue-800 rounded-lg p-0.5">
        <button
          onClick={() => onModeChange('quick')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors touch-manipulation ${mode === 'quick' ? 'bg-white text-blue-900' : 'text-white hover:bg-blue-700'}`}
        >
          Quick Sale
        </button>
        <button
          onClick={() => onModeChange('walkin')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors touch-manipulation ${mode === 'walkin' ? 'bg-white text-blue-900' : 'text-white hover:bg-blue-700'}`}
        >
          Walk-In
        </button>
      </div>

      <div className="flex-1 max-w-md ml-auto relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg text-gray-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
    </header>
  )
}

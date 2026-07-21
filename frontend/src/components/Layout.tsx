import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncCatalogs, processPendingChanges } from '../services/sync'
import OfflineIndicator from './OfflineIndicator'
import GlobalSearch from './GlobalSearch'
import ToastContainer from './ToastContainer'

const sidebarItems = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/invoices', label: 'Facturación', icon: '🧾' },
  { to: '/quotes', label: 'Cotizaciones', icon: '📋' },
  { to: '/purchases', label: 'Compras', icon: '📥' },
  { to: '/products', label: 'Productos', icon: '📦' },
  { to: '/inventory', label: 'Inventario', icon: '📊' },
  { to: '/categories', label: 'Categorías', icon: '🏷️' },
  { to: '/clients', label: 'Clientes', icon: '👥' },
  { to: '/suppliers', label: 'Proveedores', icon: '🏭' },
  { to: '/accounts/receivable', label: 'CxC', icon: '💰' },
  { to: '/accounts/payable', label: 'CxP', icon: '💳' },
  { to: '/reports', label: 'Reportes', icon: '📊' },
  { to: '/settings', label: 'Config.', icon: '⚙️' },
]

const mobileNavItems = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/invoices', label: 'Ventas', icon: '🧾' },
  { to: '/products', label: 'Prod.', icon: '📦' },
  { to: '/clients', label: 'Clientes', icon: '👥' },
  { to: '/more', label: 'Más', icon: '☰' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (isOnline) {
      syncCatalogs()
      processPendingChanges()
    }
  }, [isOnline])

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) processPendingChanges()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <OfflineIndicator />
      <div className="flex flex-1">
        <aside className="w-64 bg-white shadow-md hidden md:flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-blue-900">Efi- Pos</h1>
            <div className="flex items-center justify-between mt-1">
              {user && (
                <p className="text-sm text-gray-500">
                  {user.name} · {user.role}
                </p>
              )}
              <button onClick={() => setSearchOpen(true)}
                className="text-xs text-gray-400 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                🔍 <kbd className="font-mono text-gray-500">Ctrl+K</kbd>
              </button>
            </div>
          </div>
          <nav className="flex-1 p-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  location.pathname === item.to
                    ? 'bg-blue-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`} />
              {isOnline ? 'En línea' : 'Offline'}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors w-full"
            >
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex safe-area-bottom">
        {mobileNavItems.map((item) => {
          const isMore = item.to === '/more'
          return (
            <button key={item.label}
              onClick={() => {
                if (isMore) setMobileMenuOpen(true)
                else navigate(item.to)
              }}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                !isMore && location.pathname === item.to ? 'text-blue-900 font-semibold' : 'text-gray-500'
              }`}>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Navegación</p>
            <div className="grid grid-cols-3 gap-3">
              {sidebarItems.filter((i) => !mobileNavItems.some((m) => m.to === i.to) && i.to !== '/').map((item) => (
                <button key={item.to} onClick={() => { navigate(item.to); setMobileMenuOpen(false) }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs text-gray-600">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
      <ToastContainer />
    </div>
  )
}

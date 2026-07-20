import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncCatalogs, processPendingChanges } from '../services/sync'
import OfflineIndicator from './OfflineIndicator'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/purchases', label: 'Compras', icon: '📥' },
  { to: '/invoices', label: 'Facturación', icon: '🧾' },
  { to: '/quotes', label: 'Cotizaciones', icon: '📋' },
  { to: '/products', label: 'Productos', icon: '📦' },
  { to: '/clients', label: 'Clientes', icon: '👥' },
  { to: '/suppliers', label: 'Proveedores', icon: '🏭' },
  { to: '/reports', label: 'Reportes', icon: '📊' },
  { to: '/settings', label: 'Config.', icon: '⚙️' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const isOnline = useOnlineStatus()

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
            {user && (
              <p className="text-sm text-gray-500 mt-1">
                {user.name} · {user.role}
              </p>
            )}
          </div>
          <nav className="flex-1 p-2">
            {navItems.map((item) => (
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
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncCatalogs, processPendingChanges } from '../services/sync'
import OfflineIndicator from './OfflineIndicator'
import GlobalSearch from './GlobalSearch'
import ToastContainer from './ToastContainer'
import TenantSwitcher from './TenantSwitcher'
import { useRole, ADMIN_PATHS } from '../hooks/useRole'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/invoices', label: 'Ventas', icon: '🧾' },
  { to: '/facturas', label: 'Facturas', icon: '📑' },
  { to: '/products', label: 'Productos', icon: '📦' },
  { to: '/clients', label: 'Clientes', icon: '👥' },
  { to: '/purchases', label: 'Compras', icon: '📥' },
  { to: '/quotes', label: 'Cotizaciones', icon: '📋' },
  { to: '/reports', label: 'Reportes', icon: '📊' },
]

const moreItems = [
  { to: '/suppliers', label: 'Proveedores', icon: '🏭' },
  { to: '/categories', label: 'Categorías', icon: '🏷️' },
  { to: '/inventory', label: 'Inventario', icon: '📊' },
  { to: '/accounts/receivable', label: 'CxC', icon: '💰' },
  { to: '/accounts/payable', label: 'CxP', icon: '💳' },
  { to: '/payments', label: 'Pagos', icon: '💵' },
  { to: '/settings', label: 'Config.', icon: '⚙️' },
]

const mobileNav = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/invoices', label: 'Ventas', icon: '🧾' },
  { to: '/products', label: 'Productos', icon: '📦' },
  { to: '/clients', label: 'Clientes', icon: '👥' },
  { to: '/more', label: 'Más', icon: '☰' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [searchOpen, setSearchOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navCompact, setNavCompact] = useState(false)

  const { isCajero } = useRole()

  useEffect(() => {
    if (isCajero && ADMIN_PATHS.includes(location.pathname)) navigate('/', { replace: true })
  }, [isCajero, location.pathname, navigate])

  const canManageUsers = user?.role === 'superadmin' || user?.role === 'dueno'
  const adminItems = [
    ...(user?.role === 'superadmin' ? [{ to: '/businesses', label: 'Negocios', icon: '🏢' }] : []),
    ...(canManageUsers ? [{ to: '/branches', label: 'Sucursales', icon: '🏬' }] : []),
    ...(canManageUsers ? [{ to: '/users', label: 'Usuarios', icon: '👤' }] : []),
  ]

  const visibleNav = isCajero ? navItems.filter((i) => !ADMIN_PATHS.includes(i.to)) : navItems
  const visibleMore = isCajero ? moreItems.filter((i) => !ADMIN_PATHS.includes(i.to) && i.to !== '/settings') : moreItems
  const sideItems = [...visibleNav, ...visibleMore, ...adminItems]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setDrawerOpen(false); setMobileMenuOpen(false) }
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

  const isPOS = location.pathname === '/invoices'

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <OfflineIndicator />

      {/* Top header bar */}
      <header className="bg-blue-900 text-white shrink-0">
        <div className="flex items-center h-14 px-3 gap-1">
          <button onClick={() => setDrawerOpen(true)} className="p-2 hover:bg-blue-800 rounded-lg touch-manipulation shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <Link to="/" className="text-lg font-bold tracking-tight shrink-0 mr-2">Efi-Pos</Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  navCompact ? 'px-2 py-1.5' : 'px-4 py-2'
                } ${
                  location.pathname === item.to
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`}
                title={navCompact ? item.label : undefined}
              >
                <span className={navCompact ? 'text-lg' : 'text-xl'}>{item.icon}</span>
                {!navCompact && <span className="text-sm">{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Nav toggle */}
          <button
            onClick={() => setNavCompact(!navCompact)}
            className="hidden md:flex p-1.5 hover:bg-blue-800 rounded-lg text-blue-300 hover:text-white touch-manipulation shrink-0"
            title={navCompact ? 'Expandir menú' : 'Compactar menú'}
          >
            <svg className={`w-4 h-4 transition-transform ${navCompact ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>

          <div className="flex-1" />

          <TenantSwitcher />

          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 hover:bg-blue-800 rounded-lg touch-manipulation text-blue-100 hover:text-white"
            title="Buscar (Ctrl+K)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>

          {user && (
            <div className="hidden sm:flex items-center gap-2 ml-1">
              <span className="text-xs text-blue-200 hidden lg:inline">{user.name}</span>
              <button onClick={logout} className="p-1.5 hover:bg-blue-800 rounded-lg text-blue-100 hover:text-white touch-manipulation" title="Cerrar sesión">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Navigation drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Efi-Pos</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-3 space-y-0.5">
              {sideItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    location.pathname === item.to
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-100 p-4">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`} />
                {isOnline ? 'En línea' : 'Offline'}
              </div>
              <button onClick={logout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors text-sm w-full">
                <span>🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={`flex-1 ${isPOS ? 'overflow-hidden' : 'overflow-auto p-4 md:p-6 pb-20 md:pb-6'}`}>
        <div className={isPOS ? '' : 'max-w-7xl mx-auto'}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      {!isPOS && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex safe-area-bottom">
          {mobileNav.map((item) => {
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
      )}

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Navegación</p>
            <div className="grid grid-cols-3 gap-3">
              {sideItems.filter((i) => !mobileNav.some((m) => m.to === i.to) && i.to !== '/').map((item) => (
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

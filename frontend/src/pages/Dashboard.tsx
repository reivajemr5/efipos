import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

const navCards = [
  { to: '/invoices', label: 'Nueva Factura', desc: 'Crear y gestionar facturas', color: 'bg-blue-600', icon: '📄' },
  { to: '/quotes', label: 'Cotizaciones', desc: 'Presupuestos para clientes', color: 'bg-indigo-600', icon: '📋' },
  { to: '/purchases', label: 'Compras', desc: 'Pedidos y facturas de compra', color: 'bg-emerald-600', icon: '📥' },
  { to: '/products', label: 'Productos', desc: 'Catálogo e inventario', color: 'bg-amber-600', icon: '📦' },
  { to: '/clients', label: 'Clientes', desc: 'Registro de clientes', color: 'bg-rose-600', icon: '👥' },
  { to: '/suppliers', label: 'Proveedores', desc: 'Proveedores registrados', color: 'bg-cyan-600', icon: '🏭' },
  { to: '/reports', label: 'Reportes', desc: 'Ventas y cierre de caja', color: 'bg-purple-600', icon: '📊' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.reports.dashboard().then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const maxDaily = data ? Math.max(...data.dailySales.map((d: any) => d.total), 1) : 1

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Panel General</h2>
        {data?.exchangeRate && (
          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
            Tasa BCV: <strong className="font-mono">Bs. {Number(data.exchangeRate).toFixed(2)}</strong>
          </span>
        )}
      </div>

      {/* Tarjetas del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-blue-100 text-xs uppercase tracking-wider">Ventas Hoy</p>
          <p className="text-3xl font-bold mt-1 font-mono">${Number(data.today.totalSales).toFixed(2)}</p>
          <p className="text-blue-200 text-xs mt-1">{data.today.totalInvoices} facturas</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-emerald-100 text-xs uppercase tracking-wider">Ticket Promedio</p>
          <p className="text-3xl font-bold mt-1 font-mono">${Number(data.today.averageTicket).toFixed(2)}</p>
        </div>
        <div className={`p-5 rounded-2xl shadow-lg text-white ${data.lowStockProducts.length > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>
          <p className="text-amber-100 text-xs uppercase tracking-wider">Stock Bajo</p>
          <p className="text-3xl font-bold mt-1">{data.lowStockProducts.length}</p>
          <p className="text-amber-200 text-xs mt-1">productos por reponer</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-purple-100 text-xs uppercase tracking-wider">Semana</p>
          <p className="text-3xl font-bold mt-1 font-mono">${Number(data.dailySales.reduce((s: number, d: any) => s + d.total, 0)).toFixed(2)}</p>
          <p className="text-purple-200 text-xs mt-1">últimos 7 días</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras semanal */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Ventas últimos 7 días</h3>
          <div className="flex items-end gap-2 h-40">
            {data.dailySales.map((d: any) => {
              const pct = maxDaily > 0 ? (d.total / maxDaily) * 100 : 0
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400 font-mono">${Number(d.total).toFixed(0)}</span>
                  <div className="w-full bg-blue-100 rounded-t-lg relative" style={{ height: `${Math.max(pct, 4)}%` }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-lg transition-all duration-500" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{new Date(d.date).toLocaleDateString('es', { weekday: 'short' })}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top productos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Top Productos Hoy</h3>
          <div className="space-y-3">
            {data.topProducts.length === 0 && <p className="text-sm text-gray-400">Sin ventas hoy</p>}
            {data.topProducts.slice(0, 5).map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold font-mono">{p.quantity} uds</p>
                  <p className="text-xs text-gray-400 font-mono">${Number(p.total).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stock bajo + Facturas recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.lowStockProducts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <span className="text-lg">⚠️</span> Productos con stock bajo
            </h3>
            <div className="space-y-2">
              {data.lowStockProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                  <span className="text-amber-800 font-medium truncate">{p.name}</span>
                  <span className="font-mono text-amber-700 whitespace-nowrap ml-2">
                    {p.stock} / {p.minStock} uds
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Últimas Facturas</h3>
          <div className="space-y-2">
            {data.recentInvoices.length === 0 && <p className="text-sm text-gray-400">Sin facturas</p>}
            {data.recentInvoices.map((inv: any) => (
              <div key={inv.id} onClick={() => navigate('/invoices')}
                className="flex items-center justify-between text-sm hover:bg-gray-50 rounded-lg px-3 py-2 cursor-pointer transition-colors">
                <div>
                  <p className="font-medium text-gray-700">{inv.number}</p>
                  <p className="text-xs text-gray-400">{inv.client?.name}</p>
                </div>
                <span className="font-mono text-gray-600">${Number(inv.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navegación rápida */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {navCards.map((card) => (
          <button key={card.to} onClick={() => navigate(card.to)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-left">
            <span className="text-2xl">{card.icon}</span>
            <p className="mt-2 font-semibold text-gray-800 text-sm">{card.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

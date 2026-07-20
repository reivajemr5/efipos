import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [todaySales, setTodaySales] = useState<any>(null)
  const [lowStock, setLowStock] = useState<any[]>([])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      api.reports.sales(today, today),
      api.products.list('low_stock=true'),
    ]).then(([sales, products]) => {
      setTodaySales(sales)
      setLowStock(products)
    })
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {todaySales && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 uppercase">Ventas hoy</p>
            <p className="text-xl font-bold font-mono">${Number(todaySales.totalSales).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 uppercase">Facturas</p>
            <p className="text-xl font-bold">{todaySales.totalInvoices}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 uppercase">Ticket prom.</p>
            <p className="text-xl font-bold font-mono">${Number(todaySales.averageTicket).toFixed(2)}</p>
          </div>
          <div className={`bg-white p-4 rounded-lg shadow ${lowStock.length > 0 ? 'border-l-4 border-amber-500' : ''}`}>
            <p className="text-xs text-gray-500 uppercase">Stock bajo</p>
            <p className="text-xl font-bold">{lowStock.length}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button onClick={() => navigate('/invoices')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <span className="text-3xl">🧾</span>
          <p className="mt-2 font-semibold text-gray-800">Nueva Factura</p>
          <p className="text-xs text-gray-400">Crear y gestionar facturas</p>
        </button>
        <button onClick={() => navigate('/quotes')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <span className="text-3xl">📋</span>
          <p className="mt-2 font-semibold text-gray-800">Cotizaciones</p>
          <p className="text-xs text-gray-400">Presupuestos para clientes</p>
        </button>
        <button onClick={() => navigate('/purchases')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <span className="text-3xl">📥</span>
          <p className="mt-2 font-semibold text-gray-800">Compras</p>
          <p className="text-xs text-gray-400">Cuentas por pagar</p>
        </button>
        <button onClick={() => navigate('/products')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <span className="text-3xl">📦</span>
          <p className="mt-2 font-semibold text-gray-800">Productos</p>
          <p className="text-xs text-gray-400">Catálogo e inventario</p>
        </button>
        <button onClick={() => navigate('/clients')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <span className="text-3xl">👥</span>
          <p className="mt-2 font-semibold text-gray-800">Clientes</p>
          <p className="text-xs text-gray-400">Registro de clientes</p>
        </button>
        <button onClick={() => navigate('/suppliers')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <span className="text-3xl">🏭</span>
          <p className="mt-2 font-semibold text-gray-800">Proveedores</p>
          <p className="text-xs text-gray-400">Proveedores registrados</p>
        </button>
        <button onClick={() => navigate('/reports')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <span className="text-3xl">📊</span>
          <p className="mt-2 font-semibold text-gray-800">Reportes</p>
          <p className="text-xs text-gray-400">Ventas y cierre de caja</p>
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">⚠️ Productos con stock bajo</h3>
          <div className="space-y-1">
            {lowStock.slice(0, 5).map((p: any) => (
              <p key={p.id} className="text-sm text-amber-700">
                {p.name} — <span className="font-mono">{p.stock} uds</span> (mín: {p.minStock})
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function AccountsReceivable() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.accounts.receivable().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full" /></div>

  const invoices = data?.invoices || []

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-800">Cuentas por Cobrar</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Total Pendiente</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">${Number(data?.totalPending || 0).toFixed(2)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Facturas</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{invoices.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Promedio</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">${invoices.length ? Number(data.totalPending / invoices.length).toFixed(2) : '0.00'}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th>N° Factura</th>
              <th>Cliente</th>
              <th>RIF/CI</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Vendedor</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">Sin cuentas por cobrar</td></tr>
            ) : invoices.map((inv: any) => (
              <tr key={inv.id}>
                <td className="font-medium">{inv.number}</td>
                <td>{inv.client?.name}</td>
                <td className="text-gray-500 font-mono text-xs">{inv.client?.documentType}-{inv.client?.documentNumber}</td>
                <td className="font-mono font-medium">${Number(inv.total).toFixed(2)}</td>
                <td className="text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                <td className="text-gray-500">{inv.user?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function AccountsReceivable() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.accounts.receivable().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Cuentas por Cobrar</h2>

      <div className="bg-gradient-to-br from-rose-600 to-rose-800 text-white p-5 rounded-2xl shadow-lg">
        <p className="text-rose-100 text-xs uppercase tracking-wider">Total Pendiente</p>
        <p className="text-3xl font-bold mt-1 font-mono">${Number(data.totalPending).toFixed(2)}</p>
        <p className="text-rose-200 text-xs mt-1">{data.totalCount} facturas por cobrar</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">N° Factura</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">RIF/CI</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Monto</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hay facturas pendientes</td></tr>
              )}
              {data.invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{inv.number}</td>
                  <td className="px-4 py-3">{inv.client?.name || 'Consumidor final'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{inv.client?.documentNumber || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{new Date(inv.createdAt).toLocaleDateString('es-VE')}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{inv.user?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

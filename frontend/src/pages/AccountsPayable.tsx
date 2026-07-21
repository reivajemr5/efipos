import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

const statusLabel: Record<string, string> = { pedido: 'Pedido', recibido: 'Recibido', pagada: 'Pagada', anulada: 'Anulada' }
const statusBadge: Record<string, string> = {
  pedido: 'bg-amber-100 text-amber-700',
  recibido: 'bg-blue-100 text-blue-700',
  pagada: 'bg-emerald-100 text-emerald-700',
  anulada: 'bg-red-100 text-red-700',
}

export default function AccountsPayable() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.accounts.payable().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Cuentas por Pagar</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-rose-600 to-rose-800 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-rose-100 text-xs uppercase tracking-wider">Total Pendiente</p>
          <p className="text-3xl font-bold mt-1 font-mono">${Number(data.totalPending).toFixed(2)}</p>
          <p className="text-rose-200 text-xs mt-1">{data.totalCount} compras pendientes</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-blue-100 text-xs uppercase tracking-wider">Pedidos</p>
          <p className="text-3xl font-bold mt-1">{data.purchases.filter((p: any) => p.status === 'pedido').length}</p>
          <p className="text-blue-200 text-xs mt-1">por recibir</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">N°</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Proveedor</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">RIF</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Monto</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.purchases.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay cuentas por pagar</td></tr>
              )}
              {data.purchases.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{p.number}</td>
                  <td className="px-4 py-3">{p.supplier?.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{p.supplier?.documentNumber || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[p.status]}`}>
                      {statusLabel[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">${Number(p.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{new Date(p.createdAt).toLocaleDateString('es-VE')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate('/purchases')}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Ir a Compras →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

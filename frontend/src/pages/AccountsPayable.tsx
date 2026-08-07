import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import PaginationBar from '../components/PaginationBar'

const statusLabel: Record<string, string> = { pedido: 'Pedido', recibido: 'Recibido', pagada: 'Pagada', anulada: 'Anulada' }
const statusBadge: Record<string, string> = { pedido: 'badge-amber', recibido: 'badge-blue', pagada: 'badge-green', anulada: 'badge-red' }

export default function AccountsPayable() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const PAGE_SIZE = 25
  const navigate = useNavigate()

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    setPage(0)
    const t = setTimeout(() => { load() }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))
      const res = await api.accounts.payable(params.toString())
      setData(res)
    } catch {} finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full" /></div>

  const purchases = data?.purchases || []

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-800">Cuentas por Pagar</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Total Pendiente</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">${Number(data?.totalPending || 0).toFixed(2)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Órdenes</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{Number(data?.total || 0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Vencidas</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{purchases.filter((p: any) => p.status === 'pedido').length}</p>
        </div>
      </div>

      <input
        className="input max-w-xs"
        placeholder="Buscar por proveedor o RIF..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="table-modern">
          <thead>
            <tr>
              <th>N°</th>
              <th>Proveedor</th>
              <th>RIF</th>
              <th>Estado</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Sin cuentas por pagar</td></tr>
            ) : purchases.map((p: any) => (
              <tr key={p.id}>
                <td className="font-medium">{p.number}</td>
                <td>{p.supplier?.name}</td>
                <td className="text-gray-500 font-mono text-xs">{p.supplier?.documentType}-{p.supplier?.documentNumber}</td>
                <td><span className={statusBadge[p.status] || 'badge'}>{statusLabel[p.status] || p.status}</span></td>
                <td className="font-mono font-medium">${Number(p.total).toFixed(2)}</td>
                <td className="text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => navigate('/purchases')} className="text-sm text-blue-600 hover:underline">Ir a Compras</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <PaginationBar page={page} onPage={setPage} total={Number(data?.total || 0)} pageSize={PAGE_SIZE} />
    </div>
  )
}

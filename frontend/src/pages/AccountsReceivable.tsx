import { useState, useEffect } from 'react'
import { api } from '../services/api'
import AbonarModal from '../components/AbonarModal'
import InvoiceDetailModal from '../components/InvoiceDetailModal'
import PaginationBar from '../components/PaginationBar'

export default function AccountsReceivable() {
  const PAGE_SIZE = 25
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<any>(null)
  const [abonarInvoice, setAbonarInvoice] = useState<any>(null)

  function load(q?: string, pageOverride?: number) {
    setLoading(true)
    const p = pageOverride ?? page
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(p * PAGE_SIZE))
    api.accounts.receivable(params.toString()).then(setData).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setPage(0)
    const t = setTimeout(() => { load(search.trim() || undefined, 0) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    load(search.trim() || undefined)
  }, [page])

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full" /></div>

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
          <p className="text-2xl font-bold text-gray-800 mt-1">{Number(data?.total || 0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Promedio</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">${data?.total ? Number(Number(data.totalPending) / Number(data.total)).toFixed(2) : '0.00'}</p>
        </div>
      </div>

      <input
        className="input max-w-md"
        placeholder="Buscar por cliente o cédula..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th>N° Factura</th>
              <th>Cliente</th>
              <th>RIF/CI</th>
              <th>Total</th>
              <th>Saldo</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">{loading ? 'Cargando...' : 'Sin cuentas por cobrar'}</td></tr>
            ) : invoices.map((inv: any) => (
              <tr key={inv.id}>
                <td className="font-medium">{inv.number}</td>
                <td>{inv.client?.name}</td>
                <td className="text-gray-500 font-mono text-xs">{inv.client?.documentType}-{inv.client?.documentNumber}</td>
                <td className="font-mono font-medium">${Number(inv.total).toFixed(2)}</td>
                <td className="font-mono font-bold text-green-700">${Number(inv.balance).toFixed(2)}</td>
                <td className="text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetail(inv)}
                      className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-600 touch-manipulation"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => setAbonarInvoice(inv)}
                      className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-800 touch-manipulation"
                    >
                      Abonar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} onPage={setPage} total={Number(data?.total || 0)} pageSize={PAGE_SIZE} />

      {detail && (
        <InvoiceDetailModal
          invoice={detail}
          onClose={() => setDetail(null)}
          onAbonar={(inv) => { setDetail(null); setAbonarInvoice(inv) }}
        />
      )}

      {abonarInvoice && (
        <AbonarModal
          invoice={abonarInvoice}
          onClose={() => setAbonarInvoice(null)}
          onSuccess={() => { setAbonarInvoice(null); load(search.trim() || undefined) }}
        />
      )}
    </div>
  )
}

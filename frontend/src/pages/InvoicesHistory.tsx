import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'
import PaginationBar from '../components/PaginationBar'
import { useRole } from '../hooks/useRole'
import { formatQty } from '../utils/config'

interface InvoiceListItem {
  id: number
  number: string
  status: string
  currency: string
  total: string
  totalBs: string | null
  paymentMethod: string
  createdAt: string
  client: { id: number; name: string; documentType: string; documentNumber: string }
}

interface InvoiceDetail {
  id: number
  number: string
  status: string
  currency: string
  subtotal: string
  ivaTotal: string
  discount: string | null
  total: string
  totalBs: string | null
  paymentMethod: string
  createdAt: string
  cancelledAt?: string | null
  client: { name: string; documentType: string; documentNumber: string }
  user: { name: string }
  quote: { id: number; number: string } | null
  items: Array<{
    quantity: number
    unitPrice: string
    subtotal: string
    discount: string | null
    product: { name: string; code: string }
  }>
}

const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'activa', label: 'Activas' },
  { value: 'anulada', label: 'Anuladas' },
]

const PAYMENT_LABELS: Record<string, string> = {
  efectivo_bs: 'Efectivo Bs',
  efectivo_usd: 'Efectivo $',
  tarjeta_debito: 'Tarjeta de Débito',
  tarjeta_credito: 'Tarjeta de Crédito',
  cheque: 'Cheque',
  pago_movil: 'Pago Móvil',
  biopago: 'Biopago',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'activa') return <span className="badge-green">Activa</span>
  if (status === 'anulada') return <span className="badge-red">Anulada</span>
  return <span className="badge-amber">Borrador</span>
}

export default function InvoicesHistory() {
  const { canCancelInvoices } = useRole()
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [invoicesTotal, setInvoicesTotal] = useState(0)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<InvoiceDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const toast = useToastStore((s: any) => s.addToast)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (search.trim()) params.set('q', search.trim())
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))
      const data = await api.invoices.list(params.toString())
      setInvoices(Array.isArray(data) ? data : data.items)
      setInvoicesTotal(Array.isArray(data) ? data.length : data.total)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => {
    setPage(0)
    const t = setTimeout(() => { load() }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, dateFrom, dateTo])

  useEffect(() => {
    const t = setTimeout(() => { load() }, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  async function openDetail(id: number) {
    setLoadingDetail(true)
    try {
      const d = await api.invoices.getById(id)
      setDetail(d)
    } catch { /* ignore */ } finally { setLoadingDetail(false) }
  }

  function reprint() {
    if (!detail) return
    window.open(`/invoices/print/${detail.id}`, '_blank')
  }

  async function cancelInvoice() {
    if (!detail) return
    if (!confirm(`¿Anular la factura ${detail.number}? Se restaurará el stock.`)) return
    try {
      await api.invoices.cancel(detail.id)
      toast('Factura anulada')
      setDetail(null)
      load()
    } catch {
      toast('No se pudo anular la factura')
    }
  }

  const sym = (inv: { currency: string }) => (inv.currency === 'bs' ? 'Bs.' : '$')

  return (
    <div className="page-container">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Facturas</h2>
        <p className="text-sm text-gray-500">Historial de ventas cobradas y anuladas</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors touch-manipulation ${
                  status === f.value ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <input
            className="input"
            placeholder="Buscar por número, cliente o cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Desde</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {loading && invoices.length === 0 ? (
          <p className="text-gray-400 text-center py-12">Cargando...</p>
        ) : invoices.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No hay facturas con esos filtros</p>
        ) : (
          invoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => openDetail(inv.id)}
              className="card p-4 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{inv.number}</p>
                  <StatusBadge status={inv.status} />
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {inv.client?.name || 'Consumidor Final'}
                  {inv.client ? ` (${inv.client.documentType}-${inv.client.documentNumber})` : ''}
                  {' · '}{new Date(inv.createdAt).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono font-semibold text-gray-800">{sym(inv)}{Number(inv.total).toFixed(2)}</p>
                {inv.totalBs && Number(inv.totalBs) > 0 && (
                  <p className="text-xs text-gray-400">Bs.{Number(inv.totalBs).toFixed(2)}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <PaginationBar page={page} onPage={setPage} total={invoicesTotal} pageSize={PAGE_SIZE} />

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl p-4 shadow-lg flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600">Cargando factura...</span>
          </div>
        </div>
      )}

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-card max-h-[90vh] flex flex-col slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{detail.number}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(detail.createdAt).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <StatusBadge status={detail.status} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Cliente</p>
                  <p className="font-medium text-gray-800">{detail.client?.name || 'Consumidor Final'}</p>
                  {detail.client && <p className="text-gray-500">{detail.client.documentType}-{detail.client.documentNumber}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Atendido por</p>
                  <p className="font-medium text-gray-800">{detail.user?.name || '-'}</p>
                  <p className="text-gray-500 capitalize">{PAYMENT_LABELS[detail.paymentMethod] || detail.paymentMethod}</p>
                </div>
              </div>
              {detail.quote && (
                <p className="text-sm text-gray-600">Cotización de referencia: <span className="font-medium">{detail.quote.number}</span></p>
              )}

              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
                    <th className="pb-1">Producto</th>
                    <th className="pb-1 text-center">Cant</th>
                    <th className="pb-1 text-right">Precio</th>
                    {detail.items.some((i) => Number(i.discount) > 0) && <th className="pb-1 text-right">Descto.</th>}
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5">{item.product?.name || 'Producto'}</td>
                      <td className="py-1.5 text-center">{formatQty(Number(item.quantity))}</td>
                      <td className="py-1.5 text-right">{sym(detail)}{Number(item.unitPrice).toFixed(2)}</td>
                      {detail.items.some((x) => Number(x.discount) > 0) && (
                        <td className="py-1.5 text-right text-amber-600">{Number(item.discount) > 0 ? `-${sym(detail)}${Number(item.discount).toFixed(2)}` : ''}</td>
                      )}
                      <td className="py-1.5 text-right">{sym(detail)}{Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <div className="text-right space-y-1 border-t border-gray-200 pt-3">
                <p className="text-sm text-gray-600">Subtotal: {sym(detail)}{Number(detail.subtotal).toFixed(2)}</p>
                <p className="text-sm text-gray-600">IVA: {sym(detail)}{Number(detail.ivaTotal).toFixed(2)}</p>
                {detail.discount && Number(detail.discount) > 0 && (
                  <p className="text-sm text-amber-600">Descuento: -{sym(detail)}{Number(detail.discount).toFixed(2)}</p>
                )}
                <p className="text-lg font-bold text-gray-900">Total: {sym(detail)}{Number(detail.total).toFixed(2)}</p>
                {detail.totalBs && Number(detail.totalBs) > 0 && (
                  <p className="text-sm text-gray-400">Bs.{Number(detail.totalBs).toFixed(2)}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={reprint} className="btn btn-primary flex-1">Reimprimir</button>
              {detail.status === 'activa' && canCancelInvoices && (
                <button onClick={cancelInvoice} className="btn btn-danger flex-1">Anular</button>
              )}
              <button onClick={() => setDetail(null)} className="btn btn-secondary flex-1">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

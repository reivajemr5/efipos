import { useState } from 'react'
import { api } from '../services/api'

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sales, setSales] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [cashClose, setCashClose] = useState<any>(null)
  const [declaredAmount, setDeclaredAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function searchSales() {
    const [s, t, c] = await Promise.all([
      api.reports.sales(dateFrom || undefined, dateTo || undefined),
      api.reports.topProducts(dateFrom || undefined, dateTo || undefined),
      api.reports.cashClose(),
    ])
    setSales(s)
    setTopProducts(t)
    setCashClose(c)
  }

  async function handleCashClose() {
    if (!declaredAmount) return
    setSaving(true)
    try { await api.reports.saveCashClose(Number(declaredAmount)); setDeclaredAmount(''); searchSales() }
    catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button onClick={searchSales} className="btn-primary">Buscar</button>
        </div>
      </div>

      {sales && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">${Number(sales.totalSales).toFixed(2)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">Facturas</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{sales.totalInvoices}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">${Number(sales.averageTicket).toFixed(2)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">Métodos de Pago</p>
              <div className="mt-1 space-y-0.5">
                {Object.entries(sales.byPaymentMethod || {}).map(([method, total]) => (
                  <p key={method} className="text-sm text-gray-600 font-medium">
                    {method}: <span className="font-mono">${Number(total).toFixed(2)}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="card-header"><h3 className="font-semibold text-gray-700">Facturas del período</h3></div>
            <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(sales.invoices || []).length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">Sin resultados</td></tr>
                ) : sales.invoices.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="font-medium">{inv.number}</td>
                    <td>{inv.client?.name}</td>
                    <td className="font-mono">${Number(inv.total).toFixed(2)}</td>
                    <td className="capitalize">{inv.paymentMethod}</td>
                    <td className="text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Top Productos</h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{p.name}</span>
                      <span className="font-mono text-gray-600">{p.quantity} uds · ${Number(p.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Cierre de Caja</h3>
              {cashClose && (
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-gray-600">Esperado:</span><span className="font-mono font-medium">${Number(cashClose.expectedTotal).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Declarado:</span><span className="font-mono font-medium">{cashClose.declaredTotal ? `$${Number(cashClose.declaredTotal).toFixed(2)}` : '—'}</span></div>
                  {cashClose.isClosed && <p className="text-green-600 font-medium text-xs">✓ Cierre completado</p>}
                </div>
              )}
              <div className="flex gap-2">
                <input type="number" step="0.01" className="input flex-1" placeholder="Monto declarado..." value={declaredAmount} onChange={(e) => setDeclaredAmount(e.target.value)} />
                <button onClick={handleCashClose} disabled={saving || !declaredAmount} className="btn-primary">{saving ? '...' : 'Cerrar'}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

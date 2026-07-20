import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Reports() {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(weekAgo)
  const [dateTo, setDateTo] = useState(today)
  const [sales, setSales] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [cashClose, setCashClose] = useState<any>(null)
  const [declaredAmount, setDeclaredAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [s, tp, cc] = await Promise.all([
      api.reports.sales(dateFrom, dateTo),
      api.reports.topProducts(dateFrom, dateTo),
      api.reports.cashClose(today),
    ])
    setSales(s)
    setTopProducts(tp)
    setCashClose(cc)
  }

  useEffect(() => { load() }, [dateFrom, dateTo])

  async function handleCashClose() {
    if (!declaredAmount || isNaN(Number(declaredAmount))) return
    setSaving(true)
    await api.reports.saveCashClose(Number(declaredAmount), today)
    setDeclaredAmount('')
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>

      <div className="flex gap-2 items-center">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm" />
        <span className="text-gray-500">a</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Ventas totales</p>
          <p className="text-2xl font-bold font-mono">${sales ? Number(sales.totalSales).toFixed(2) : '0.00'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Facturas emitidas</p>
          <p className="text-2xl font-bold">{sales?.totalInvoices || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Ticket promedio</p>
          <p className="text-2xl font-bold font-mono">${sales ? Number(sales.averageTicket).toFixed(2) : '0.00'}</p>
        </div>
      </div>

      {sales?.byPaymentMethod && Object.keys(sales.byPaymentMethod).length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Formas de pago</h3>
          <div className="space-y-2">
            {Object.entries(sales.byPaymentMethod).map(([method, total]) => (
              <div key={method} className="flex items-center justify-between text-sm">
                <span className="capitalize">{method}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-blue-900 rounded-full"
                    style={{ width: `${(Number(total) / sales.totalSales) * 100}%`, minWidth: 20 }} />
                  <span className="font-mono w-24 text-right">${Number(total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Productos más vendidos</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex-1 truncate">{i + 1}. {p.name}</span>
                  <span className="text-gray-500 mx-2">{p.quantity} uds</span>
                  <span className="font-mono">${Number(p.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Cierre de caja - {today}</h3>
          {cashClose ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Facturas del día:</span>
                <span className="font-semibold">{cashClose.invoiceCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Esperado:</span>
                <span className="font-mono">${Number(cashClose.expectedTotal).toFixed(2)}</span>
              </div>
              {cashClose.isClosed ? (
                <>
                  <div className="flex justify-between">
                    <span>Declarado:</span>
                    <span className="font-mono">${Number(cashClose.declaredTotal).toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between font-semibold ${Number(cashClose.difference) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <span>Diferencia:</span>
                    <span className="font-mono">${Number(cashClose.difference).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="pt-2 space-y-2">
                  <input type="number" step="0.01" value={declaredAmount}
                    onChange={(e) => setDeclaredAmount(e.target.value)}
                    placeholder="Monto declarado..."
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <button onClick={handleCashClose} disabled={saving || !declaredAmount}
                    className="w-full bg-blue-900 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Cerrar Caja'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Cargando...</p>
          )}
        </div>
      </div>

      {sales?.dailyBreakdown && sales.dailyBreakdown.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Ventas por día</h3>
          <div className="space-y-1">
            {sales.dailyBreakdown.map((d: any) => (
              <div key={d.date} className="flex items-center justify-between text-sm">
                <span>{new Date(d.date).toLocaleDateString()}</span>
                <span className="text-gray-500">{d.count} facturas</span>
                <span className="font-mono">${Number(d.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function AccountsReceivable() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [abonarInvoice, setAbonarInvoice] = useState<any>(null)
  const [amountBs, setAmountBs] = useState(0)
  const [rate, setRate] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  function load() {
    setLoading(true)
    api.accounts.receivable().then(setData).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openAbonar(inv: any) {
    setAbonarInvoice(inv)
    setAmountBs(0)
    setRate(0)
    api.exchangeRate.get().then((d: any) => { if (d?.rate) setRate(Number(d.rate)) }).catch(() => {})
  }

  async function handleAbonar() {
    if (!abonarInvoice || amountBs <= 0 || rate <= 0) return
    setSubmitting(true)
    try {
      await api.invoices.abonar(abonarInvoice.id, { amountBs, exchangeRate: rate })
      setAbonarInvoice(null)
      load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

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
              <th>Total</th>
              <th>Saldo</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Sin cuentas por cobrar</td></tr>
            ) : invoices.map((inv: any) => (
              <tr key={inv.id}>
                <td className="font-medium">{inv.number}</td>
                <td>{inv.client?.name}</td>
                <td className="text-gray-500 font-mono text-xs">{inv.client?.documentType}-{inv.client?.documentNumber}</td>
                <td className="font-mono font-medium">${Number(inv.total).toFixed(2)}</td>
                <td className="font-mono font-bold text-green-700">${Number(inv.balance).toFixed(2)}</td>
                <td className="text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => openAbonar(inv)}
                    className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-800 touch-manipulation"
                  >
                    Abonar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abonarInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAbonarInvoice(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Abonar a {abonarInvoice.number}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Cliente: {abonarInvoice.client?.name} · Saldo: <span className="font-semibold text-green-700">${Number(abonarInvoice.balance).toFixed(2)}</span>
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="label">Monto en Bs.</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={amountBs || ''}
                  onChange={(e) => setAmountBs(Math.max(0, Number(e.target.value) || 0))}
                  className="input"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">Tasa BCV (Bs./USD)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rate || ''}
                    onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))}
                    className="input flex-1"
                    placeholder="50.00"
                  />
                  <button
                    onClick={async () => {
                      const d = await api.exchangeRate.autoUpdate().catch(() => null)
                      if (d?.rate) setRate(Number(d.rate))
                    }}
                    className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 touch-manipulation shrink-0"
                  >
                    Auto
                  </button>
                </div>
              </div>
              {amountBs > 0 && rate > 0 && (
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  Equivalen a <span className="font-bold text-green-700">${(amountBs / rate).toFixed(2)}</span> USD
                  {amountBs / rate > Number(abonarInvoice.balance) && (
                    <p className="text-red-500 text-xs mt-1">Supera el saldo pendiente de ${Number(abonarInvoice.balance).toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAbonarInvoice(null)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbonar}
                disabled={submitting || amountBs <= 0 || rate <= 0 || (amountBs / rate) > Number(abonarInvoice.balance)}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold touch-manipulation disabled:opacity-50"
              >
                {submitting ? 'Procesando...' : 'Abonar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

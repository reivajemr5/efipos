import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

const methodLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  punto: 'Punto de Venta',
  credito: 'Crédito',
  cheque: 'Cheque',
}

export default function Payments() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'invoices' | 'purchases'>('invoices')
  const [showForm, setShowForm] = useState(false)
  const [totals, setTotals] = useState<Record<string, { total: number; paid: number; pending: number }>>({})
  const [form, setForm] = useState({ invoiceId: '', purchaseInvoiceId: '', amount: '', method: 'efectivo', reference: '', notes: '' })
  const addToast = useToastStore((s) => s.addToast)

  async function load() {
    const [inv, pur, pays] = await Promise.all([
      api.invoices.list(''),
      api.purchases.list(''),
      api.payments.list(),
    ])
    setInvoices(inv.filter((i: any) => i.status === 'activa'))
    setPurchases(pur.filter((p: any) => p.status !== 'pagada' && p.status !== 'anulada'))
    setPayments(pays)
    // Load totals for all
    for (const invItem of inv.filter((x: any) => x.status === 'activa')) {
      api.payments.totals('invoice_id=' + invItem.id).then((t) => setTotals((prev) => ({ ...prev, ['inv_' + invItem.id]: t })))
    }
    for (const purItem of pur.filter((x: any) => x.status !== 'pagada' && x.status !== 'anulada')) {
      api.payments.totals('purchase_invoice_id=' + purItem.id).then((t) => setTotals((prev) => ({ ...prev, ['pur_' + purItem.id]: t })))
    }
  }

  useEffect(() => { load() }, [])

  async function savePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || (!form.invoiceId && !form.purchaseInvoiceId)) return
    await api.payments.create({
      invoiceId: form.invoiceId ? Number(form.invoiceId) : null,
      purchaseInvoiceId: form.purchaseInvoiceId ? Number(form.purchaseInvoiceId) : null,
      amount: Number(form.amount),
      method: form.method,
      reference: form.reference || null,
      notes: form.notes || null,
    })
    addToast('Pago registrado', 'success')
    setShowForm(false)
    setForm({ invoiceId: '', purchaseInvoiceId: '', amount: '', method: 'efectivo', reference: '', notes: '' })
    load()
  }

  function getTotal(ref: string) {
    return totals[ref] || { total: 0, paid: 0, pending: 0 }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Pagos y Abonos</h2>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm">+ Registrar Pago</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'invoices' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-600 hover:text-gray-800'}`}>
          Cuentas por Cobrar
        </button>
        <button onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'purchases' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-600 hover:text-gray-800'}`}>
          Cuentas por Pagar
        </button>
      </div>

      {/* Payment form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-md mx-4 shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Registrar Pago</h3>
            <form onSubmit={savePayment} className="space-y-3">
              <div className="flex gap-2">
                <select value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value, purchaseInvoiceId: '' })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm">
                  <option value="">Factura (opcional)</option>
                  {invoices.map((i) => {
                    const t = getTotal(`inv_${i.id}`)
                    return <option key={i.id} value={i.id}>{i.number} - ${Number(t.pending).toFixed(2)} pendiente</option>
                  })}
                </select>
              </div>
              <select value={form.purchaseInvoiceId} onChange={(e) => setForm({ ...form, purchaseInvoiceId: e.target.value, invoiceId: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                <option value="">Compra (opcional)</option>
                {purchases.map((p) => {
                  const t = getTotal(`pur_${p.id}`)
                  return <option key={p.id} value={p.id}>{p.number} - ${Number(t.pending).toFixed(2)} pendiente</option>
                })}
              </select>
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" step="0.01" placeholder="Monto *" required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                {Object.entries(methodLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Referencia (ej: N° transferencia)"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm font-medium">Registrar</button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments list */}
      <div className="space-y-2">
        {activeTab === 'invoices' && invoices.map((i) => {
          const t = getTotal(`inv_${i.id}`)
          return (
            <div key={i.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{i.number}</p>
                  <p className="text-sm text-gray-500">{i.client?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold">${Number(t.total).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Pagado: <span className="font-mono text-green-600">${Number(t.paid).toFixed(2)}</span></p>
                  <p className="text-xs text-gray-400">Pendiente: <span className="font-mono text-amber-600">${Number(t.pending).toFixed(2)}</span></p>
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${t.total > 0 ? (t.paid / t.total) * 100 : 0}%` }} />
              </div>
            </div>
          )
        })}
        {activeTab === 'purchases' && purchases.map((p) => {
          const t = getTotal(`pur_${p.id}`)
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{p.number}</p>
                  <p className="text-sm text-gray-500">{p.supplier?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold">${Number(t.total).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Pagado: <span className="font-mono text-green-600">${Number(t.paid).toFixed(2)}</span></p>
                  <p className="text-xs text-gray-400">Pendiente: <span className="font-mono text-amber-600">${Number(t.pending).toFixed(2)}</span></p>
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${t.total > 0 ? (t.paid / t.total) * 100 : 0}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Last payments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 text-sm">Últimos Pagos Registrados</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {payments.slice(0, 10).map((p: any) => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-gray-700">${Number(p.amount).toFixed(2)}</span>
                <span className="text-gray-400 ml-2">{methodLabels[p.method] || p.method}</span>
                {p.reference && <span className="text-gray-400 ml-2 font-mono">{p.reference}</span>}
              </div>
              <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString('es-VE')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

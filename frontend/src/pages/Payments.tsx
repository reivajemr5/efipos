import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

const methodLabels: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', mixto: 'Mixto' }

export default function Payments() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'invoices' | 'purchases'>('invoices')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ entityId: 0, amount: '', method: 'efectivo', reference: '', notes: '' })
  const toast = useToastStore((s: any) => s.addToast)

  useEffect(() => { load() }, [])
  async function load() {
    const [p, invs, pchs] = await Promise.all([
      api.payments.list(),
      api.invoices.list('status=activa'),
      api.purchases.list(),
    ])
    setPayments(p)
    setInvoices(invs)
    setPurchases(pchs)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.entityId || !form.amount) return
    try {
      const payload = { ...form, amount: Number(form.amount), entityType: activeTab === 'invoices' ? 'invoice' : 'purchase' }
      await api.payments.create(payload)
      toast('Pago registrado')
      setShowForm(false)
      setForm({ entityId: 0, amount: '', method: 'efectivo', reference: '', notes: '' })
      load()
    } catch (e: any) { alert(e.message) }
  }

  const entities = activeTab === 'invoices' ? invoices : purchases

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pagos</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nuevo Pago</button>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'invoices' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Facturas</button>
        <button onClick={() => setActiveTab('purchases')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'purchases' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Compras</button>
      </div>

      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th>N°</th>
              <th>Entidad</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Ref.</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">Sin pagos registrados</td></tr>
            ) : payments.map((p: any) => (
              <tr key={p.id}>
                <td className="font-medium">#{p.id}</td>
                <td>{p.entityType === 'invoice' ? `Factura #${p.invoiceId}` : `Compra #${p.purchaseId}`}</td>
                <td className="font-mono font-medium">${Number(p.amount).toFixed(2)}</td>
                <td className="capitalize">{methodLabels[p.method] || p.method}</td>
                <td className="text-gray-500 text-xs">{p.reference || '—'}</td>
                <td className="text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Nuevo Pago</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">{activeTab === 'invoices' ? 'Factura' : 'Compra'}</label>
                <select className="input" value={form.entityId} onChange={(e) => setForm({ ...form, entityId: Number(e.target.value) })} required>
                  <option value={0}>Seleccionar...</option>
                  {entities.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.number} - ${Number(e.total).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Monto *</label>
                <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label className="label">Método</label>
                <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
              <div>
                <label className="label">Referencia</label>
                <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

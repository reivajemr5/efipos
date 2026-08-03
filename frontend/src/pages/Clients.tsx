import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'
import AbonarModal from '../components/AbonarModal'
import InvoiceAbonos from '../components/InvoiceAbonos'

interface Client {
  id: number
  name: string
  documentType: string
  documentNumber: string
  phone: string
  address: string
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  activa: { label: 'Activa', cls: 'badge-green' },
  anulada: { label: 'Anulada', cls: 'badge-red' },
  borrador: { label: 'Borrador', cls: 'badge-amber' },
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })
  const toast = useToastStore((s: any) => s.addToast)

  const [statementClient, setStatementClient] = useState<Client | null>(null)
  const [statement, setStatement] = useState<any>(null)
  const [statementLoading, setStatementLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [abonarInvoice, setAbonarInvoice] = useState<any>(null)

  useEffect(() => { load() }, [])
  async function load() { const data = await api.clients.list(); setClients(data) }

  async function openStatement(c: Client) {
    setStatementClient(c)
    setStatement(null)
    setExpandedId(null)
    setStatementLoading(true)
    try {
      const data = await api.clients.statement(c.id)
      setStatement(data)
    } catch (e: any) {
      toast(e.message || 'Error al cargar el estado de cuenta', 'error')
    } finally {
      setStatementLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.documentNumber) return
    if (editing) {
      await api.clients.update(editing.id, form)
      toast('Cliente actualizado', 'success')
    } else {
      await api.clients.create(form)
      toast('Cliente creado', 'success')
    }
    setShowForm(false); setEditing(null); setForm({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este cliente?')) return
    await api.clients.delete(id)
    toast('Cliente eliminado')
    load()
  }

  async function handleCancelInvoice(inv: any) {
    if (!confirm(`¿Anular la factura ${inv.number}?`)) return
    try {
      await api.invoices.cancel(inv.id)
      toast('Factura anulada', 'success')
      if (statementClient) openStatement(statementClient)
    } catch (e: any) {
      toast(e.message || 'Error al anular la factura', 'error')
    }
  }

  function openEdit(c: Client) { setEditing(c); setForm({ name: c.name, documentType: c.documentType, documentNumber: c.documentNumber, phone: c.phone || '', address: c.address || '' }); setShowForm(true) }

  const filtered = clients.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.documentNumber.includes(search))

  const invoices = statement?.invoices || []
  const payable = invoices.filter((i: any) => i.status === 'activa' && Number(i.balance) > 0)

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nuevo</button>
      </div>

      <input className="input max-w-md" placeholder="Buscar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No hay clientes</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="card flex items-center justify-between p-4 hover:shadow-md transition-shadow">
              <div>
                <p className="font-medium text-gray-800">{c.name}</p>
                <p className="text-sm text-gray-500">{c.documentType}-{c.documentNumber}{c.phone ? ` · ${c.phone}` : ''}</p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => openStatement(c)} className="text-sm text-green-700 hover:underline">Estado</button>
                <button onClick={() => openEdit(c)} className="text-sm text-blue-600 hover:underline">Editar</button>
                <button onClick={() => handleDelete(c.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo Doc.</label>
                  <select className="input" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
                    <option value="V">V</option>
                    <option value="E">E</option>
                    <option value="J">J</option>
                    <option value="G">G</option>
                  </select>
                </div>
                <div>
                  <label className="label">N° Documento *</label>
                  <input className="input" value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">{editing ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statementClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setStatementClient(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Estado de cuenta</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {statementClient.name} · {statementClient.documentType}-{statementClient.documentNumber}
                  {statementClient.phone ? ` · ${statementClient.phone}` : ''}
                </p>
              </div>
              <button onClick={() => setStatementClient(null)} className="text-gray-400 p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {statementLoading ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="card p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Comprado</p>
                    <p className="font-bold text-gray-800">${Number(statement?.totals?.totalComprado || 0).toFixed(2)}</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Pagado</p>
                    <p className="font-bold text-green-700">${Number(statement?.totals?.totalPagado || 0).toFixed(2)}</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Pendiente</p>
                    <p className="font-bold text-amber-700">${Number(statement?.totals?.totalPendiente || 0).toFixed(2)}</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Facturas</p>
                    <p className="font-bold text-gray-800">{statement?.totals?.facturas || 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Historial de compras</p>
                  {invoices.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">Sin compras registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((inv: any) => {
                        const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.borrador
                        const isOpen = expandedId === inv.id
                        return (
                          <div key={inv.id} className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setExpandedId(isOpen ? null : inv.id)}
                                className="flex-1 min-w-0 text-left px-3 py-2.5 hover:bg-gray-50"
                              >
                                <p className="font-medium text-gray-800 text-sm truncate">{inv.number}</p>
                                <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                              </button>
                              <div className="flex items-center gap-2 px-3 shrink-0">
                                <span className={badge.cls}>{badge.label}</span>
                                <span className="font-mono font-bold text-gray-800">${Number(inv.total).toFixed(2)}</span>
                                {inv.status === 'activa' && (
                                  <div className="flex gap-1.5">
                                    {Number(inv.balance) > 0 && (
                                      <button
                                        onClick={() => setAbonarInvoice(inv)}
                                        className="px-2.5 py-1 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-800 touch-manipulation"
                                      >
                                        Abonar
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleCancelInvoice(inv)}
                                      className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 touch-manipulation"
                                    >
                                      Anular
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {isOpen && (
                              <div className="px-3 pb-3 space-y-3">
                                <div className="space-y-1.5 border-t border-gray-100 pt-2">
                                  {(inv.items || []).map((it: any) => (
                                    <div key={it.id} className="flex items-start justify-between text-sm">
                                      <div className="min-w-0 pr-3">
                                        <p className="font-medium text-gray-700 truncate">{it.product?.name || 'Producto'}</p>
                                        <p className="text-xs text-gray-400">{it.quantity} × ${Number(it.unitPrice).toFixed(2)}</p>
                                      </div>
                                      <span className="font-mono text-gray-600 shrink-0">${Number(it.subtotal).toFixed(2)}</span>
                                    </div>
                                  ))}
                                  {Number(inv.discount) > 0 && (
                                    <p className="flex justify-between text-xs text-amber-700"><span>Descuento</span><span>-${Number(inv.discount).toFixed(2)}</span></p>
                                  )}
                                  {Number(inv.balance) > 0 && inv.status === 'activa' && (
                                    <p className="flex justify-between text-xs font-semibold text-green-700"><span>Saldo pendiente</span><span>${Number(inv.balance).toFixed(2)}</span></p>
                                  )}
                                  <InvoiceAbonos payments={inv.payments} />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {payable.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Cuentas por cobrar</p>
                    <div className="space-y-2">
                      {payable.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between border border-green-200 bg-green-50 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{inv.number}</p>
                            <p className="text-xs text-gray-500">Saldo: <span className="font-semibold text-green-700">${Number(inv.balance).toFixed(2)}</span></p>
                          </div>
                          <button
                            onClick={() => setAbonarInvoice(inv)}
                            className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-800 touch-manipulation"
                          >
                            Abonar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 border-t border-gray-200 shrink-0">
              <button
                onClick={() => setStatementClient(null)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {abonarInvoice && (
        <AbonarModal
          invoice={abonarInvoice}
          onClose={() => setAbonarInvoice(null)}
          onSuccess={() => { setAbonarInvoice(null); if (statementClient) openStatement(statementClient) }}
        />
      )}
    </div>
  )
}

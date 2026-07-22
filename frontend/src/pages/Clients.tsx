import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

interface Client {
  id: number
  name: string
  documentType: string
  documentNumber: string
  phone: string
  address: string
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })
  const toast = useToastStore((s: any) => s.addToast)

  useEffect(() => { load() }, [])
  async function load() { const data = await api.clients.list(); setClients(data) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.documentNumber) return
    if (editing) {
      await api.clients.update(editing.id, form)
      toast('Cliente actualizado')
    } else {
      await api.clients.create(form)
      toast('Cliente creado')
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

  function openEdit(c: Client) { setEditing(c); setForm({ name: c.name, documentType: c.documentType, documentNumber: c.documentNumber, phone: c.phone || '', address: c.address || '' }); setShowForm(true) }

  const filtered = clients.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.documentNumber.includes(search))

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
              <div className="flex gap-2">
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
    </div>
  )
}

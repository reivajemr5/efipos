import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

interface Supplier {
  id: number
  name: string
  documentType: string
  documentNumber: string
  phone: string
  address: string
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', documentType: 'J', documentNumber: '', phone: '', address: '' })
  const toast = useToastStore((s: any) => s.addToast)

  useEffect(() => { load() }, [])
  async function load() { const data = await api.suppliers.list(); setSuppliers(data) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.documentNumber) return
    if (editing) {
      await api.suppliers.update(editing.id, form); toast('Proveedor actualizado')
    } else {
      await api.suppliers.create(form); toast('Proveedor creado')
    }
    setShowForm(false); setEditing(null); setForm({ name: '', documentType: 'J', documentNumber: '', phone: '', address: '' }); load()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este proveedor?')) return
    await api.suppliers.delete(id); toast('Proveedor eliminado'); load()
  }

  function openEdit(s: Supplier) { setEditing(s); setForm({ name: s.name, documentType: s.documentType, documentNumber: s.documentNumber, phone: s.phone || '', address: s.address || '' }); setShowForm(true) }

  const filtered = suppliers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.documentNumber.includes(search))

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nuevo</button>
      </div>
      <input className="input max-w-md" placeholder="Buscar proveedores..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No hay proveedores</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="card flex items-center justify-between p-4 hover:shadow-md transition-shadow">
              <div>
                <p className="font-medium text-gray-800">{s.name}</p>
                <p className="text-sm text-gray-500">{s.documentType}-{s.documentNumber}{s.phone ? ` · ${s.phone}` : ''}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)} className="text-sm text-blue-600 hover:underline">Editar</button>
                <button onClick={() => handleDelete(s.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo Doc.</label>
                  <select className="input" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
                    <option value="J">J</option><option value="V">V</option><option value="E">E</option><option value="G">G</option>
                  </select>
                </div>
                <div>
                  <label className="label">RIF *</label>
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

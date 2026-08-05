import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'
import { useAuthStore } from '../store/auth'

interface Business { id: number; name: string; rif: string | null; address: string | null; phone: string | null; email: string | null; active: boolean; _count?: { branches: number; users: number } }

export default function Businesses() {
  const { user, setActive } = useAuthStore()
  const [items, setItems] = useState<Business[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Business | null>(null)
  const [form, setForm] = useState({ name: '', rif: '', address: '', phone: '', email: '' })
  const toast = useToastStore((s: any) => s.addToast)

  useEffect(() => { load() }, [])
  async function load() {
    const data = await api.businesses.list()
    setItems(Array.isArray(data) ? data : [])
  }

  function openNew() {
    setEditing(null)
    setForm({ name: '', rif: '', address: '', phone: '', email: '' })
    setShowForm(true)
  }

  function openEdit(b: Business) {
    setEditing(b)
    setForm({ name: b.name, rif: b.rif || '', address: b.address || '', phone: b.phone || '', email: b.email || '' })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    if (editing) {
      await api.businesses.update(editing.id, { ...form, rif: form.rif || null, address: form.address || null, phone: form.phone || null, email: form.email || null })
      toast('Negocio actualizado')
    } else {
      const created = await api.businesses.create({ ...form, rif: form.rif || null, address: form.address || null, phone: form.phone || null, email: form.email || null })
      toast('Negocio creado')
      if (user?.role === 'dueno') {
        setActive(created.id, user?.branchId ?? null)
        window.location.reload()
      }
    }
    setShowForm(false)
    load()
  }

  async function handleDelete(b: Business) {
    if (!confirm(`¿Desactivar el negocio "${b.name}"?`)) return
    await api.businesses.delete(b.id)
    toast('Negocio desactivado')
    load()
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Negocios</h1>
        <button onClick={openNew} className="btn-primary">+ Nuevo</button>
      </div>
      {items.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No hay negocios</p>
      ) : (
        <div className="space-y-2">
          {items.map((b) => (
            <div key={b.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏢</span>
                  <div>
                    <p className="font-medium text-gray-800">{b.name}</p>
                    <p className="text-xs text-gray-500">
                      {b.rif && `RIF ${b.rif}`} {b.phone && `• ${b.phone}`} {b.email && `• ${b.email}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{b._count?.branches ?? 0} suc. • {b._count?.users ?? 0} usu.</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(b)} className="text-sm text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => handleDelete(b)} className="text-sm text-red-600 hover:underline">Desactivar</button>
                  </div>
                </div>
              </div>
              {b.address && <p className="text-xs text-gray-500 mt-1 ml-10">{b.address}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Negocio' : 'Nuevo Negocio'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div>
                <label className="label">RIF</label>
                <input className="input" value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Dirección</label>
                <textarea className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
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
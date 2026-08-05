import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'
import { useAuthStore } from '../store/auth'

interface Business { id: number; name: string }
interface Branch { id: number; name: string }
interface AppUser {
  id: number
  name: string
  email: string
  role: string
  active: boolean
  businessId: number | null
  branchId: number | null
  business?: { id: number; name: string } | null
  branch?: { id: number; name: string } | null
}

const ROLE_LABELS: Record<string, string> = { superadmin: 'Superadmin', dueno: 'Dueño', admin: 'Admin', cajero: 'Cajero' }

export default function Users() {
  const { user, activeBusinessId } = useAuthStore()
  const [items, setItems] = useState<AppUser[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin', businessId: '', branchId: '' })
  const toast = useToastStore((s: any) => s.addToast)

  const isSuper = user?.role === 'superadmin'
  const businessId = isSuper ? (Number(form.businessId) || null) : (user?.businessId ?? activeBusinessId)

  useEffect(() => { load() }, [])
  useEffect(() => { if (isSuper) api.businesses.list().then((d: any) => setBusinesses(Array.isArray(d) ? d : [])).catch(() => {}) }, [isSuper])
  useEffect(() => {
    if (!businessId) { setBranches([]); return }
    api.branches.byBusiness(businessId).then((d: any) => setBranches(Array.isArray(d) ? d : [])).catch(() => setBranches([]))
  }, [isSuper, businessId, showForm])

  async function load() {
    const data = await api.users.list()
    setItems(Array.isArray(data) ? data : [])
  }

  function openNew() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', role: 'admin', businessId: user?.businessId ? String(user.businessId) : '', branchId: '' })
    setShowForm(true)
  }

  function openEdit(u: AppUser) {
    setEditing(u)
    setForm({
      name: u.name, email: u.email, password: '', role: u.role,
      businessId: u.businessId ? String(u.businessId) : '',
      branchId: u.branchId ? String(u.branchId) : '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.role) return
    if (!editing && !form.password) return
    const payload: any = {
      name: form.name, email: form.email, role: form.role,
      password: form.password || undefined,
      businessId: isSuper ? businessId : undefined,
      branchId: form.branchId ? Number(form.branchId) : null,
    }
    if (editing) {
      delete payload.branchId
      await api.users.update(editing.id, { ...payload, branchId: payload.branchId ?? editing.branchId })
      toast('Usuario actualizado')
    } else {
      await api.users.create(payload)
      toast('Usuario creado')
    }
    setShowForm(false)
    load()
  }

  async function handleDelete(u: AppUser) {
    if (!confirm(`¿Desactivar al usuario "${u.name}"?`)) return
    await api.users.delete(u.id)
    toast('Usuario desactivado')
    load()
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
        <button onClick={openNew} className="btn-primary">+ Nuevo</button>
      </div>
      {items.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No hay usuarios</p>
      ) : (
        <div className="space-y-2">
          {items.map((u) => (
            <div key={u.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : u.role === 'dueno' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {u.business?.name || ''}{u.branch?.name ? ` • ${u.branch.name}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-sm text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => handleDelete(u)} className="text-sm text-red-600 hover:underline">Desactivar</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Contraseña {editing && '(dejar vacía para no cambiar)'}</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
              </div>
              <div>
                <label className="label">Rol *</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {isSuper && <option value="dueno">Dueño</option>}
                  <option value="admin">Admin</option>
                  <option value="cajero">Cajero</option>
                </select>
              </div>
              {isSuper && (
                <div>
                  <label className="label">Negocio</label>
                  <select
                    className="input"
                    value={form.businessId}
                    onChange={(e) => setForm({ ...form, businessId: e.target.value, branchId: '' })}
                  >
                    <option value="">— Ninguno —</option>
                    {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              {form.role !== 'dueno' && form.role !== 'superadmin' && (
                <div>
                  <label className="label">Sucursal</label>
                  <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                    <option value="">— Sin sucursal —</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
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
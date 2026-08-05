import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'
import { useAuthStore } from '../store/auth'

interface Business { id: number; name: string }
interface Branch { id: number; name: string; businessId: number; address: string | null; phone: string | null; active: boolean; business?: Business }

export default function Branches() {
  const { user, activeBusinessId, activeBranchId, setActive } = useAuthStore()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [items, setItems] = useState<Branch[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const toast = useToastStore((s: any) => s.addToast)

  const isSuper = user?.role === 'superadmin'
  const businessId = isSuper ? activeBusinessId : (user?.businessId ?? activeBusinessId)

  useEffect(() => { if (isSuper) api.businesses.list().then((d: any) => setBusinesses(Array.isArray(d) ? d : [])).catch(() => {}) }, [isSuper])

  useEffect(() => { load() }, [businessId])

  async function load() {
    if (!businessId) { setItems([]); return }
    const data = isSuper ? await api.branches.byBusiness(businessId) : await api.branches.list()
    setItems(Array.isArray(data) ? data : [])
  }

  function openNew() {
    setEditing(null)
    setForm({ name: '', address: '', phone: '' })
    setShowForm(true)
  }

  function openEdit(b: Branch) {
    setEditing(b)
    setForm({ name: b.name, address: b.address || '', phone: b.phone || '' })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    const payload = { name: form.name, address: form.address || null, phone: form.phone || null, ...(isSuper && businessId ? { businessId } : {}) }
    if (editing) {
      await api.branches.update(editing.id, { name: form.name, address: form.address || null, phone: form.phone || null })
      toast('Sucursal actualizada')
    } else {
      await api.branches.create(payload)
      toast('Sucursal creada')
    }
    setShowForm(false)
    load()
  }

  async function handleSelect(b: Branch) {
    setActive(businessId, b.id)
    window.location.reload()
  }

  async function handleDelete(b: Branch) {
    if (!confirm(`¿Desactivar la sucursal "${b.name}"?`)) return
    await api.branches.delete(b.id)
    toast('Sucursal desactivada')
    load()
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800">Sucursales</h1>
        <div className="flex items-center gap-2">
          {isSuper && (
            <select
              className="input max-w-[180px]"
              value={businessId ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                setActive(id, null)
                window.location.reload()
              }}
            >
              <option value="">Negocio…</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          {businessId && <button onClick={openNew} className="btn-primary">+ Nueva</button>}
        </div>
      </div>

      {!businessId && <p className="text-gray-400 text-center py-12">Selecciona un negocio para ver sus sucursales</p>}
      {businessId && items.length === 0 && (
        <p className="text-gray-400 text-center py-12">No hay sucursales</p>
      )}

      <div className="space-y-2">
        {items.map((b) => {
          const isActiveBranch = b.id === (activeBranchId ?? user?.branchId)
          return (
            <div key={b.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏬</span>
                  <div>
                    <p className="font-medium text-gray-800">{b.name} {isActiveBranch && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-1">activa</span>}</p>
                    <p className="text-xs text-gray-500">
                      {[b.address, b.phone].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSelect(b)} className="text-sm text-blue-600 hover:underline">Usar</button>
                  <button onClick={() => openEdit(b)} className="text-sm text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(b)} className="text-sm text-red-600 hover:underline">Desactivar</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
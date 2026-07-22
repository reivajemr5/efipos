import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

interface Category { id: number; name: string; active: boolean }

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const toast = useToastStore((s: any) => s.addToast)

  useEffect(() => { load() }, [])
  async function load() { const data = await api.categories.list(); setCategories(data) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    if (editing) { await api.categories.update(editing.id, { name }); toast('Categoría actualizada') }
    else { await api.categories.create({ name }); toast('Categoría creada') }
    setName(''); setEditing(null); setShowForm(false); load()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta categoría?')) return
    await api.categories.delete(id); toast('Categoría eliminada'); load()
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Categorías</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nueva</button>
      </div>
      {categories.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No hay categorías</p>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="card flex items-center justify-between p-4 hover:shadow-md transition-shadow">
              <span className="font-medium text-gray-800">{c.name}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(c); setName(c.name); setShowForm(true) }} className="text-sm text-blue-600 hover:underline">Editar</button>
                <button onClick={() => handleDelete(c.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
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

import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [name, setName] = useState('')
  const addToast = useToastStore((s) => s.addToast)

  async function load() { setCategories(await api.categories.list()) }
  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (editing) {
      await api.categories.update(editing.id, { name })
      addToast('Categoría actualizada', 'success')
    } else {
      await api.categories.create({ name })
      addToast('Categoría creada', 'success')
    }
    setShowForm(false)
    setEditing(null)
    setName('')
    load()
  }

  async function remove(id: number) {
    if (!confirm('¿Desactivar esta categoría?')) return
    await api.categories.delete(id)
    addToast('Categoría desactivada', 'success')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Categorías</h2>
        <button onClick={() => { setEditing(null); setName(''); setShowForm(true) }}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm">+ Nueva</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-md mx-4 shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'Editar' : 'Nueva'} Categoría</h3>
            <form onSubmit={save} className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre *" required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm font-medium">
                  {editing ? 'Guardar' : 'Crear'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.length === 0 && <p className="text-gray-400 text-center py-12">No hay categorías registradas</p>}
        {categories.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <p className="font-semibold text-gray-800">{c.name}</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(c); setName(c.name); setShowForm(true) }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">Editar</button>
              <button onClick={() => remove(c.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

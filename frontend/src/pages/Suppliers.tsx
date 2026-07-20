import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface Supplier {
  id: number
  name: string
  documentType: string
  documentNumber: string
  phone: string | null
  address: string | null
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', documentType: 'J', documentNumber: '', phone: '', address: '' })

  async function load() {
    setSuppliers(await api.suppliers.list())
  }

  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      await api.suppliers.update(editing.id, form)
    } else {
      await api.suppliers.create(form)
    }
    setShowForm(false)
    setEditing(null)
    setForm({ name: '', documentType: 'J', documentNumber: '', phone: '', address: '' })
    load()
  }

  function edit(s: Supplier) {
    setEditing(s)
    setForm({ name: s.name, documentType: s.documentType, documentNumber: s.documentNumber, phone: s.phone || '', address: s.address || '' })
    setShowForm(true)
  }

  async function remove(id: number) {
    if (!confirm('¿Eliminar este proveedor?')) return
    await api.suppliers.delete(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Proveedores</h2>
        <button onClick={() => { setEditing(null); setForm({ name: '', documentType: 'J', documentNumber: '', phone: '', address: '' }); setShowForm(true) }}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800">+ Nuevo</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'Editar' : 'Nuevo'} Proveedor</h3>
            <form onSubmit={save} className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2 border rounded-lg" required />
              <div className="flex gap-2">
                <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} className="px-3 py-2 border rounded-lg">
                  <option value="J">J</option><option value="V">V</option><option value="E">E</option>
                </select>
                <input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} placeholder="RIF" className="flex-1 px-3 py-2 border rounded-lg" required />
              </div>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" className="w-full px-3 py-2 border rounded-lg" />
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección" className="w-full px-3 py-2 border rounded-lg" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2 rounded-lg">{editing ? 'Guardar' : 'Crear'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{s.name}</p>
              <p className="text-sm text-gray-500">{s.documentType}-{s.documentNumber} {s.phone && `· ${s.phone}`}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => edit(s)} className="text-blue-600 hover:underline text-sm">Editar</button>
              <button onClick={() => remove(s.id)} className="text-red-600 hover:underline text-sm">Eliminar</button>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && <p className="text-gray-400 text-center py-8">No hay proveedores registrados</p>}
      </div>
    </div>
  )
}

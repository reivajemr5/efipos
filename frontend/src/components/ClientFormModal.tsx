import { useState } from 'react'
import { api } from '../services/api'

interface Client {
  id: number; name: string; documentType: string; documentNumber: string
  phone: string | null; address: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (client: Client) => void
}

export default function ClientFormModal({ open, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const client = await api.clients.create(form)
      onSaved(client)
      onClose()
      setForm({ name: '', documentType: 'V', documentNumber: '', phone: '', address: '' })
    } catch { }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Nuevo Cliente</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre"
            className="w-full px-3 py-2 border rounded-lg" required />
          <div className="flex gap-2">
            <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}
              className="px-3 py-2 border rounded-lg">
              <option value="V">V</option><option value="J">J</option><option value="E">E</option>
            </select>
            <input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} placeholder="N° documento"
              className="flex-1 px-3 py-2 border rounded-lg" required />
          </div>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono"
            className="w-full px-3 py-2 border rounded-lg" />
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección"
            className="w-full px-3 py-2 border rounded-lg" />
          <div className="flex gap-2 pt-2">
            <button type="submit"
              className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800">Crear y seleccionar</button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

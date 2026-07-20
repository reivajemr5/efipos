import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface Product {
  id: number
  code: string
  name: string
  description: string | null
  price: number
  currency: string
  ivaPercent: number
  stock: number
  minStock: number
  supplierId: number | null
  supplier: { id: number; name: string } | null
}

interface Supplier {
  id: number
  name: string
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ code: '', name: '', description: '', price: '', currency: 'bs', ivaPercent: '16', stock: '0', minStock: '5', supplierId: '' })

  async function load() {
    const [prods, sups] = await Promise.all([
      api.products.list(search ? `q=${search}` : ''),
      api.suppliers.list(),
    ])
    setProducts(prods)
    setSuppliers(sups)
  }

  useEffect(() => { load() }, [search])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const data = { ...form, price: Number(form.price), currency: form.currency, ivaPercent: Number(form.ivaPercent), stock: Number(form.stock), minStock: Number(form.minStock), supplierId: form.supplierId ? Number(form.supplierId) : null }
    if (editing) {
      await api.products.update(editing.id, data)
    } else {
      await api.products.create(data)
    }
    setShowForm(false)
    setEditing(null)
    setForm({ code: '', name: '', description: '', price: '', currency: 'bs', ivaPercent: '16', stock: '0', minStock: '5', supplierId: '' })
    load()
  }

  function edit(p: Product) {
    setEditing(p)
    setForm({ code: p.code, name: p.name, description: p.description || '', price: String(p.price), currency: p.currency, ivaPercent: String(p.ivaPercent), stock: String(p.stock), minStock: String(p.minStock), supplierId: p.supplierId ? String(p.supplierId) : '' })
    setShowForm(true)
  }

  async function remove(id: number) {
    if (!confirm('¿Desactivar este producto?')) return
    await api.products.delete(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Productos</h2>
        <button onClick={() => { setEditing(null); setForm({ code: '', name: '', description: '', price: '', currency: 'bs', ivaPercent: '16', stock: '0', minStock: '5', supplierId: '' }); setShowForm(true) }}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800">+ Nuevo</button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o código..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'Editar' : 'Nuevo'} Producto</h3>
            <form onSubmit={save} className="space-y-3">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Código" className="w-full px-3 py-2 border rounded-lg" required />
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2 border rounded-lg" required />
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" className="w-full px-3 py-2 border rounded-lg" />
              <div className="flex gap-2">
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" step="0.01" placeholder="Precio" className="flex-1 px-3 py-2 border rounded-lg" required />
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="px-3 py-2 border rounded-lg">
                  <option value="bs">Bs</option><option value="usd">$</option>
                </select>
                <select value={form.ivaPercent} onChange={(e) => setForm({ ...form, ivaPercent: e.target.value })} className="px-3 py-2 border rounded-lg">
                  <option value="0">0%</option><option value="8">8%</option><option value="16">16%</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} type="number" placeholder="Stock" className="flex-1 px-3 py-2 border rounded-lg" />
                <input value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} type="number" placeholder="Stock mín" className="flex-1 px-3 py-2 border rounded-lg" />
              </div>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2 rounded-lg">{editing ? 'Guardar' : 'Crear'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map((p) => {
          const lowStock = p.stock <= p.minStock
          return (
            <div key={p.id} className={`bg-white p-4 rounded-lg shadow-sm ${lowStock ? 'border-l-4 border-amber-500' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.code}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => edit(p)} className="text-blue-600 hover:underline text-sm">Editar</button>
                  <button onClick={() => remove(p.id)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <span className="font-mono">{p.currency === 'usd' ? '$' : 'Bs.'}{Number(p.price).toFixed(2)}</span>
                <span className="text-gray-500">IVA {p.ivaPercent}%</span>
                <span className={lowStock ? 'text-amber-700 font-semibold' : 'text-gray-700'}>
                  Stock: {p.stock}
                </span>
              </div>
              {p.supplier && <p className="text-xs text-gray-400 mt-1">Proveedor: {p.supplier.name}</p>}
            </div>
          )
        })}
        {products.length === 0 && <p className="text-gray-400 text-center py-8 col-span-2">No hay productos registrados</p>}
      </div>
    </div>
  )
}

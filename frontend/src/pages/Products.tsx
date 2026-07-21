import { useState, useEffect } from 'react'
import { api } from '../services/api'
import BarcodeScanner from '../components/BarcodeScanner'
import { useToastStore } from '../store/toast'

interface Category { id: number; name: string }
interface Supplier { id: number; name: string }
interface Product {
  id: number; type: string; code: string; name: string
  description: string | null; notes: string | null
  barcode: string | null; cost: number | null; price: number; price2: number | null
  currency: string; ivaPercent: number; stock: number; minStock: number
  category: Category | null; variations: any[]
  suppliers: { supplier: { id: number; name: string } }[]
  barcodes: { id: number; barcode: string }[]
}

const typeOptions = [
  { value: 'simple', label: 'Simple' },
  { value: 'compuesto', label: 'Compuesto' },
  { value: 'servicio', label: 'Servicio' },
]

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    type: 'simple', code: '', name: '', description: '', notes: '',
    barcode: '', barcodes: [] as string[], cost: '', price: '', price2: '',
    currency: 'bs', ivaPercent: '16', stock: '0', minStock: '5',
    categoryId: '', supplierIds: [] as number[], variations: '',
  })

  async function load() {
    const [prods, cats, sups] = await Promise.all([
      api.products.list(search ? `q=${search}` : ''),
      api.categories.list(),
      api.suppliers.list(),
    ])
    setProducts(prods)
    setCategories(cats)
    setSuppliers(sups)
  }

  useEffect(() => { load() }, [search])

  function toggleSupplier(id: number) {
    setForm((p) => ({ ...p, supplierIds: p.supplierIds.includes(id) ? p.supplierIds.filter((s) => s !== id) : [...p.supplierIds, id] }))
  }

  function addBarcode(b: string) {
    if (b && !form.barcodes.includes(b)) setForm((p) => ({ ...p, barcodes: [...p.barcodes, b], barcode: b }))
  }

  function removeBarcode(b: string) {
    setForm((p) => ({ ...p, barcodes: p.barcodes.filter((x) => x !== b) }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      type: form.type, code: form.code, name: form.name,
      description: form.description || null, notes: form.notes || null,
      barcode: form.barcode || null,
      barcodes: form.barcodes.filter(Boolean),
      cost: form.cost ? Number(form.cost) : 0,
      price: Number(form.price),
      price2: form.price2 ? Number(form.price2) : null,
      currency: form.currency, ivaPercent: Number(form.ivaPercent),
      stock: Number(form.stock), minStock: Number(form.minStock),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      variations: form.variations ? JSON.parse(form.variations) : [],
      supplierIds: form.supplierIds,
    }
    if (editing) {
      await api.products.update(editing.id, data)
      addToast('Producto actualizado', 'success')
    } else {
      await api.products.create(data)
      addToast('Producto creado', 'success')
    }
    setShowForm(false)
    setEditing(null)
    resetForm()
    load()
  }

  function resetForm() {
    setForm({ type: 'simple', code: '', name: '', description: '', notes: '', barcode: '', barcodes: [], cost: '', price: '', price2: '', currency: 'bs', ivaPercent: '16', stock: '0', minStock: '5', categoryId: '', supplierIds: [], variations: '' })
  }

  function edit(p: Product) {
    setEditing(p)
    setForm({
      type: p.type, code: p.code, name: p.name,
      description: p.description || '', notes: p.notes || '',
      barcode: p.barcode || '',
      barcodes: p.barcodes.map((b) => b.barcode),
      cost: p.cost ? String(p.cost) : '',
      price: String(p.price),
      price2: p.price2 ? String(p.price2) : '',
      currency: p.currency, ivaPercent: String(p.ivaPercent),
      stock: String(p.stock), minStock: String(p.minStock),
      categoryId: p.category ? String(p.category.id) : '',
      supplierIds: p.suppliers.map((ps) => ps.supplier.id),
      variations: Array.isArray(p.variations) ? JSON.stringify(p.variations) : '',
    })
    setShowForm(true)
  }

  async function remove(id: number) {
    if (!confirm('¿Desactivar este producto?')) return
    await api.products.delete(id)
    addToast('Producto desactivado', 'success')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Productos</h2>
        <button onClick={() => { setEditing(null); resetForm(); setShowForm(true) }}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm">+ Nuevo</button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, código o código de barras..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <button onClick={() => setScannerOpen(true)}
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 rounded-xl transition-colors text-sm text-gray-600 flex items-center gap-1">
          📷 Escanear
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'Editar' : 'Nuevo'} Producto</h3>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Sin categoría</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Código interno *"
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre *"
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
              </div>

              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows={2} />

              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Códigos de barras</label>
                <div className="flex gap-2 mb-1">
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Código de barras principal"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <button type="button" onClick={() => { if (form.barcode) addBarcode(form.barcode) }}
                    className="bg-gray-100 px-3 rounded-xl text-sm hover:bg-gray-200">+ Agregar</button>
                </div>
                {form.barcodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.barcodes.map((b) => (
                      <span key={b} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-lg">
                        {b}
                        <button type="button" onClick={() => removeBarcode(b)} className="text-blue-400 hover:text-blue-700">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Costo</label>
                  <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} type="number" step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Precio venta *</label>
                  <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" step="0.01" required
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Precio venta 2</label>
                  <input value={form.price2} onChange={(e) => setForm({ ...form, price2: e.target.value })} type="number" step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="bs">Bs</option><option value="usd">$</option>
                </select>
                <select value={form.ivaPercent} onChange={(e) => setForm({ ...form, ivaPercent: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="0">0% IVA</option><option value="8">8% IVA</option><option value="16">16% IVA</option>
                </select>
                <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} type="number" placeholder="Stock"
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                <input value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} type="number" placeholder="Stock mín"
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>

              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows={2} />

              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Variaciones (JSON)</label>
                <textarea value={form.variations} onChange={(e) => setForm({ ...form, variations: e.target.value })}
                  placeholder='[{"nombre": "Talla", "valores": ["S", "M", "L"]}, {"nombre": "Color", "valores": ["Rojo", "Azul"]}]'
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" rows={2} />
              </div>

              <div className="border border-gray-200 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-2">Proveedores que lo venden</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {suppliers.length === 0 && <p className="text-xs text-gray-400">No hay proveedores registrados</p>}
                  {suppliers.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-lg">
                      <input type="checkbox" checked={form.supplierIds.includes(s.id)} onChange={() => toggleSupplier(s.id)}
                        className="rounded text-blue-900" />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm font-medium">
                  {editing ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {products.length === 0 && <p className="text-gray-400 text-center py-12">No hay productos registrados</p>}
        {products.map((p) => {
          const lowStock = p.stock <= p.minStock
          return (
            <div key={p.id} className={`bg-white rounded-2xl border ${lowStock ? 'border-amber-200' : 'border-gray-100'} shadow-sm hover:shadow-md transition-shadow`}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.type === 'servicio' ? 'bg-purple-100 text-purple-700' : p.type === 'compuesto' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {typeOptions.find((o) => o.value === p.type)?.label || p.type}
                      </span>
                      {p.category && <span className="text-xs text-gray-400">{p.category.name}</span>}
                    </div>
                    <p className="font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{p.code}</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button onClick={() => edit(p)} className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">Editar</button>
                    <button onClick={() => remove(p.id)} className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors">Eliminar</button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="font-mono font-medium">{p.currency === 'usd' ? '$' : 'Bs.'}{Number(p.price).toFixed(2)}</span>
                  {p.price2 && <span className="font-mono text-gray-400">P2: {p.currency === 'usd' ? '$' : 'Bs.'}{Number(p.price2).toFixed(2)}</span>}
                  {p.cost !== null && Number(p.cost) > 0 && (
                    <span className="text-gray-500">Costo: <span className="font-mono">{p.currency === 'usd' ? '$' : 'Bs.'}{Number(p.cost).toFixed(2)}</span></span>
                  )}
                  <span className="text-gray-500">IVA {p.ivaPercent}%</span>
                  <span className={lowStock ? 'text-amber-700 font-semibold' : 'text-gray-700'}>
                    Stock: <span className="font-mono">{p.stock}</span>
                    {lowStock && <span className="text-amber-600 text-xs ml-1">(mín: {p.minStock})</span>}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.barcodes.map((b) => (
                    <span key={b.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-mono">{b.barcode}</span>
                  ))}
                </div>

                {p.suppliers.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Proveedores: {p.suppliers.map((ps) => ps.supplier.name).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onScan={(barcode) => { setSearch(barcode) }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  )
}

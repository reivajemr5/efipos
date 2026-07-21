import { useState, useEffect } from 'react'
import { api } from '../services/api'
import BarcodeScanner from '../components/BarcodeScanner'
import { useToastStore } from '../store/toast'

interface Category { id: number; name: string }
interface Supplier { id: number; name: string; documentType?: string; documentNumber?: string }
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
  { value: 'simple', label: 'Simple', desc: 'Producto físico con stock propio' },
  { value: 'compuesto', label: 'Compuesto', desc: 'Combo de productos del inventario' },
  { value: 'servicio', label: 'Servicio', desc: 'Servicio sin control de stock' },
]

const helpText: Record<string, string> = {
  type: 'Define si es un producto físico, un combo o un servicio',
  code: 'Código interno único para identificar el producto (ej: PRD-001)',
  name: 'Nombre del producto como aparecerá en facturas',
  description: 'Descripción detallada del producto (opcional)',
  barcode: 'Código de barras principal del producto',
  barcodesExtra: 'Agrega códigos de barras adicionales si el producto tiene más de uno',
  cost: 'Precio que te costó el producto al comprarlo (para calcular ganancia)',
  price: 'Precio de venta al público',
  price2: 'Segundo precio de venta (ej: precio por mayoreo)',
  currency: 'Moneda en la que se maneja el producto',
  iva: 'Porcentaje de IVA aplicable al producto',
  stock: 'Cantidad actual disponible en inventario',
  minStock: 'Cantidad mínima antes de alertar stock bajo',
  category: 'Categoría para agrupar productos similares',
  variations: 'Atributos del producto como talla, color, sabor, etc.',
  components: 'Productos del inventario que componen este combo',
  notes: 'Notas internas (no visibles en facturas)',
  suppliers: 'Proveedores que venden este producto',
}

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
    barcode: '', barcodes: [] as string[],
    cost: '', price: '', price2: '',
    currency: 'bs', ivaPercent: '0', stock: '0', minStock: '5',
    categoryId: '', supplierIds: [] as number[],
    variations: [] as { name: string; values: string[] }[],
    components: [] as { productId: number; name: string; quantity: number }[],
    newVarName: '', newVarValues: '',
  })

  // Inline creators
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', documentType: 'J', documentNumber: '' })
  const [componentSearch, setComponentSearch] = useState('')

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
  function removeBarcode(b: string) { setForm((p) => ({ ...p, barcodes: p.barcodes.filter((x) => x !== b) })) }

  function addVariation() {
    const name = form.newVarName.trim()
    const values = form.newVarValues.split(',').map((s) => s.trim()).filter(Boolean)
    if (!name || values.length === 0) return
    setForm((p) => ({ ...p, variations: [...p.variations, { name, values }], newVarName: '', newVarValues: '' }))
  }
  function removeVariation(i: number) { setForm((p) => ({ ...p, variations: p.variations.filter((_, idx) => idx !== i) })) }

  function addComponent(prod: Product) {
    if (form.components.find((c) => c.productId === prod.id)) return
    setForm((p) => ({ ...p, components: [...p.components, { productId: prod.id, name: prod.name, quantity: 1 }] }))
  }
  function removeComponent(id: number) { setForm((p) => ({ ...p, components: p.components.filter((c) => c.productId !== id) })) }
  function updateComponentQty(id: number, qty: number) {
    setForm((p) => ({ ...p, components: p.components.map((c) => c.productId === id ? { ...c, quantity: qty } : c) }))
  }

  async function createInlineCategory() {
    if (!newCategoryName.trim()) return
    const cat = await api.categories.create({ name: newCategoryName })
    setCategories((p) => [...p, cat])
    setForm((p) => ({ ...p, categoryId: String(cat.id) }))
    setNewCategoryName('')
    setShowNewCategory(false)
    addToast('Categoría creada', 'success')
  }

  async function createInlineSupplier() {
    const { name, documentType, documentNumber } = newSupplierForm
    if (!name.trim()) return
    const sup = await api.suppliers.create({ name, documentType, documentNumber })
    setSuppliers((p) => [...p, sup])
    setForm((p) => ({ ...p, supplierIds: [...p.supplierIds, sup.id] }))
    setNewSupplierForm({ name: '', documentType: 'J', documentNumber: '' })
    setShowNewSupplier(false)
    addToast('Proveedor creado', 'success')
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
      stock: form.type === 'servicio' ? 0 : Number(form.stock),
      minStock: Number(form.minStock),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      variations: form.type === 'compuesto' ? form.components : form.variations,
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
    setForm({
      type: 'simple', code: '', name: '', description: '', notes: '',
      barcode: '', barcodes: [], cost: '', price: '', price2: '',
      currency: 'bs', ivaPercent: '0', stock: '0', minStock: '5',
      categoryId: '', supplierIds: [], variations: [], components: [],
      newVarName: '', newVarValues: '',
    })
  }

  function edit(p: Product) {
    const isComposite = p.type === 'compuesto'
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
      variations: isComposite ? [] : (Array.isArray(p.variations) ? p.variations.filter((v: any) => v.name) : []),
      components: isComposite ? (Array.isArray(p.variations) ? p.variations : []) : [],
      newVarName: '', newVarValues: '',
    })
    setShowForm(true)
  }

  async function remove(id: number) {
    if (!confirm('¿Desactivar este producto?')) return
    await api.products.delete(id)
    addToast('Producto desactivado', 'success')
    load()
  }

  const availableComponents = products.filter((p) =>
    p.type !== 'compuesto' && p.id !== editing?.id &&
    !form.components.some((c) => c.productId === p.id) &&
    (p.name.toLowerCase().includes(componentSearch.toLowerCase()) || p.code.toLowerCase().includes(componentSearch.toLowerCase()))
  )

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
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 rounded-xl transition-colors text-sm text-gray-600 flex items-center gap-1">📷 Escanear</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? `Editar: ${editing.name}` : 'Nuevo Producto'}</h3>
            <form onSubmit={save} className="space-y-5">

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de producto <span className="text-gray-400 font-normal">— {helpText.type}</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {typeOptions.map((o) => (
                    <button key={o.value} type="button" onClick={() => setForm({ ...form, type: o.value })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${form.type === o.value ? 'border-blue-900 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className="text-sm font-medium text-gray-800">{o.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Código + Nombre */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código interno <span className="text-gray-400 font-normal">— {helpText.code}</span></label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ej: PRD-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-gray-400 font-normal">— {helpText.name}</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del producto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-gray-400 font-normal">— {helpText.description}</span></label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción del producto (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows={2} />
              </div>

              {/* Código de barras */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Códigos de barras <span className="text-gray-400 font-normal">— {helpText.barcodesExtra}</span></label>
                <div className="flex gap-2 mb-1">
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Código de barras principal"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <button type="button" onClick={() => { if (form.barcode) addBarcode(form.barcode) }}
                    className="bg-gray-100 px-3 rounded-xl text-sm hover:bg-gray-200">+ Agregar</button>
                </div>
                {form.barcodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.barcodes.map((b) => (
                      <span key={b} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-lg">
                        {b} <button type="button" onClick={() => removeBarcode(b)} className="text-blue-400 hover:text-blue-700">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Precios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Precios</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Costo <span className="text-gray-400">— {helpText.cost}</span></label>
                    <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} type="number" step="0.01" placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    {form.cost && form.price && Number(form.price) > 0 && Number(form.cost) > 0 && (
                      <p className={`text-xs mt-0.5 ${Number(form.price) >= Number(form.cost) ? 'text-green-600' : 'text-red-600'}`}>
                        Margen: {((Number(form.price) - Number(form.cost)) / Number(form.cost) * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Precio venta * <span className="text-gray-400">— {helpText.price}</span></label>
                    <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" step="0.01" placeholder="0.00" required
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Precio 2 (Mayor) <span className="text-gray-400">— {helpText.price2}</span></label>
                    <input value={form.price2} onChange={(e) => setForm({ ...form, price2: e.target.value })} type="number" step="0.01" placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
              </div>

              {/* Moneda, IVA, Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Configuración de inventario</label>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Moneda</label>
                    <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="bs">Bs</option><option value="usd">$</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">IVA %</label>
                    <select value={form.ivaPercent} onChange={(e) => setForm({ ...form, ivaPercent: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="0">0% (Exento)</option><option value="8">8%</option><option value="16">16%</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Stock actual</label>
                    <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} type="number" placeholder="0"
                      disabled={form.type === 'servicio'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-50 disabled:text-gray-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Stock mínimo</label>
                    <input value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} type="number" placeholder="5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
              </div>

              {/* Categoría + inline create */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-gray-400 font-normal">— {helpText.category}</span></label>
                <div className="flex gap-2">
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Sin categoría</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewCategory(true)}
                    className="bg-green-100 text-green-700 px-3 rounded-xl text-sm hover:bg-green-200 whitespace-nowrap">+ Nueva</button>
                </div>
                {showNewCategory && (
                  <div className="flex gap-2 mt-2 animate-slide-in">
                    <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nombre de la categoría"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm" autoFocus />
                    <button type="button" onClick={createInlineCategory}
                      className="bg-blue-900 text-white px-3 py-2 rounded-xl text-sm">Crear</button>
                    <button type="button" onClick={() => setShowNewCategory(false)}
                      className="text-gray-400 px-2 text-sm">✕</button>
                  </div>
                )}
              </div>

              {/* Variaciones (para simple/servicio) */}
              {form.type !== 'compuesto' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variaciones <span className="text-gray-400 font-normal">— {helpText.variations}</span></label>
                  <div className="flex gap-2 mb-2">
                    <input value={form.newVarName} onChange={(e) => setForm({ ...form, newVarName: e.target.value })} placeholder="Ej: Talla, Color, Sabor"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                    <input value={form.newVarValues} onChange={(e) => setForm({ ...form, newVarValues: e.target.value })} placeholder="Valores: S,M,L"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                    <button type="button" onClick={addVariation}
                      className="bg-blue-900 text-white px-3 rounded-xl text-sm">+</button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">Ej: Nombre "Talla", Valores "S, M, L" — Separa valores con coma</p>
                  {form.variations.length > 0 && (
                    <div className="space-y-1.5">
                      {form.variations.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                          <span className="text-sm font-medium text-gray-700 min-w-20">{v.name}:</span>
                          <div className="flex flex-wrap gap-1">
                            {v.values.map((val, j) => (
                              <span key={j} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-lg">{val}</span>
                            ))}
                          </div>
                          <button type="button" onClick={() => removeVariation(i)} className="ml-auto text-red-400 hover:text-red-600 text-sm">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Componentes (para compuesto) */}
              {form.type === 'compuesto' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Componentes del combo <span className="text-gray-400 font-normal">— {helpText.components}</span></label>

                  {/* Componentes agregados */}
                  {form.components.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {form.components.map((c) => (
                        <div key={c.productId} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                          <span className="text-sm text-gray-700 flex-1">{c.name}</span>
                          <input type="number" min="1" value={c.quantity}
                            onChange={(e) => updateComponentQty(c.productId, Number(e.target.value))}
                            className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center" />
                          <button type="button" onClick={() => removeComponent(c.productId)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Buscador de productos */}
                  <input value={componentSearch} onChange={(e) => setComponentSearch(e.target.value)} placeholder="Buscar producto para agregar al combo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm mb-1" />
                  {componentSearch && availableComponents.length > 0 && (
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                      {availableComponents.slice(0, 8).map((p) => (
                        <button key={p.id} type="button" onClick={() => { addComponent(p); setComponentSearch('') }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between">
                          <span>{p.code} - {p.name}</span>
                          <span className="text-gray-400 font-mono">stock: {p.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas <span className="text-gray-400 font-normal">— {helpText.notes}</span></label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas para uso interno (no se muestran en facturas)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows={2} />
              </div>

              {/* Proveedores */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Proveedores <span className="text-gray-400 font-normal">— {helpText.suppliers}</span></label>
                  <button type="button" onClick={() => setShowNewSupplier(true)}
                    className="text-blue-600 text-xs font-medium hover:text-blue-800">+ Nuevo proveedor</button>
                </div>
                <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                  {suppliers.length === 0 && <p className="text-xs text-gray-400 py-2 text-center">No hay proveedores. Crea uno nuevo.</p>}
                  <div className="space-y-1">
                    {suppliers.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg">
                        <input type="checkbox" checked={form.supplierIds.includes(s.id)} onChange={() => toggleSupplier(s.id)}
                          className="rounded text-blue-900" />
                        <span>{s.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{s.documentType}-{s.documentNumber}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {showNewSupplier && (
                  <div className="flex gap-2 mt-2 p-3 bg-gray-50 rounded-xl animate-slide-in">
                    <input value={newSupplierForm.name} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                      placeholder="Nombre" className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                    <select value={newSupplierForm.documentType} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, documentType: e.target.value })}
                      className="px-2 py-2 border border-gray-300 rounded-xl text-sm">
                      <option value="J">J</option><option value="V">V</option><option value="E">E</option>
                    </select>
                    <input value={newSupplierForm.documentNumber} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, documentNumber: e.target.value })}
                      placeholder="RIF" className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                    <button type="button" onClick={createInlineSupplier}
                      className="bg-blue-900 text-white px-3 py-2 rounded-xl text-sm">Crear</button>
                    <button type="button" onClick={() => setShowNewSupplier(false)}
                      className="text-gray-400 px-2 text-sm">✕</button>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
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

      {/* Product list */}
      <div className="space-y-2">
        {products.length === 0 && <p className="text-gray-400 text-center py-12">No hay productos registrados</p>}
        {products.map((p) => {
          const lowStock = p.stock <= p.minStock
          const isComposite = p.type === 'compuesto'
          const components = isComposite && Array.isArray(p.variations) ? p.variations as any[] : []
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
                    <button onClick={() => edit(p)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
                    <button onClick={() => remove(p.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Eliminar</button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="font-mono font-medium">{p.currency === 'usd' ? '$' : 'Bs.'}{Number(p.price).toFixed(2)}</span>
                  {p.price2 && <span className="font-mono text-gray-400">P2: {p.currency === 'usd' ? '$' : 'Bs.'}{Number(p.price2).toFixed(2)}</span>}
                  {p.cost !== null && Number(p.cost) > 0 && (
                    <span className="text-gray-500">Costo: <span className="font-mono">{p.currency === 'usd' ? '$' : 'Bs.'}{Number(p.cost).toFixed(2)}</span></span>
                  )}
                  <span className="text-gray-500">IVA {p.ivaPercent}%</span>
                  {p.type !== 'servicio' && (
                    <span className={lowStock ? 'text-amber-700 font-semibold' : 'text-gray-700'}>
                      Stock: <span className="font-mono">{p.stock}</span>
                      {lowStock && <span className="text-amber-600 text-xs ml-1">(mín: {p.minStock})</span>}
                    </span>
                  )}
                </div>

                {isComposite && components.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {components.map((c: any, i: number) => (
                      <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg">{c.quantity}x {c.name}</span>
                    ))}
                  </div>
                )}

                {!isComposite && p.barcodes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.barcodes.map((b) => (
                      <span key={b.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-mono">{b.barcode}</span>
                    ))}
                  </div>
                )}

                {p.suppliers.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">Proveedores: {p.suppliers.map((ps) => ps.supplier.name).join(', ')}</p>
                )}

                {p.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{p.description}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {scannerOpen && <BarcodeScanner onScan={(barcode) => setSearch(barcode)} onClose={() => setScannerOpen(false)} />}
    </div>
  )
}

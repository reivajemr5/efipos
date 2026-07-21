import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Tooltip from './Tooltip'
import { useToastStore } from '../store/toast'

interface Category { id: number; name: string }
interface Supplier { id: number; name: string; documentType?: string; documentNumber?: string }
interface Product {
  id: number; type: string; code: string; name: string
  brand: { id: number; name: string } | null
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

const tips = {
  type: 'Define si es un producto físico, un combo de varios productos, o un servicio sin inventario',
  code: 'Código único del producto. Ej: PRD-001, HAR-001',
  name: 'Nombre que aparecerá en facturas y búsquedas',
  description: 'Descripción detallada del producto (opcional)',
  barcode: 'Código de barras principal del producto',
  barcodesExtra: 'Si el producto tiene más de un código de barras, agrégales aquí',
  cost: 'Precio al que compras el producto. Sirve para calcular la ganancia',
  price: 'Precio de venta al público. Se calcula automáticamente según costo + margen',
  price2: 'Precio para ventas por mayoreo o precio alternativo. Se calcula automáticamente según costo + margen',
  margin: 'Porcentaje de ganancia sobre el costo para el precio de venta',
  margin2: 'Porcentaje de ganancia sobre el costo para el precio alternativo',
  currency: 'Moneda en la que se maneja el producto',
  iva: 'Porcentaje de IVA que aplica al producto. 0% si está exento',
  stock: 'Cantidad actual disponible en el inventario',
  minStock: 'Cuando el stock llegue a esta cantidad, se mostrará una alerta',
  category: 'Agrupa productos similares para organizarlos mejor',
  variations: 'Atributos como talla, color o sabor. Puedes asignar stock a cada variación',
  components: 'Productos del inventario que forman parte de este combo',
  notes: 'Notas internas. No se muestran en facturas',
  brand: 'Marca del producto para facilitar búsquedas y filtros',
  suppliers: 'Proveedores que venden este producto',
}

interface Props {
  open: boolean
  onClose: () => void
  editing?: Product | null
  onSaved: (product: Product) => void
}

export default function ProductFormModal({ open, onClose, editing, onSaved }: Props) {
  const addToast = useToastStore((s) => s.addToast)

  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([])
  const [attributeTemplates, setAttributeTemplates] = useState<{ id: number; name: string; values: { id: number; value: string }[] }[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])

  const [form, setForm] = useState({
    type: 'simple', code: '', name: '', brandId: '', description: '', notes: '',
    barcode: '', barcodes: [] as string[],
    cost: '', margin: '', price: '', margin2: '', price2: '',
    currency: 'bs', ivaPercent: '0', stock: '0', minStock: '5',
    categoryId: '', supplierIds: [] as number[],
    variations: [] as { name: string; values: { value: string; qty: number }[] }[],
    components: [] as { productId: number; name: string; quantity: number }[],
    newVarName: '', newVarValue: '', newVarQty: 0,
    templateSearch: '', templateSearchResults: [] as { id: number; name: string; values: { id: number; value: string }[] }[],
    showTemplateDropdown: false,
  })

  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', documentType: 'J', documentNumber: '' })
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [componentSearch, setComponentSearch] = useState('')

  useEffect(() => {
    if (!open) return
    Promise.all([
      api.categories.list(),
      api.suppliers.list(),
      api.brands.list(),
      api.attributeTemplates.list(),
      api.products.list(),
    ]).then(([cats, sups, brds, templates, prods]) => {
      setCategories(cats)
      setSuppliers(sups)
      setBrands(brds)
      setAttributeTemplates(templates)
      setAllProducts(prods)
    })
    if (editing) {
      const p = editing
      const isComposite = p.type === 'compuesto'
      setForm({
        type: p.type, code: p.code, name: p.name, brandId: p.brand ? String(p.brand.id) : '',
        description: p.description || '', notes: p.notes || '',
        barcode: p.barcode || '',
        barcodes: p.barcodes.map((b) => b.barcode),
        cost: p.cost ? String(p.cost) : '',
        margin: p.cost && Number(p.price) ? ((Number(p.price) - Number(p.cost)) / Number(p.cost) * 100).toFixed(1) : '',
        price: String(p.price),
        margin2: p.cost && p.price2 ? ((Number(p.price2) - Number(p.cost)) / Number(p.cost) * 100).toFixed(1) : '',
        price2: p.price2 ? String(p.price2) : '',
        currency: p.currency, ivaPercent: String(p.ivaPercent),
        stock: String(p.stock), minStock: String(p.minStock),
        categoryId: p.category ? String(p.category.id) : '',
        supplierIds: p.suppliers.map((ps) => ps.supplier.id),
        variations: isComposite ? [] : (Array.isArray(p.variations) ? p.variations.filter((v: any) => v.name) : []),
        components: isComposite ? (Array.isArray(p.variations) ? p.variations : []) : [],
        newVarName: '', newVarValue: '', newVarQty: 0,
        templateSearch: '', templateSearchResults: [], showTemplateDropdown: false,
      })
    } else {
      setForm({
        type: 'simple', code: '', name: '', brandId: '', description: '', notes: '',
        barcode: '', barcodes: [],
        cost: '', margin: '', price: '', margin2: '', price2: '',
        currency: 'bs', ivaPercent: '0', stock: '0', minStock: '5',
        categoryId: '', supplierIds: [], variations: [], components: [],
        newVarName: '', newVarValue: '', newVarQty: 0,
        templateSearch: '', templateSearchResults: [], showTemplateDropdown: false,
      })
    }
    setShowNewCategory(false)
    setShowNewSupplier(false)
    setSupplierSearch('')
    setComponentSearch('')
  }, [open, editing])

  function applyTemplate(t: { id: number; name: string; values: { id: number; value: string }[] }) {
    const existing = form.variations.find((v) => v.name === t.name)
    if (existing) return
    setForm((p) => ({
      ...p,
      variations: [...p.variations, { name: t.name, values: t.values.map((v) => ({ value: v.value, qty: 0 })) }],
      templateSearch: '', showTemplateDropdown: false,
    }))
  }

  async function createTemplateFromVar() {
    if (!form.newVarName.trim()) return
    const values = form.variations
      .filter((v) => v.name === form.newVarName)
      .flatMap((v) => v.values.map((vl) => vl.value))
    if (!values.length) return
    const template = await api.attributeTemplates.create({ name: form.newVarName.trim(), values })
    setAttributeTemplates((p) => [...p, template])
    addToast('Plantilla guardada', 'success')
  }

  function toggleSupplier(id: number) {
    setForm((p) => ({ ...p, supplierIds: p.supplierIds.includes(id) ? p.supplierIds.filter((s) => s !== id) : [...p.supplierIds, id] }))
  }

  function addBarcode(b: string) {
    if (b && !form.barcodes.includes(b)) setForm((p) => ({ ...p, barcodes: [...p.barcodes, b], barcode: b }))
  }
  function removeBarcode(b: string) { setForm((p) => ({ ...p, barcodes: p.barcodes.filter((x) => x !== b) })) }

  function addVarValue() {
    const name = form.newVarName.trim()
    const value = form.newVarValue.trim()
    if (!name || !value) return
    const existing = form.variations.find((v) => v.name === name)
    if (existing) {
      if (existing.values.some((v) => v.value === value)) return
      setForm((p) => ({
        ...p,
        variations: p.variations.map((v) => v.name === name ? { ...v, values: [...v.values, { value, qty: form.newVarQty || 0 }] } : v),
        newVarValue: '', newVarQty: 0,
      }))
    } else {
      setForm((p) => ({
        ...p,
        variations: [...p.variations, { name, values: [{ value, qty: form.newVarQty || 0 }] }],
        newVarName: '', newVarValue: '', newVarQty: 0,
      }))
    }
  }

  function removeVarValue(varIdx: number, valIdx: number) {
    setForm((p) => {
      const updated = p.variations.map((v, i) => i === varIdx ? { ...v, values: v.values.filter((_, j) => j !== valIdx) } : v)
      return { ...p, variations: updated.filter((v) => v.values.length > 0) }
    })
  }

  function removeVarGroup(varIdx: number) {
    setForm((p) => ({ ...p, variations: p.variations.filter((_, i) => i !== varIdx) }))
  }

  function updateVarQty(varIdx: number, valIdx: number, qty: number) {
    setForm((p) => ({
      ...p,
      variations: p.variations.map((v, i) => i === varIdx ? { ...v, values: v.values.map((vl, j) => j === valIdx ? { ...vl, qty } : vl) } : v),
    }))
  }

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
      brandId: form.brandId ? Number(form.brandId) : null, barcode: form.barcode || null,
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
    try {
      const product = editing
        ? await api.products.update(editing.id, data)
        : await api.products.create(data)
      addToast(editing ? 'Producto actualizado' : 'Producto creado', 'success')
      onSaved(product)
      onClose()
    } catch { }
  }

  const availableComponents = allProducts.filter((p) =>
    p.type !== 'compuesto' && p.id !== editing?.id &&
    !form.components.some((c) => c.productId === p.id) &&
    (p.name.toLowerCase().includes(componentSearch.toLowerCase()) || p.code.toLowerCase().includes(componentSearch.toLowerCase()))
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-5">{editing ? `Editar: ${editing.name}` : 'Nuevo Producto'}</h3>
        <form onSubmit={save} className="space-y-5">

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de producto <Tooltip text={tips.type} /></label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Código interno <Tooltip text={tips.code} /></label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ej: PRD-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <Tooltip text={tips.name} /></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del producto"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <Tooltip text={tips.description} /></label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción del producto (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows={2} />
          </div>

          {/* Marca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca <Tooltip text={tips.brand} /></label>
            <div className="flex gap-2">
              <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">Sin marca</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button type="button" onClick={async () => {
                const name = prompt('Nombre de la nueva marca:')
                if (!name?.trim()) return
                const brand = await api.brands.create({ name })
                setBrands((p) => [...p, brand])
                setForm({ ...form, brandId: String(brand.id) })
                addToast('Marca creada', 'success')
              }}
                className="bg-green-100 text-green-700 px-3 rounded-xl text-sm hover:bg-green-200 whitespace-nowrap">+ Nueva</button>
            </div>
          </div>

          {/* Código de barras */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Códigos de barras <Tooltip text={tips.barcodesExtra} /></label>
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

          {/* Precios con margen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Precios</label>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Costo * <Tooltip text={tips.cost} /></label>
                  <input value={form.cost} onChange={(e) => {
                    const c = e.target.value
                    setForm((p) => {
                      const m = p.margin ? Number(p.margin) : 0
                      const price = c && m ? (Number(c) * (1 + m / 100)).toFixed(2) : p.price
                      const price2 = c && p.margin2 ? (Number(c) * (1 + Number(p.margin2) / 100)).toFixed(2) : p.price2
                      return { ...p, cost: c, price, price2 }
                    })
                  }} type="number" step="0.01" placeholder="0.00" required
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div className="flex gap-1.5 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-gray-500 mb-0.5 block">Margen % <Tooltip text={tips.margin} /></label>
                    <input value={form.margin} onChange={(e) => {
                      const m = e.target.value
                      setForm((p) => ({ ...p, margin: m, price: p.cost && m ? (Number(p.cost) * (1 + Number(m) / 100)).toFixed(2) : p.price }))
                    }} type="number" step="0.1" placeholder="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <span className="text-gray-400 pb-2.5 shrink-0">→</span>
                  <div className="flex-[2] min-w-0">
                    <label className="text-xs text-gray-500 mb-0.5 block">Precio *</label>
                    <input value={form.price} onChange={(e) => {
                      const p = e.target.value
                      setForm((s) => ({ ...s, price: p, margin: s.cost && Number(p) && Number(s.cost) ? ((Number(p) - Number(s.cost)) / Number(s.cost) * 100).toFixed(1) : s.margin }))
                    }} type="number" step="0.01" placeholder="0.00" required
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 items-end">
                <div className="w-20 shrink-0">
                  <label className="text-xs text-gray-500 mb-0.5 block">Margen 2 % <Tooltip text={tips.margin2} /></label>
                  <input value={form.margin2} onChange={(e) => {
                    const m = e.target.value
                    setForm((p) => ({ ...p, margin2: m, price2: p.cost && m ? (Number(p.cost) * (1 + Number(m) / 100)).toFixed(2) : p.price2 }))
                  }} type="number" step="0.1" placeholder="15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <span className="text-gray-400 pb-2.5 shrink-0">→</span>
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-gray-500 mb-0.5 block">Precio 2 (Mayor)</label>
                  <input value={form.price2} onChange={(e) => {
                    const p = e.target.value
                    setForm((s) => ({ ...s, price2: p, margin2: s.cost && Number(p) && Number(s.cost) ? ((Number(p) - Number(s.cost)) / Number(s.cost) * 100).toFixed(1) : s.margin2 }))
                  }} type="number" step="0.01" placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Moneda, IVA, Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Configuración de inventario</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Moneda <Tooltip text={tips.currency} /></label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="bs">Bs</option><option value="usd">$</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">IVA % <Tooltip text={tips.iva} /></label>
                <select value={form.ivaPercent} onChange={(e) => setForm({ ...form, ivaPercent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="0">0% (Exento)</option><option value="8">8%</option><option value="16">16%</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Stock actual <Tooltip text={tips.stock} /></label>
                <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} type="number" placeholder="0"
                  disabled={form.type === 'servicio'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Stock mínimo <Tooltip text={tips.minStock} /></label>
                <input value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} type="number" placeholder="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
          </div>

          {/* Categoría + inline create */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <Tooltip text={tips.category} /></label>
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

          {/* Variaciones con plantillas */}
          {form.type !== 'compuesto' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variaciones <Tooltip text={tips.variations} /></label>

              {/* Template search */}
              <div className="relative mb-3">
                <input value={form.templateSearch} onChange={(e) => setForm({ ...form, templateSearch: e.target.value, showTemplateDropdown: true })}
                  onFocus={() => setForm((p) => ({ ...p, showTemplateDropdown: true }))}
                  onBlur={() => setTimeout(() => setForm((p) => ({ ...p, showTemplateDropdown: false })), 200)}
                  placeholder="Buscar plantilla de atributo (Talla, Color, Peso...)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none" />
                {form.showTemplateDropdown && form.templateSearch.trim() !== '' && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {attributeTemplates
                      .filter((t) => t.name.toLowerCase().includes(form.templateSearch.toLowerCase()))
                      .map((t) => (
                        <button key={t.id} type="button"
                          onMouseDown={() => applyTemplate(t)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between">
                          <span>{t.name}</span>
                          <span className="text-xs text-gray-400">{t.values.length} valores</span>
                        </button>
                      ))}
                    {attributeTemplates.filter((t) => t.name.toLowerCase().includes(form.templateSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                    )}
                  </div>
                )}
              </div>

              {/* Manual input */}
              <div className="flex flex-wrap gap-2 mb-2">
                <input value={form.newVarName} onChange={(e) => setForm({ ...form, newVarName: e.target.value })}
                  placeholder="Atributo: Talla, Color..."
                  className="flex-1 sm:w-36 sm:flex-none px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                <input value={form.newVarValue} onChange={(e) => setForm({ ...form, newVarValue: e.target.value })}
                  placeholder="Valor: S, Rojo..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                <input value={form.newVarQty} onChange={(e) => setForm({ ...form, newVarQty: Number(e.target.value) })}
                  type="number" min="0" placeholder="Stock"
                  className="w-20 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                <button type="button" onClick={addVarValue}
                  className="bg-blue-900 text-white px-3 rounded-xl text-sm">+</button>
                {form.newVarName.trim() && form.variations.some((v) => v.name === form.newVarName) && !attributeTemplates.some((t) => t.name === form.newVarName.trim()) && (
                  <button type="button" onClick={() => createTemplateFromVar()}
                    className="text-xs text-green-700 bg-green-50 px-2 rounded-xl hover:bg-green-100 whitespace-nowrap">💾 Plantilla</button>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-2">Ej: Atributo "Talla", Valor "S", Stock "10" — Asígnale stock a cada variación</p>

              {form.variations.map((v, vi) => (
                <div key={vi} className="mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600 mb-1">{v.name}</p>
                    <button type="button" onClick={() => removeVarGroup(vi)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {v.values.map((vl, vj) => (
                      <div key={vj} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                        <span className="text-sm text-gray-700">{vl.value}</span>
                        <input type="number" min="0" value={vl.qty}
                          onChange={(e) => updateVarQty(vi, vj, Number(e.target.value))}
                          className="w-14 text-center text-sm border border-gray-200 rounded-lg px-1 py-0.5" />
                        <button type="button" onClick={() => removeVarValue(vi, vj)} className="text-red-400 hover:text-red-600 text-sm ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Componentes (compuesto) */}
          {form.type === 'compuesto' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Componentes del combo <Tooltip text={tips.components} /></label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas <Tooltip text={tips.notes} /></label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas (no visibles en facturas)"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows={2} />
          </div>

          {/* Proveedores */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Proveedores <Tooltip text={tips.suppliers} /></label>
              <button type="button" onClick={() => setShowNewSupplier(true)}
                className="text-blue-600 text-xs font-medium hover:text-blue-800">+ Nuevo proveedor</button>
            </div>
            {form.supplierIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.supplierIds.map((id) => {
                  const s = suppliers.find((x) => x.id === id)
                  if (!s) return null
                  return (
                    <span key={id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full">
                      {s.name}
                      <button type="button" onClick={() => toggleSupplier(id)} className="hover:text-blue-600 leading-none">&times;</button>
                    </span>
                  )
                })}
              </div>
            )}
            <div className="relative">
              <input value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true) }}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                placeholder="Buscar proveedor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none" />
              {showSupplierDropdown && supplierSearch.trim() !== '' && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {suppliers
                    .filter((s) => !form.supplierIds.includes(s.id) && s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                    .map((s) => (
                      <button key={s.id} type="button"
                        onMouseDown={() => { toggleSupplier(s.id); setSupplierSearch(''); setShowSupplierDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                        <span>{s.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{s.documentType}-{s.documentNumber}</span>
                      </button>
                    ))}
                  {suppliers.filter((s) => !form.supplierIds.includes(s.id) && s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                  )}
                </div>
              )}
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
                <button type="button" onClick={() => setShowNewSupplier(false)} className="text-gray-400 px-2 text-sm">✕</button>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button type="submit" className="flex-1 bg-blue-900 text-white py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm font-medium">
              {editing ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

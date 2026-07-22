import { useState, useEffect } from 'react'
import { api } from '../services/api'
import BarcodeScanner from '../components/BarcodeScanner'
import ProductFormModal from '../components/ProductFormModal'
import ImportCsvModal from '../components/ImportCsvModal'
import { useToastStore } from '../store/toast'

interface Category { id: number; name: string }
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

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  async function load() {
    const prods = await api.products.list(search ? `q=${search}` : '')
    setProducts(prods)
  }

  useEffect(() => { load() }, [search])

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(p: Product) { setEditing(p); setModalOpen(true) }

  function onSaved() { load(); setEditing(null) }

  async function remove(id: number) {
    if (!confirm('¿Desactivar este producto?')) return
    await api.products.delete(id)
    addToast('Producto desactivado', 'success')
    load()
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="btn-secondary">📥 Importar CSV</button>
          <button onClick={openNew} className="btn-primary">+ Nuevo</button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, código o código de barras..."
            className="input pl-9" />
        </div>
        <button onClick={() => setScannerOpen(true)} className="btn-secondary">📷 Escanear</button>
      </div>

      <ProductFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        editing={editing} onSaved={onSaved} />

      {/* Product list */}
      <div className="space-y-2">
        {products.length === 0 && <p className="text-gray-400 text-center py-12">No hay productos registrados</p>}
        {products.map((p) => {
          const lowStock = p.stock <= p.minStock
          const isComposite = p.type === 'compuesto'
          const components = isComposite && Array.isArray(p.variations) ? p.variations as any[] : []
          const hasVariations = !isComposite && Array.isArray(p.variations) && p.variations.length > 0
          return (
            <div key={p.id} className={`card ${lowStock ? 'border-amber-200' : ''} hover:shadow-md transition-shadow`}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.type === 'servicio' ? 'bg-purple-100 text-purple-700' : p.type === 'compuesto' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {typeOptions.find((o) => o.value === p.type)?.label || p.type}
                      </span>
                      {p.category && <span className="text-xs text-gray-400">{p.category.name}</span>}
                      {p.brand && <span className="text-xs text-gray-400 font-medium">{p.brand.name}</span>}
                    </div>
                    <p className="font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{p.code}</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
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

                {hasVariations && (
                  <div className="mt-2 space-y-0.5">
                    {(p.variations as any[]).map((v: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-medium min-w-16">{v.name}:</span>
                        <div className="flex flex-wrap gap-1">
                          {v.values.map((vl: any, j: number) => (
                            <span key={j} className="bg-gray-100 px-2 py-0.5 rounded-lg">
                              {vl.value || vl} <span className="text-gray-400 font-mono ml-1">({vl.qty || 0})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isComposite && !hasVariations && p.barcodes.length > 0 && (
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

      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} onDone={load} />
      {scannerOpen && <BarcodeScanner onScan={(barcode) => setSearch(barcode)} onClose={() => setScannerOpen(false)} />}
    </div>
  )
}

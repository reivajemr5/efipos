import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { ParseResult } from 'papaparse'
import Papa from 'papaparse'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

interface CsvRow {
  nombre: string
  precio: string
  costo: string
  stock: string
  iva: string
  codigo_barra: string
  categoria: string
  marca: string
  descripcion: string
  tipo: string
  moneda: string
  precio2: string
  stock_minimo: string
  [key: string]: string
}

interface EditableRow {
  _selected: boolean
  _errors: string[]
  nombre: string
  precio: string
  costo: string
  stock: string
  iva: string
  codigo_barra: string
  categoria: string
  marca: string
  descripcion: string
  tipo: string
  moneda: string
  precio2: string
  stock_minimo: string
}

interface Category { id: number; name: string }
interface Brand { id: number; name: string }

interface ImportResult {
  total: number
  created: number
  errors: { row: number; name: string; error: string }[]
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

const TIPO_OPTIONS = ['simple', 'compuesto', 'servicio']
const MONEDA_OPTIONS = ['usd', 'bs']

function parseCSV(text: string): Promise<CsvRow[]> {
  return new Promise<CsvRow[]>((resolve, reject) => {
    Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'),
      complete: (results: ParseResult<CsvRow>) => resolve(results.data.filter((r: CsvRow) => r.nombre?.trim())),
      error: reject,
    })
  })
}

export default function ImportCsvModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [rows, setRows] = useState<EditableRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    if (!open) return
    api.categories.list().then(setCategories).catch(() => {})
    api.brands.list().then(setBrands).catch(() => {})
    setStep('upload')
    setRows([])
    setResult(null)
  }, [open])

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) { addToast('Solo archivos .csv', 'error'); return }
    const text = await file.text()
    const parsed = await parseCSV(text)
    if (parsed.length === 0) { addToast('No se encontraron filas con datos', 'error'); return }

    const mapped: EditableRow[] = parsed.map((r) => ({
      _selected: true,
      _errors: [],
      nombre: toTitleCase(r.nombre || ''),
      precio: r.precio?.trim() || '0',
      costo: r.costo?.trim() || '',
      stock: r.stock?.trim() || '0',
      iva: r.iva?.trim() || '16',
      codigo_barra: r.codigo_barra?.trim() || '',
      categoria: r.categoria?.trim() || 'General',
      marca: r.marca?.trim() || '',
      descripcion: r.descripcion?.trim() || '',
      tipo: TIPO_OPTIONS.includes(r.tipo?.trim()) ? r.tipo.trim() : 'simple',
      moneda: MONEDA_OPTIONS.includes(r.moneda?.trim()) ? r.moneda.trim() : 'usd',
      precio2: r.precio2?.trim() || '',
      stock_minimo: r.stock_minimo?.trim() || '5',
    }))

    setRows(mapped)
    setStep('preview')
    addToast(`${mapped.length} productos cargados del CSV`, 'info')
  }, [addToast])

  function updateRow(i: number, field: keyof EditableRow, value: string | boolean) {
    setRows((prev) => prev.map((r, j) => j === i ? { ...r, [field]: value } : r))
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i))
  }

  const selectedCount = useMemo(() => rows.filter(r => r._selected).length, [rows])

  async function handleImport() {
    const toImport = rows.filter(r => r._selected)
    if (toImport.length === 0) { addToast('Selecciona al menos un producto', 'error'); return }

    setLoading(true)
    try {
      const payload = toImport.map((r) => {
        const cat = categories.find((c) => c.name.toLowerCase() === r.categoria.toLowerCase())
        return {
          name: r.nombre,
          price: parseFloat(r.precio) || 0,
          cost: r.costo ? parseFloat(r.costo) : undefined,
          stock: r.stock ? parseFloat(r.stock) : undefined,
          ivaPercent: parseInt(r.iva) || 0,
          currency: r.moneda,
          barcode: r.codigo_barra || undefined,
          description: r.descripcion || undefined,
          categoryId: cat?.id ?? null,
          code: undefined,
        }
      })

      const res = await api.products.import({ products: payload })
      setResult(res)
      setStep('result')
      if (res.created > 0) {
        addToast(`${res.created} productos importados`, 'success')
        onDone()
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error al importar', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { if (step === 'upload') onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Importar productos</h3>
            <p className="text-xs text-gray-400">
              {step === 'upload' && 'Selecciona un archivo CSV para comenzar'}
              {step === 'preview' && `${rows.length} productos cargados — ${selectedCount} seleccionados`}
              {step === 'result' && 'Resultado de la importación'}
            </p>
          </div>
          {step !== 'result' && (
            <button onClick={onClose} className="text-gray-400 p-1 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Upload step */}
        {step === 'upload' && (
          <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
            <div
              className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all w-full max-w-lg"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <div className="text-4xl mb-3 text-gray-300">📂</div>
              <p className="text-gray-600 font-medium mb-1">Haz clic para seleccionar o arrastra el archivo</p>
              <p className="text-xs text-gray-400">Archivo CSV con tus productos</p>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            <div className="text-xs text-gray-400 text-center max-w-md">
              <p className="font-medium mb-1">Columnas soportadas:</p>
              <code className="text-blue-600">nombre, precio, costo, stock, iva, codigo_barra, categoria, marca, descripcion, tipo, moneda, precio2, stock_minimo</code>
            </div>
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && (
          <>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="px-3 py-2 w-10">
                      <input type="checkbox" checked={selectedCount === rows.length} onChange={() => setRows((prev) => prev.map(r => ({ ...r, _selected: selectedCount !== rows.length })))} className="accent-blue-900" />
                    </th>
                    <th className="px-3 py-2 w-10">#</th>
                    <th className="px-3 py-2 min-w-[180px]">Nombre</th>
                    <th className="px-3 py-2 w-20 text-right">Precio $</th>
                    <th className="px-3 py-2 w-20 text-right">Costo $</th>
                    <th className="px-3 py-2 w-20 text-right">Stock</th>
                    <th className="px-3 py-2 w-16 text-right">IVA</th>
                    <th className="px-3 py-2 min-w-[120px]">Categoría</th>
                    <th className="px-3 py-2 min-w-[100px]">Marca</th>
                    <th className="px-3 py-2 min-w-[120px]">Código Barra</th>
                    <th className="px-3 py-2 w-14 text-center">Tipo</th>
                    <th className="px-3 py-2 w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => (
                    <tr key={i} className={`hover:bg-gray-50/50 ${!row._selected ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={row._selected} onChange={() => updateRow(i, '_selected', !row._selected)} className="accent-blue-900" />
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input value={row.nombre} onChange={(e) => updateRow(i, 'nombre', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-gray-800" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.precio} onChange={(e) => updateRow(i, 'precio', e.target.value)}
                          type="number" step="0.01" min="0"
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-right font-mono text-gray-800" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.costo} onChange={(e) => updateRow(i, 'costo', e.target.value)}
                          type="number" step="0.01" min="0"
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-right font-mono text-gray-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.stock} onChange={(e) => updateRow(i, 'stock', e.target.value)}
                          type="number" step="0.01" min="0"
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-right font-mono text-gray-800" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.iva} onChange={(e) => updateRow(i, 'iva', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-right font-mono text-gray-600">
                          <option value="0">0%</option>
                          <option value="8">8%</option>
                          <option value="16">16%</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.categoria} onChange={(e) => updateRow(i, 'categoria', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-gray-700">
                          <option value="General">General</option>
                          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.marca} onChange={(e) => updateRow(i, 'marca', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-gray-700">
                          <option value="">—</option>
                          {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.codigo_barra} onChange={(e) => updateRow(i, 'codigo_barra', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 font-mono text-xs text-gray-600" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select value={row.tipo} onChange={(e) => updateRow(i, 'tipo', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-xs text-gray-600">
                          {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => removeRow(i)} className="text-red-300 hover:text-red-500 text-sm">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom bar */}
            <div className="p-3 border-t border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div className="text-xs text-gray-500">
                {rows.length} productos · {selectedCount} seleccionados · {rows.filter(r => !r._selected).length} omitidos
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setStep('upload'); setRows([]) }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">
                  Volver
                </button>
                <button onClick={handleImport} disabled={loading || selectedCount === 0}
                  className="px-6 py-2 bg-blue-900 text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Importando...' : `Importar ${selectedCount} productos`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Result step */}
        {step === 'result' && result && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.total}</p>
                <p className="text-xs text-gray-500">Total procesados</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-xs text-gray-500">Creados</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{result.errors.length}</p>
                <p className="text-xs text-gray-500">Errores</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-700 mb-2">Errores:</p>
                <div className="max-h-40 overflow-y-auto text-xs bg-red-50 rounded-xl p-3 space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-red-600">Fila {e.row}: <strong>{e.name}</strong> — {e.error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                Cerrar
              </button>
              <button onClick={() => { setStep('upload'); setRows([]); setResult(null) }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                Importar otro archivo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useRef, useEffect, useMemo } from 'react'
import type { ParseResult } from 'papaparse'
import Papa from 'papaparse'
import { api } from '../services/api'
import { useToastStore } from '../store/toast'

interface Category { id: number; name: string }
interface Brand { id: number; name: string }

interface ImportResult {
  total: number
  created: number
  errors: { row: number; name: string; error: string }[]
}

type FieldKey =
  | 'nombre' | 'precio' | 'costo' | 'stock' | 'iva'
  | 'codigo_barra' | 'categoria' | 'marca' | 'descripcion'
  | 'tipo' | 'moneda' | 'precio2' | 'stock_minimo'

const FIELDS: { key: FieldKey; label: string; required: boolean; default: string }[] = [
  { key: 'nombre', label: 'Nombre', required: true, default: '' },
  { key: 'precio', label: 'Precio', required: true, default: '0' },
  { key: 'costo', label: 'Costo', required: false, default: '' },
  { key: 'stock', label: 'Stock', required: false, default: '0' },
  { key: 'iva', label: 'IVA %', required: false, default: '16' },
  { key: 'codigo_barra', label: 'Código de barra', required: false, default: '' },
  { key: 'categoria', label: 'Categoría', required: false, default: 'General' },
  { key: 'marca', label: 'Marca', required: false, default: '' },
  { key: 'descripcion', label: 'Descripción', required: false, default: '' },
  { key: 'tipo', label: 'Tipo', required: false, default: 'simple' },
  { key: 'moneda', label: 'Moneda', required: false, default: 'usd' },
  { key: 'precio2', label: 'Precio 2', required: false, default: '' },
  { key: 'stock_minimo', label: 'Stock mínimo', required: false, default: '5' },
]

const TIPO_OPTIONS = ['simple', 'compuesto', 'servicio']
const MONEDA_OPTIONS = ['usd', 'bs']

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

const COLUMN_MAP: Record<string, string> = {
  nombre: 'nombre', name: 'nombre', producto: 'nombre',
  precio: 'precio', 'precio unitario': 'precio', price: 'precio',
  costo: 'costo', 'costo unitario': 'costo', cost: 'costo',
  stock: 'stock', cantidad: 'stock', cant: 'stock', existencias: 'stock',
  iva: 'iva',
  'codigo de barra': 'codigo_barra', 'codigo de barras': 'codigo_barra', barcode: 'codigo_barra',
  categoria: 'categoria', category: 'categoria',
  marca: 'marca', brand: 'marca',
  descripcion: 'descripcion', description: 'descripcion',
  notas: 'notas', notes: 'notas',
  tipo: 'tipo', type: 'tipo',
  moneda: 'moneda', currency: 'moneda',
  precio2: 'precio2', 'precio 2': 'precio2',
  'stock minimo': 'stock_minimo', 'stock minim': 'stock_minimo', minstock: 'stock_minimo',
}

function autoDetectField(col: string): FieldKey | null {
  const cleaned = col.trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
  const mapped = COLUMN_MAP[cleaned]
  return (mapped as FieldKey) || null
}

export default function ImportCsvModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload')
  const [rawColumns, setRawColumns] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, FieldKey | null>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    if (!open) return
    api.categories.list().then(setCategories).catch(() => {})
    api.brands.list().then(setBrands).catch(() => {})
    setStep('upload')
    setRawColumns([])
    setRawRows([])
    setResult(null)
    setProgress(0)
  }, [open])

  const handleFile = useRef(async (file: File) => {
    if (!file.name.endsWith('.csv')) { addToast('Solo archivos .csv', 'error'); return }
    const text = await file.text()
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
    if (result.data.length === 0) { addToast('No se encontraron filas con datos', 'error'); return }

    const cols = result.meta.fields?.filter(Boolean) || []
    setRawColumns(cols)
    setRawRows(result.data)

    const mapping: Record<string, FieldKey | null> = {}
    for (const col of cols) {
      const detected = autoDetectField(col)
      mapping[col] = detected
    }
    setColumnMapping(mapping)
    setStep('mapping')
  }, [])

  const mappedRows = useMemo(() => {
    return rawRows.map((r) => {
      const row: Record<string, string> = {}
      for (const field of FIELDS) {
        const col = Object.entries(columnMapping).find(([, v]) => v === field.key)?.[0]
        const val = col ? r[col]?.trim() : undefined
        row[field.key] = val || field.default
      }
      return row as Record<FieldKey, string>
    }).filter((r) => r.nombre)
  }, [rawRows, columnMapping])

  function isFieldUsed(key: FieldKey): boolean {
    return Object.values(columnMapping).includes(key)
  }

  function buildPreviewRows() {
    return mappedRows.map((r) => ({
      _selected: true,
      nombre: toTitleCase(r.nombre || ''),
      precio: r.precio || '0',
      costo: r.costo || '',
      stock: r.stock || '0',
      iva: r.iva || '16',
      codigo_barra: r.codigo_barra || '',
      categoria: r.categoria || 'General',
      marca: r.marca || '',
      descripcion: r.descripcion || '',
      tipo: TIPO_OPTIONS.includes(r.tipo) ? r.tipo : 'simple',
      moneda: MONEDA_OPTIONS.includes(r.moneda) ? r.moneda : 'usd',
      precio2: r.precio2 || '',
      stock_minimo: r.stock_minimo || '5',
    }))
  }

  const [previewRows, setPreviewRows] = useState<ReturnType<typeof buildPreviewRows>>([])

  function goToPreview() {
    if (!isFieldUsed('nombre')) { addToast('Debes mapear la columna "Nombre"', 'error'); return }
    setPreviewRows(buildPreviewRows())
    setStep('preview')
  }

  function updateRow(i: number, field: string, value: string | boolean) {
    setPreviewRows((prev) => prev.map((r, j) => j === i ? { ...r, [field]: value } : r))
  }

  function removeRow(i: number) {
    setPreviewRows((prev) => prev.filter((_, j) => j !== i))
  }

  const selectedCount = useMemo(() => previewRows.filter(r => r._selected).length, [previewRows])

  async function handleImport() {
    const toImport = previewRows.filter(r => r._selected)
    if (toImport.length === 0) { addToast('Selecciona al menos un producto', 'error'); return }

    setLoading(true)
    setProgress(0)
    const total = toImport.length

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
        }
      })

      // Import in batches of 200 with progress
      const results: ImportResult = { total, created: 0, errors: [] }
      const batchSize = 200
      for (let i = 0; i < payload.length; i += batchSize) {
        const batch = payload.slice(i, i + batchSize)
        try {
          const res = await api.products.import({ products: batch })
          results.created += res.created
          results.errors.push(...res.errors.map((e: any) => ({ ...e, row: e.row + i })))
        } catch {
          results.errors.push(...batch.map((_, j) => ({ row: i + j + 1, name: batch[j].name, error: 'Error en lote' })))
        }
        setProgress(Math.min((i + batchSize) / total * 100, 100))
      }

      setResult(results)
      setStep('result')
      if (results.created > 0) {
        addToast(`${results.created} productos importados`, 'success')
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { if (step === 'upload' || step === 'mapping') onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Importar productos</h3>
            <p className="text-xs text-gray-400">
              {step === 'upload' && 'Selecciona un archivo CSV'}
              {step === 'mapping' && 'Asigna cada columna del CSV a un campo del sistema'}
              {step === 'preview' && `${previewRows.length} productos · ${selectedCount} seleccionados`}
              {step === 'result' && 'Resultado de la importación'}
            </p>
          </div>
          {step !== 'result' && (
            <button onClick={onClose} className="text-gray-400 p-1 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* ========== UPLOAD ========== */}
        {step === 'upload' && (
          <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
            <div
              className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all w-full max-w-lg"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile.current(f) }}
            >
              <div className="text-4xl mb-3 text-gray-300">📂</div>
              <p className="text-gray-600 font-medium mb-1">Haz clic o arrastra el archivo</p>
              <p className="text-xs text-gray-400">Archivo CSV con tus productos</p>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile.current(f) }} />
            </div>
          </div>
        )}

        {/* ========== MAPPING ========== */}
        {step === 'mapping' && (
          <div className="p-4 space-y-4 overflow-auto">
            <p className="text-sm text-gray-600">
              Se detectaron <strong>{rawColumns.length}</strong> columnas. Asigna cada una al campo correspondiente o selecciona <em>Ignorar</em>.
            </p>
            <div className="space-y-2">
              {rawColumns.map((col) => (
                <div key={col} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="font-mono text-sm text-gray-700 min-w-[180px]">{col}</span>
                  <span className="text-gray-300">→</span>
                  <select
                    value={columnMapping[col] || ''}
                    onChange={(e) => setColumnMapping((prev) => ({ ...prev, [col]: (e.target.value as FieldKey) || null }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">— Ignorar —</option>
                    {FIELDS.map((f) => {
                      const alreadyUsed = isFieldUsed(f.key) && columnMapping[col] !== f.key
                      return (
                        <option key={f.key} value={f.key} disabled={alreadyUsed}>
                          {f.label} {f.required ? '*' : ''} {alreadyUsed ? '(ya asignado)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  {rawRows.length > 0 && (
                    <span className="text-xs text-gray-400 truncate max-w-[200px]">
                      Ej: {rawRows[0][col]?.substring(0, 30)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setStep('upload'); setRawColumns([]); setRawRows([]) }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">
                Volver
              </button>
              <button onClick={goToPreview}
                disabled={!isFieldUsed('nombre')}
                className="px-6 py-2 bg-blue-900 text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
                Continuar ({mappedRows.length} productos)
              </button>
            </div>
          </div>
        )}

        {/* ========== PREVIEW ========== */}
        {step === 'preview' && (
          <>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-8 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Importando...</span>
                    <span className="font-mono text-gray-500">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-blue-900 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    {Math.round(progress * selectedCount / 100)} de {selectedCount} productos
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-left text-gray-500 text-xs uppercase">
                      <th className="px-3 py-2 w-10">
                        <input type="checkbox" checked={selectedCount === previewRows.length} onChange={() => setPreviewRows((prev) => prev.map(r => ({ ...r, _selected: selectedCount !== prev.length })))} className="accent-blue-900" />
                      </th>
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2 min-w-[160px]">Nombre</th>
                      <th className="px-3 py-2 w-20 text-right">Precio</th>
                      <th className="px-3 py-2 w-20 text-right">Costo</th>
                      <th className="px-3 py-2 w-20 text-right">Stock</th>
                      <th className="px-3 py-2 w-16 text-right">IVA</th>
                      <th className="px-3 py-2 min-w-[110px]">Categoría</th>
                      <th className="px-3 py-2 min-w-[90px]">Marca</th>
                      <th className="px-3 py-2 min-w-[110px]">Código Barra</th>
                      <th className="px-3 py-2 w-14 text-center">Tipo</th>
                      <th className="px-3 py-2 w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.map((row, i) => (
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
                          <input value={row.precio} onChange={(e) => updateRow(i, 'precio', e.target.value)} type="number" step="0.01" min="0"
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-right font-mono text-gray-800" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={row.costo} onChange={(e) => updateRow(i, 'costo', e.target.value)} type="number" step="0.01" min="0"
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-right font-mono text-gray-500" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={row.stock} onChange={(e) => updateRow(i, 'stock', e.target.value)} type="number" step="0.01" min="0"
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-right font-mono text-gray-800" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={row.iva} onChange={(e) => updateRow(i, 'iva', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-right font-mono text-gray-600">
                            <option value="0">0%</option><option value="8">8%</option><option value="16">16%</option>
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
              )}
            </div>

            {!loading && (
              <div className="p-3 border-t border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/50">
                <div className="text-xs text-gray-500">
                  {previewRows.length} productos · {selectedCount} seleccionados
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep('mapping')}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">
                    Volver
                  </button>
                  <button onClick={handleImport} disabled={loading || selectedCount === 0}
                    className="px-6 py-2 bg-blue-900 text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Importando...' : `Importar ${selectedCount}`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== RESULT ========== */}
        {step === 'result' && result && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.total}</p>
                <p className="text-xs text-gray-500">Total</p>
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
                className="flex-1 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-medium hover:bg-blue-800">Cerrar</button>
              <button onClick={() => { setStep('upload'); setRawColumns([]); setRawRows([]); setResult(null) }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">Importar otro</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

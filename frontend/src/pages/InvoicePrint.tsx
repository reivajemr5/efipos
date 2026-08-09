import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import InvoicePrintLayout, { type PrintData } from '../components/InvoicePrintLayout'

export default function InvoicePrint() {
  const { id } = useParams()
  const [data, setData] = useState<PrintData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.invoices.print(Number(id)).then(setData).catch(() => setError('Error al cargar factura'))
  }, [id])

  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-600">{error}</div>
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print max-w-sm mx-auto pt-4 px-4">
        <button
          onClick={() => window.print()}
          className="btn btn-primary w-full"
        >
          Imprimir
        </button>
      </div>
      <InvoicePrintLayout data={data} />
    </div>
  )
}
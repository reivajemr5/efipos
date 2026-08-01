import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'

interface PrintData {
  company: { name: string; rif: string; address: string; phone: string }
  invoice: {
    id: number
    number: string
    createdAt: string
    client: { name: string; documentType: string; documentNumber: string; phone: string | null; address: string | null }
    user: { name: string }
    currency: string
    discount?: string | null
    subtotal: string
    ivaTotal: string
    total: string
    paymentMethod: string
    items: Array<{
      quantity: number
      unitPrice: string
      subtotal: string
      discount?: string | null
      product: { name: string; code: string }
    }>
  }
}

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

  const { company, invoice } = data
  const symbol = invoice.currency === 'bs' ? 'Bs.' : '$'
  const discountUsd = invoice.discount ? Number(invoice.discount) : 0
  const d = new Date(invoice.createdAt)
  const dateStr = d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

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
      <div className="max-w-sm mx-auto p-6 text-sm">
        <div className="text-center mb-6 pb-4 border-b border-gray-300">
          <h1 className="text-lg font-bold">{company.name}</h1>
          <p className="text-gray-600">{company.rif}</p>
          <p className="text-gray-600">{company.address}</p>
          <p className="text-gray-600">{company.phone}</p>
        </div>

        <div className="mb-4 pb-4 border-b border-gray-300">
          <div className="flex justify-between mb-1">
            <span className="font-semibold">Factura N°</span>
            <span>{invoice.number}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-semibold">Fecha</span>
            <span>{dateStr} {timeStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Atendido por</span>
            <span>{invoice.user.name}</span>
          </div>
        </div>

        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="font-semibold mb-1">Cliente</p>
          <p className="text-gray-700">{invoice.client.name}</p>
          <p className="text-gray-600 text-xs">{invoice.client.documentType}-{invoice.client.documentNumber}</p>
          {invoice.client.phone && <p className="text-gray-600 text-xs">{invoice.client.phone}</p>}
        </div>

        <table className="w-full mb-4">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-300">
              <th className="pb-1">Cant</th>
              <th className="pb-1">Producto</th>
              <th className="pb-1 text-right">Precio</th>
              <th className="pb-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1">{item.quantity}</td>
                <td className="py-1">{item.product.name}</td>
                <td className="py-1 text-right">{symbol} {Number(item.unitPrice).toFixed(2)}</td>
                <td className="py-1 text-right">{symbol} {Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right space-y-1 mb-6">
          <div className="text-gray-600">Subtotal: {symbol} {Number(invoice.subtotal).toFixed(2)}</div>
          <div className="text-gray-600">IVA: {symbol} {Number(invoice.ivaTotal).toFixed(2)}</div>
          {discountUsd > 0 && (
            <div className="text-amber-600">Descuento: -{symbol} {discountUsd.toFixed(2)}</div>
          )}
          <div className="text-lg font-bold">Total: {symbol} {Number(invoice.total).toFixed(2)}</div>
        </div>

        <div className="text-center text-xs text-gray-400 border-t border-gray-300 pt-4">
          <p>Método de pago: {invoice.paymentMethod}</p>
          <p className="mt-1">¡Gracias por su compra!</p>
        </div>
      </div>
    </div>
  )
}

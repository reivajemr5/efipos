export interface PrintCompany {
  name: string
  rif: string
  address: string
  phone: string
}

export interface PrintData {
  company: PrintCompany
  invoice: {
    id: number
    number: string
    createdAt: string
    client: { name: string; documentType: string; documentNumber: string; phone: string | null; address: string | null }
    user: { name: string }
    currency: string
    discount?: string | null
    subtotal: string | number
    ivaTotal: string | number
    total: string | number
    totalBs?: string | number | null
    paymentMethod: string
    items: Array<{
      quantity: number
      unitPrice: string | number
      subtotal: string | number
      discount?: string | null
      product: { name: string; code: string }
    }>
  }
}

export default function InvoicePrintLayout({ data }: { data: PrintData }) {
  const { company, invoice } = data
  const symbol = invoice.currency === 'bs' ? 'Bs.' : '$'
  const discountUsd = invoice.discount ? Number(invoice.discount) : 0
  const d = new Date(invoice.createdAt)
  const dateStr = d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  return (
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
        {invoice.totalBs && Number(invoice.totalBs) > 0 && (
          <div className="text-gray-500">Bs. {Number(invoice.totalBs).toFixed(2)}</div>
        )}
      </div>

      <div className="text-center text-xs text-gray-400 border-t border-gray-300 pt-4">
        <p>Método de pago: {invoice.paymentMethod}</p>
        <p className="mt-1">¡Gracias por su compra!</p>
      </div>
    </div>
  )
}
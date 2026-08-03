import InvoiceAbonos from './InvoiceAbonos'

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  bio_pago: 'Bio Pago',
  cashea: 'Cashea',
  transferencia: 'Transferencia',
  credito: 'Crédito',
  abono_credito: 'Abono a crédito',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'activa') return <span className="badge-green">Activa</span>
  if (status === 'anulada') return <span className="badge-red">Anulada</span>
  return <span className="badge-amber">Borrador</span>
}

interface Props {
  invoice: any
  onClose: () => void
  onAbonar?: (invoice: any) => void
}

export default function InvoiceDetailModal({ invoice, onClose, onAbonar }: Props) {
  const items = invoice.items || []
  const payments = invoice.payments || []
  const discount = Number(invoice.discount) || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-800">{invoice.number}</h3>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {invoice.client?.name} · {invoice.client?.documentType}-{invoice.client?.documentNumber}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(invoice.createdAt).toLocaleDateString()} · {PAYMENT_LABELS[invoice.paymentMethod] || invoice.paymentMethod}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1.5">
            {items.length === 0 && <p className="text-gray-400 text-sm">Sin ítems</p>}
            {items.map((it: any) => (
              <div key={it.id} className="flex items-start justify-between text-sm">
                <div className="min-w-0 pr-3">
                  <p className="font-medium text-gray-800 truncate">{it.product?.name || 'Producto'}</p>
                  <p className="text-xs text-gray-400">
                    {it.quantity} × ${Number(it.unitPrice).toFixed(2)}
                    {Number(it.discount) > 0 && <span className="text-amber-600"> · -${Number(it.discount).toFixed(2)}</span>}
                    {Number(it.ivaPercent) > 0 && <span className="text-gray-400"> · IVA {it.ivaPercent}%</span>}
                  </p>
                </div>
                <span className="font-mono text-gray-700 shrink-0">${Number(it.subtotal).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm text-gray-600 border-t border-gray-100 pt-3">
            <p className="flex justify-between"><span>Subtotal</span><span className="font-mono">${Number(invoice.subtotal).toFixed(2)}</span></p>
            <p className="flex justify-between"><span>IVA</span><span className="font-mono">${Number(invoice.ivaTotal).toFixed(2)}</span></p>
            {discount > 0 && (
              <p className="flex justify-between text-amber-700"><span>Descuento</span><span className="font-mono">-${discount.toFixed(2)}</span></p>
            )}
            <p className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="font-mono">${Number(invoice.total).toFixed(2)}</span>
            </p>
            {invoice.totalBs && (
              <p className="flex justify-between text-xs text-gray-400"><span>Total Bs.</span><span className="font-mono">Bs.{Number(invoice.totalBs).toFixed(2)}</span></p>
            )}
          </div>

          {payments.some((p: any) => p.method !== 'abono_credito') && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Pagos</p>
              <div className="space-y-1.5">
                {payments.filter((p: any) => p.method !== 'abono_credito').map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-700">{PAYMENT_LABELS[p.method] || p.method}</p>
                      <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{p.reference ? ` · ${p.reference}` : ''}</p>
                    </div>
                    <span className="font-mono text-gray-700">${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <InvoiceAbonos payments={payments} />

          {Number(invoice.balance) > 0 && invoice.status === 'activa' && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-xs uppercase tracking-wider text-green-700">Saldo pendiente</p>
                <p className="font-bold text-green-800">${Number(invoice.balance).toFixed(2)}</p>
              </div>
              {onAbonar && (
                <button
                  onClick={() => onAbonar(invoice)}
                  className="px-3 py-2 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-800 touch-manipulation"
                >
                  Abonar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium touch-manipulation"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

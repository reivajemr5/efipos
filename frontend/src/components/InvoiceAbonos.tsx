interface Props {
  payments: any[]
}

interface ParsedAbono {
  id: number
  createdAt: string
  amountUsd: number
  bs: number | null
  rate: number | null
}

function parseAbono(p: any): ParsedAbono {
  const m = String(p.reference || '').match(/Bs\.\s*([\d.,]+)\s*@\s*([\d.,]+)/)
  return {
    id: p.id,
    createdAt: p.createdAt,
    amountUsd: Number(p.amount),
    bs: m ? Number(m[1].replace(',', '.')) : null,
    rate: m ? Number(m[2].replace(',', '.')) : null,
  }
}

function fmtDateTime(value: string) {
  return new Date(value).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function InvoiceAbonos({ payments }: Props) {
  const abonos = (payments || []).filter((p: any) => p.method === 'abono_credito')

  if (abonos.length === 0) return null

  const totalUsd = abonos.reduce((s: number, p: any) => s + Number(p.amount), 0)
  const parsed = abonos.map(parseAbono)
  const totalBs = parsed.every((a) => a.bs !== null) ? parsed.reduce((s: number, a) => s + (a.bs || 0), 0) : null

  return (
    <div className="border-t border-gray-100 pt-3">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Abonos</p>
      <div className="space-y-1.5">
        {parsed.map((a) => (
          <div key={a.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-700">
                {a.bs !== null && <span className="font-mono font-semibold text-green-700">Bs. {a.bs.toFixed(2)}</span>}
                <span className="text-gray-400"> · ${a.amountUsd.toFixed(2)} USD</span>
              </p>
              <p className="text-xs text-gray-400">{fmtDateTime(a.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="flex justify-between text-xs font-semibold text-gray-600 border-t border-gray-100 mt-2 pt-2">
        <span>Total abonado</span>
        <span className="font-mono">
          {totalBs !== null ? `Bs. ${totalBs.toFixed(2)} · ` : ''}${totalUsd.toFixed(2)}
        </span>
      </p>
    </div>
  )
}

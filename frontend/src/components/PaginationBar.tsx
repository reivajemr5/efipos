interface PaginationBarProps {
  page: number
  onPage: (p: number) => void
  total: number
  pageSize?: number
}

export default function PaginationBar({ page, onPage, total, pageSize = 25 }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-gray-600">
      <span>
        Página {page + 1} de {totalPages} · {total} registros
      </span>
      <div className="flex gap-1">
        <button
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-40 hover:bg-gray-300"
        >
          ← Anterior
        </button>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-40 hover:bg-gray-300"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}

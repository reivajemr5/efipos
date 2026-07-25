import { useRef, useCallback } from 'react'
import ProductCard from './ProductCard'

interface Category {
  id: number
  name: string
}

interface ProductGridProduct {
  id: number
  code: string
  name: string
  price: number
  currency: string
  ivaPercent: number
  imageUrl?: string | null
  stock: number
  category?: { id: number; name: string } | null
}

interface ProductGridProps {
  products: ProductGridProduct[]
  categories: Category[]
  selectedCategoryId: number | null
  onSelectCategory: (id: number | null) => void
  onSelectProduct: (product: ProductGridProduct) => void
  onSelectProductQuantity?: (product: ProductGridProduct) => void
  onArrowUpFromFirst?: () => void
}

export default function ProductGrid({ products, categories, selectedCategoryId, onSelectCategory, onSelectProduct, onSelectProductQuantity, onArrowUpFromFirst }: ProductGridProps) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const getCardButtons = useCallback(() => {
    if (!gridRef.current) return []
    return Array.from(gridRef.current.querySelectorAll<HTMLButtonElement>('.product-card-btn'))
  }, [])

  function handleGridKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const buttons = getCardButtons()
    if (buttons.length === 0) return
    const currentIdx = buttons.findIndex((b) => b === document.activeElement)
    let nextIdx = currentIdx
    if (e.key === 'ArrowRight') nextIdx = currentIdx < buttons.length - 1 ? currentIdx + 1 : 0
    else if (e.key === 'ArrowLeft') nextIdx = currentIdx > 0 ? currentIdx - 1 : buttons.length - 1
    else if (e.key === 'ArrowDown') {
      const cols = gridRef.current ? Math.floor(gridRef.current.clientWidth / 160) : 3
      nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + cols, buttons.length - 1)
    } else if (e.key === 'ArrowUp') {
      if (currentIdx === 0) { onArrowUpFromFirst?.(); return }
      const cols = gridRef.current ? Math.floor(gridRef.current.clientWidth / 160) : 3
      nextIdx = currentIdx < 0 ? 0 : Math.max(currentIdx - cols, 0)
    }
    buttons[nextIdx]?.focus()
  }

  return (
    <div className="bg-gray-50">
      <div ref={tabsRef} className="flex gap-1 p-3 pb-2 overflow-x-auto shrink-0 sticky top-0 bg-gray-50 z-10">
        <button
          onClick={() => onSelectCategory(null)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation ${
            selectedCategoryId === null
              ? 'bg-blue-900 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation ${
              selectedCategoryId === cat.id
                ? 'bg-blue-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="px-3 pb-3">
        {products.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            No hay productos en esta categoría
          </div>
        ) : (
          <div
            ref={gridRef}
            tabIndex={-1}
            onKeyDown={handleGridKeyDown}
            className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2"
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{ ...product, currency: product.currency || 'usd' }}
                onSelect={onSelectProduct}
                onSelectQuantity={onSelectProductQuantity}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useRef } from 'react'

interface ProductCardProduct {
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

interface ProductCardProps {
  product: ProductCardProduct
  onSelect: (product: ProductCardProduct) => void
  onSelectQuantity?: (product: ProductCardProduct) => void
  exchangeRate: number
}

const categoryColors: Record<string, string> = {
  default: 'bg-blue-100 text-blue-700',
}

export default function ProductCard({ product, onSelect, onSelectQuantity, exchangeRate }: ProductCardProps) {
  const catName = product.category?.name || ''
  const colorClass = categoryColors[catName] || 'bg-blue-100 text-blue-700'
  const keyboardSelected = useRef(false)

  const priceBs = exchangeRate > 0 ? product.price * exchangeRate : 0

  function handleClick() {
    if (keyboardSelected.current) {
      keyboardSelected.current = false
      return
    }
    onSelect(product)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      keyboardSelected.current = true
      onSelectQuantity?.(product)
    }
  }

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="product-card-btn bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md active:scale-[0.97] transition-all touch-manipulation flex flex-col focus:ring-2 focus:ring-blue-400 focus:outline-none"
    >
      <div className="relative aspect-[4/3] bg-gray-50 flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-2xl text-gray-300 font-bold">{product.name.charAt(0).toUpperCase()}</div>
        )}
        {catName && (
          <span className={`absolute top-1 left-1 text-[10px] font-medium px-1 py-0.5 rounded-full ${colorClass}`}>
            {catName}
          </span>
        )}
        <div className="absolute bottom-1 left-1 right-1 flex gap-1 justify-end">
          <span className="bg-blue-900/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            ${product.price.toFixed(2)}
          </span>
          {exchangeRate > 0 && (
            <span className="bg-green-800/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Bs.{priceBs.toFixed(2)}
            </span>
          )}
        </div>
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Sin stock</span>
          </div>
        )}
      </div>
      <div className="p-1.5 flex-1 flex items-center">
        <p className="text-[11px] font-medium text-gray-800 line-clamp-2 leading-tight">{product.name}</p>
      </div>
    </button>
  )
}

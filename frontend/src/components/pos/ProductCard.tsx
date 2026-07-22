interface ProductCardProduct {
  id: number
  name: string
  price: number
  currency: string
  imageUrl?: string | null
  stock: number
  category?: { id: number; name: string } | null
}

interface ProductCardProps {
  product: ProductCardProduct
  onSelect: (product: ProductCardProduct) => void
}

const categoryColors: Record<string, string> = {
  default: 'bg-blue-100 text-blue-700',
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const catName = product.category?.name || ''
  const colorClass = categoryColors[catName] || 'bg-blue-100 text-blue-700'
  const symbol = product.currency === 'bs' ? 'Bs.' : '$'

  return (
    <button
      onClick={() => onSelect(product)}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md active:scale-[0.97] transition-all touch-manipulation flex flex-col"
    >
      <div className="relative aspect-square bg-gray-50 flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-3xl text-gray-300 font-bold">{product.name.charAt(0).toUpperCase()}</div>
        )}
        <span className="absolute top-1.5 right-1.5 bg-blue-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {symbol}{product.price.toFixed(2)}
        </span>
        {catName && (
          <span className={`absolute top-1.5 left-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colorClass}`}>
            {catName}
          </span>
        )}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-danger text-white text-xs font-bold px-2 py-1 rounded">Sin stock</span>
          </div>
        )}
      </div>
      <div className="p-2 flex-1 flex items-center">
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{product.name}</p>
      </div>
    </button>
  )
}

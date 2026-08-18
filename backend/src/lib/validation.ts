export function validateItems(items: any[]): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Productos requeridos'
  }
  for (const item of items) {
    if (!item?.productId || !Number.isInteger(item.productId)) {
      return 'Cada producto debe tener un productId válido'
    }
    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      return 'La cantidad debe ser un número mayor a 0'
    }
    if (typeof item.unitPrice !== 'undefined' && (typeof item.unitPrice !== 'number' || item.unitPrice < 0)) {
      return 'El precio unitario debe ser un número mayor o igual a 0'
    }
  }
  return null
}

export interface ItemPolicyOptions {
  allowDecimal: boolean
  allowPriceOverride: boolean
  allowSellWithoutStock: boolean
  stock?: number | null
}

/**
 * Valida reglas configurables por producto/negocio:
 *  - cantidades decimales solo si el producto las permite,
 *  - cambio de precio solo si está permitido,
 *  - stock insuficiente solo si la venta sin stock no está permitida.
 */
export function validateItemPolicy(item: any, product: any, opts: ItemPolicyOptions): string | null {
  const qty = Number(item.quantity)
  if (!opts.allowDecimal && !Number.isInteger(qty)) {
    return `"${product.name}" no admite cantidades decimales`
  }
  if (
    typeof item.unitPrice !== 'undefined' &&
    !opts.allowPriceOverride &&
    Number(item.unitPrice) !== Number(product.price)
  ) {
    return `No se permite cambiar el precio de "${product.name}"`
  }
  if (!opts.allowSellWithoutStock && opts.stock != null && qty > Number(opts.stock)) {
    return `Stock insuficiente para "${product.name}" (disponible: ${Number(opts.stock)})`
  }
  return null
}

export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
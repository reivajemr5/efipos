export function validateItems(items: any[]): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Productos requeridos'
  }
  for (const item of items) {
    if (!item?.productId || !Number.isInteger(item.productId)) {
      return 'Cada producto debe tener un productId válido'
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return 'La cantidad debe ser un número entero mayor a 0'
    }
    if (typeof item.unitPrice !== 'undefined' && (typeof item.unitPrice !== 'number' || item.unitPrice < 0)) {
      return 'El precio unitario debe ser un número mayor o igual a 0'
    }
  }
  return null
}

export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

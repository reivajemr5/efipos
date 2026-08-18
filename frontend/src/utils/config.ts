export type ConfigMode = 'all' | 'selected' | 'none'

/** Resuelve la configuración efectiva según el modo del negocio y la bandera del producto. */
export function effectiveFlag(mode: string | null | undefined, productFlag: boolean | null | undefined): boolean {
  if (mode === 'all') return true
  if (mode === 'selected') return !!productFlag
  return false
}

/** Formatea una cantidad mostrando decimales solo cuando no es entera (p.ej. 0.5 → "0.5", 3 → "3"). */
export function formatQty(q: number): string {
  if (!Number.isFinite(q)) return '0'
  const rounded = Number(q.toFixed(3))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

/** Paso de entrada para cantidades decimales. */
export const QTY_STEP = 0.001
export type ConfigMode = 'all' | 'selected' | 'none'

/** Resuelve la configuración efectiva según el modo del negocio y la bandera del producto. */
export function effectiveFlag(mode: string | null | undefined, productFlag: boolean): boolean {
  if (mode === 'all') return true
  if (mode === 'selected') return !!productFlag
  return false
}

export const isValidMode = (mode: unknown): mode is ConfigMode =>
  mode === 'all' || mode === 'selected' || mode === 'none'
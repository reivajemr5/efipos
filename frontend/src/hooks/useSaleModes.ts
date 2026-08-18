import { useEffect, useState } from 'react'
import { api } from '../services/api'

export interface SaleModes {
  decimalQuantityMode: string
  sellWithoutStockMode: string
  priceOverrideMode: string
}

const DEFAULTS: SaleModes = { decimalQuantityMode: 'none', sellWithoutStockMode: 'none', priceOverrideMode: 'none' }

/** Carga la configuración de venta del negocio activo (una sola vez). */
export function useSaleModes(): SaleModes {
  const [modes, setModes] = useState<SaleModes>(DEFAULTS)
  useEffect(() => {
    api.businesses.settings()
      .then((d: any) => {
        if (d) setModes({
          decimalQuantityMode: d.decimalQuantityMode || 'none',
          sellWithoutStockMode: d.sellWithoutStockMode || 'none',
          priceOverrideMode: d.priceOverrideMode || 'none',
        })
      })
      .catch(() => {})
  }, [])
  return modes
}
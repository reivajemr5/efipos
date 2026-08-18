import { describe, it, expect } from 'vitest'
import { validateItems, validateItemPolicy, isPositiveNumber } from '../lib/validation'

describe('validateItems', () => {
  it('rechaza items vacíos', () => {
    expect(validateItems([])).toBeTruthy()
    expect(validateItems(undefined as any)).toBeTruthy()
  })

  it('rechaza producto sin productId', () => {
    expect(validateItems([{ quantity: 1 }])).toMatch(/productId/)
  })

  it('rechaza cantidades no positivas', () => {
    expect(validateItems([{ productId: 1, quantity: 0 }])).toMatch(/cantidad/)
    expect(validateItems([{ productId: 1, quantity: -3 }])).toMatch(/cantidad/)
  })

  it('acepta cantidades decimales', () => {
    expect(validateItems([{ productId: 1, quantity: 2.5 }])).toBeNull()
    expect(validateItems([{ productId: 1, quantity: 0.5 }])).toBeNull()
  })

  it('rechaza precio unitario negativo', () => {
    expect(validateItems([{ productId: 1, quantity: 1, unitPrice: -1 }])).toMatch(/precio/)
  })

  it('acepta items válidos', () => {
    expect(validateItems([{ productId: 1, quantity: 3, unitPrice: 10.5 }])).toBeNull()
  })
})

describe('validateItemPolicy', () => {
  const product = { id: 1, decimalQuantity: false, sellWithoutStock: false, priceOverride: false }

  it('rechaza cantidad decimal sin permiso', () => {
    expect(validateItemPolicy({ quantity: 1.5 }, product, { allowDecimal: false, allowPriceOverride: false, allowSellWithoutStock: false, stock: 10 })).toMatch(/decimal/)
  })

  it('permite cantidad decimal con permiso', () => {
    expect(validateItemPolicy({ quantity: 1.5 }, product, { allowDecimal: true, allowPriceOverride: false, allowSellWithoutStock: false, stock: 10 })).toBeNull()
  })

  it('rechaza unidad unitPrice si no usa pawn priceOverride', () => {
    expect(validateItemPolicy({ quantity: 1, unitPrice: 999 }, product, { allowDecimal: false, allowPriceOverride: false, allowSellWithoutStock: false, stock: 10 })).toMatch(/precio/)
  })
})

describe('isPositiveNumber', () => {
  it('acepta números positivos', () => {
    expect(isPositiveNumber(5)).toBe(true)
    expect(isPositiveNumber(0.01)).toBe(true)
  })

  it('rechaza cero, negativos y no numéricos', () => {
    expect(isPositiveNumber(0)).toBe(false)
    expect(isPositiveNumber(-2)).toBe(false)
    expect(isPositiveNumber(NaN)).toBe(false)
    expect(isPositiveNumber('5' as any)).toBe(false)
  })
})

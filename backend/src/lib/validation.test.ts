import { describe, it, expect } from 'vitest'
import { validateItems, isPositiveNumber } from '../lib/validation'

describe('validateItems', () => {
  it('rechaza items vacíos', () => {
    expect(validateItems([])).toBeTruthy()
    expect(validateItems(undefined as any)).toBeTruthy()
  })

  it('rechaza producto sin productId', () => {
    expect(validateItems([{ quantity: 1 }])).toMatch(/productId/)
  })

  it('rechaza cantidades no enteras o menores a 1', () => {
    expect(validateItems([{ productId: 1, quantity: 0 }])).toMatch(/cantidad/)
    expect(validateItems([{ productId: 1, quantity: -3 }])).toMatch(/cantidad/)
    expect(validateItems([{ productId: 1, quantity: 2.5 }])).toMatch(/cantidad/)
  })

  it('rechaza precio unitario negativo', () => {
    expect(validateItems([{ productId: 1, quantity: 1, unitPrice: -1 }])).toMatch(/precio/)
  })

  it('acepta items válidos', () => {
    expect(validateItems([{ productId: 1, quantity: 3, unitPrice: 10.5 }])).toBeNull()
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

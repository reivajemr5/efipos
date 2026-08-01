export type DiscountType = 'usd' | 'bs' | 'percent'

export function parseDiscount(input: string): number {
  const v = parseFloat(String(input).replace(',', '.'))
  return isNaN(v) ? 0 : Math.max(0, v)
}

export function discountAmountUsd(input: string, type: DiscountType, baseTotal: number, rate: number): number {
  const v = parseDiscount(input)
  if (v === 0) return 0
  if (type === 'usd') return Math.round(v * 100) / 100
  if (type === 'bs') return rate > 0 ? Math.round((v / rate) * 100) / 100 : 0
  return Math.round((baseTotal * v / 100) * 100) / 100
}

export function formatBs(usdAmount: number, rate: number): string {
  return (usdAmount * rate).toFixed(2)
}

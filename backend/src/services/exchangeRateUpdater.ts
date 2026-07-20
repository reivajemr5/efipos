import prisma from '../lib/prisma'

async function fetchFromDolarApi(): Promise<number | null> {
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares', {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as any[]
    const oficial = data.find((d: any) => d.fuente === 'oficial')
    return oficial?.promedio || null
  } catch {
    return null
  }
}

async function fetchFromPyDolarVe(): Promise<number | null> {
  try {
    const res = await fetch('https://pydolarve.org/api/v1/price?pair=USD_VES', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data: any = await res.json()
    return data?.price || data?.rate || null
  } catch {
    return null
  }
}

export async function fetchBCVRate(): Promise<number | null> {
  let rate = await fetchFromDolarApi()
  if (!rate) rate = await fetchFromPyDolarVe()
  return rate
}

export async function updateBCVRate(): Promise<{ rate: number; source: string } | null> {
  const rate = await fetchBCVRate()
  if (!rate || rate <= 0) return null

  const existing = await prisma.exchangeRate.findFirst({
    where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  })

  if (existing) {
    const updated = await prisma.exchangeRate.update({
      where: { id: existing.id },
      data: { rate, source: 'bcv-auto' },
    })
    return { rate: Number(updated.rate), source: updated.source }
  }

  const created = await prisma.exchangeRate.create({
    data: { rate, source: 'bcv-auto' },
  })
  return { rate: Number(created.rate), source: created.source }
}

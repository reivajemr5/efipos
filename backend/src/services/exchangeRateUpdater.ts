import prisma from '../lib/prisma'

async function fetchFromJustCarlux(): Promise<number | null> {
  try {
    const res = await fetch('https://bcv.justcarlux.dev/api/v1/rates', {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data: any = await res.json()
    return data?.rates?.usd || null
  } catch {
    return null
  }
}

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

export async function fetchBCVRate(): Promise<number | null> {
  let rate = await fetchFromJustCarlux()
  if (!rate) rate = await fetchFromDolarApi()
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

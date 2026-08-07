import prisma from './prisma'

export async function nextDocumentNumber(prefix: string, scopeKey = 'global', padLength = 4): Promise<string> {
  const key = `doc_${prefix}${scopeKey}`
  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  })
  return `${prefix}${String(counter.value).padStart(padLength, '0')}`
}

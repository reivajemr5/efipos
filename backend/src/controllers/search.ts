import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { resolveContext } from '../lib/tenant'

export async function globalSearch(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim()
  const ctx = resolveContext(req)
  if (!ctx.businessId) {
    res.json({ products: [], clients: [], invoices: [] })
    return
  }
  if (!q || q.length < 2) {
    res.json({ products: [], clients: [], invoices: [] })
    return
  }

  const products = await prisma.product.findMany({
    where: {
      businessId: ctx.businessId,
      active: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: ctx.branchId
      ? { stocks: { where: { branchId: ctx.branchId }, select: { stock: true, minStock: true } } }
      : undefined,
    take: 10,
  })

  const clients = await prisma.client.findMany({
    where: {
      businessId: ctx.businessId,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { documentNumber: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, documentType: true, documentNumber: true },
    take: 10,
  })

  const invoices = await prisma.invoice.findMany({
    where: { businessId: ctx.businessId, number: { contains: q, mode: 'insensitive' } },
    select: { id: true, number: true, total: true, createdAt: true, status: true },
    take: 10,
  })

  const mappedProducts = products.map((p: any) => {
    const s = ctx.branchId && Array.isArray(p.stocks) ? p.stocks[0] : undefined
    const { stocks, ...rest } = p
    return { ...rest, stock: s ? Number(s.stock) : 0 }
  })

  res.json({ products: mappedProducts, clients, invoices })
}
import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function globalSearch(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim()
  if (!q || q.length < 2) {
    res.json({ products: [], clients: [], invoices: [] })
    return
  }

  const [products, clients, invoices] = await Promise.all([
    prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, code: true, barcode: true, stock: true, price: true },
      take: 10,
    }),
    prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { documentNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, documentType: true, documentNumber: true },
      take: 10,
    }),
    prisma.invoice.findMany({
      where: { number: { contains: q, mode: 'insensitive' } },
      select: { id: true, number: true, total: true, createdAt: true, status: true },
      take: 10,
    }),
  ])

  res.json({ products, clients, invoices })
}

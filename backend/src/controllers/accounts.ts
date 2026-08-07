import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext } from '../lib/tenant'

export async function receivable(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim()
  const ctx = resolveContext(req)
  const where: any = { businessId: ctx.businessId ?? 0, balance: { gt: 0 }, status: { in: ['activa'] } }
  if (ctx.branchId) where.branchId = ctx.branchId
  if (q) {
    where.OR = [
      { client: { name: { contains: q, mode: 'insensitive' } } },
      { client: { documentNumber: { contains: q } } },
    ]
  }

  const include = {
    client: { select: { id: true, name: true, documentType: true, documentNumber: true } },
    user: { select: { id: true, name: true } },
    items: { include: { product: { select: { id: true, name: true, code: true } } } },
    payments: { orderBy: { createdAt: 'desc' as const } },
  }
  const orderBy = { createdAt: 'desc' as const }

  const [pendingAgg] = await Promise.all([
    prisma.invoice.aggregate({ where, _sum: { balance: true } }),
  ])
  const totalPending = Number(pendingAgg._sum.balance || 0)

  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const { items, total, hasMore } = await paginate(prisma.invoice, { where, include, orderBy }, limit, offset)
    res.json({ totalPending, total, hasMore, invoices: items })
    return
  }

  const invoices = await prisma.invoice.findMany({ where, include, orderBy })
  res.json({ totalPending, totalCount: invoices.length, invoices })
}

export async function payable(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim()
  const ctx = resolveContext(req)
  const where: any = { businessId: ctx.businessId ?? 0, status: { in: ['pedido', 'recibido'] } }
  if (ctx.branchId) where.branchId = ctx.branchId
  if (q) {
    where.OR = [
      { supplier: { name: { contains: q, mode: 'insensitive' } } },
      { supplier: { documentNumber: { contains: q } } },
    ]
  }

  const include = {
    supplier: { select: { id: true, name: true, documentType: true, documentNumber: true } },
    user: { select: { id: true, name: true } },
  }
  const orderBy = { createdAt: 'desc' as const }

  const [pendingAgg] = await Promise.all([
    prisma.purchaseInvoice.aggregate({ where, _sum: { total: true } }),
  ])
  const totalPending = Number(pendingAgg._sum.total || 0)

  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const { items, total, hasMore } = await paginate(prisma.purchaseInvoice, { where, include, orderBy }, limit, offset)
    res.json({ totalPending, total, hasMore, purchases: items })
    return
  }

  const purchases = await prisma.purchaseInvoice.findMany({ where, include, orderBy })
  res.json({ totalPending, totalCount: purchases.length, purchases })
}

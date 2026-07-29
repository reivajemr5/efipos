import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function receivable(req: AuthRequest, res: Response) {
  const invoices = await prisma.invoice.findMany({
    where: { balance: { gt: 0 }, status: { not: 'anulada' } },
    include: {
      client: { select: { id: true, name: true, documentType: true, documentNumber: true } },
      user: { select: { id: true, name: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalPending = invoices.reduce((s, inv) => s + Number(inv.balance), 0)

  res.json({
    totalPending,
    totalCount: invoices.length,
    invoices,
  })
}

export async function payable(req: AuthRequest, res: Response) {
  const purchases = await prisma.purchaseInvoice.findMany({
    where: { status: { in: ['pedido', 'recibido'] } },
    include: {
      supplier: { select: { id: true, name: true, documentType: true, documentNumber: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalPending = purchases.reduce((s, p) => s + Number(p.total), 0)

  res.json({
    totalPending,
    totalCount: purchases.length,
    purchases,
  })
}

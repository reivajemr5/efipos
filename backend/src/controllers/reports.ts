import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function salesReport(req: AuthRequest, res: Response) {
  const { date_from, date_to } = req.query
  const start = date_from ? new Date(String(date_from)) : new Date(new Date().setHours(0, 0, 0, 0))
  const end = date_to ? new Date(String(date_to) + 'T23:59:59.999Z') : new Date()

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: start, lte: end }, status: 'activa' },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const paymentBreakdown: Record<string, number> = {}
  for (const inv of invoices) {
    paymentBreakdown[inv.paymentMethod] = (paymentBreakdown[inv.paymentMethod] || 0) + Number(inv.total)
  }

  // Daily breakdown
  const dailyMap: Record<string, { count: number; total: number }> = {}
  for (const inv of invoices) {
    const day = inv.createdAt.toISOString().split('T')[0]
    if (!dailyMap[day]) dailyMap[day] = { count: 0, total: 0 }
    dailyMap[day].count++
    dailyMap[day].total += Number(inv.total)
  }

  res.json({
    totalSales,
    totalInvoices: invoices.length,
    averageTicket: invoices.length > 0 ? totalSales / invoices.length : 0,
    byPaymentMethod: paymentBreakdown,
    dailyBreakdown: Object.entries(dailyMap).map(([date, data]) => ({ date, ...data })),
    invoices,
  })
}

export async function topProducts(req: AuthRequest, res: Response) {
  const { date_from, date_to, limit } = req.query
  const start = date_from ? new Date(String(date_from)) : new Date(0)
  const end = date_to ? new Date(String(date_to) + 'T23:59:59.999Z') : new Date()

  const items = await prisma.invoiceItem.findMany({
    where: {
      invoice: { createdAt: { gte: start, lte: end }, status: 'activa' },
    },
    include: { product: { select: { name: true, code: true } } },
  })

  const productMap: Record<number, { name: string; code: string; quantity: number; total: number }> = {}
  for (const item of items) {
    if (!productMap[item.productId]) {
      productMap[item.productId] = { name: item.product.name, code: item.product.code, quantity: 0, total: 0 }
    }
    productMap[item.productId].quantity += item.quantity
    productMap[item.productId].total += Number(item.subtotal)
  }

  const sorted = Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, Number(limit) || 10)

  res.json(sorted)
}

export async function cashClose(req: AuthRequest, res: Response) {
  const { date } = req.query
  const closeDate = date ? new Date(String(date)) : new Date()
  const start = new Date(closeDate.setHours(0, 0, 0, 0))
  const end = new Date(closeDate.setHours(23, 59, 59, 999))

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: start, lte: end }, status: 'activa' },
  })

  const expectedTotal = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)

  const existingClose = await prisma.cashClose.findFirst({
    where: { closeDate: { gte: start, lte: end } },
  })

  res.json({
    date: String(date || new Date().toISOString().split('T')[0]),
    invoiceCount: invoices.length,
    expectedTotal,
    declaredTotal: existingClose?.declaredTotal || null,
    difference: existingClose ? Number(existingClose.declaredTotal) - expectedTotal : null,
    isClosed: !!existingClose,
  })
}

export async function saveCashClose(req: AuthRequest, res: Response) {
  const { declaredTotal, closeDate } = req.body
  const date = closeDate ? new Date(String(closeDate)) : new Date()
  const start = new Date(date.setHours(0, 0, 0, 0))
  const end = new Date(date.setHours(23, 59, 59, 999))

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: start, lte: end }, status: 'activa' },
  })

  const expectedTotal = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const difference = declaredTotal - expectedTotal

  const close = await prisma.cashClose.create({
    data: {
      userId: req.user!.id,
      expectedTotal,
      declaredTotal,
      difference,
      closeDate: start,
    },
  })

  res.status(201).json(close)
}

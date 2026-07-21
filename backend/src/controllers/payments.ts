import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const { invoice_id, purchase_invoice_id } = req.query
  const where: any = {}
  if (invoice_id) where.invoiceId = Number(invoice_id)
  if (purchase_invoice_id) where.purchaseInvoiceId = Number(purchase_invoice_id)

  const payments = await prisma.payment.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(payments)
}

export async function create(req: AuthRequest, res: Response) {
  const { invoiceId, purchaseInvoiceId, amount, method, reference, notes } = req.body
  if (!amount || (!invoiceId && !purchaseInvoiceId)) {
    res.status(400).json({ error: 'Monto y referencia requeridos' })
    return
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoiceId || null,
      purchaseInvoiceId: purchaseInvoiceId || null,
      amount,
      method: method || 'efectivo',
      reference,
      notes,
      userId: req.user!.id,
    },
    include: { user: { select: { id: true, name: true } } },
  })
  res.status(201).json(payment)
}

export async function totals(req: AuthRequest, res: Response) {
  const { invoice_id, purchase_invoice_id } = req.query

  if (invoice_id) {
    const invoice = await prisma.invoice.findUnique({ where: { id: Number(invoice_id) }, select: { total: true } })
    if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
    const payments = await prisma.payment.aggregate({
      where: { invoiceId: Number(invoice_id) },
      _sum: { amount: true },
    })
    const paid = payments._sum.amount || 0
    res.json({ total: Number(invoice.total), paid: Number(paid), pending: Number(invoice.total) - Number(paid) })
    return
  }

  if (purchase_invoice_id) {
    const purchase = await prisma.purchaseInvoice.findUnique({ where: { id: Number(purchase_invoice_id) }, select: { total: true } })
    if (!purchase) { res.status(404).json({ error: 'Compra no encontrada' }); return }
    const payments = await prisma.payment.aggregate({
      where: { purchaseInvoiceId: Number(purchase_invoice_id) },
      _sum: { amount: true },
    })
    const paid = payments._sum.amount || 0
    res.json({ total: Number(purchase.total), paid: Number(paid), pending: Number(purchase.total) - Number(paid) })
    return
  }

  res.json({ total: 0, paid: 0, pending: 0 })
}

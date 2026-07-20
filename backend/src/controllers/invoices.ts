import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const { date_from, date_to, status } = req.query
  const where: any = {}
  if (date_from || date_to) {
    where.createdAt = {}
    if (date_from) where.createdAt.gte = new Date(String(date_from))
    if (date_to) where.createdAt.lte = new Date(String(date_to) + 'T23:59:59.999Z')
  }
  if (status) where.status = status

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: { select: { id: true, name: true, documentType: true, documentNumber: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(invoices)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      user: { select: { id: true, name: true } },
      quote: { select: { id: true, number: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
  })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  res.json(invoice)
}

export async function create(req: AuthRequest, res: Response) {
  const { clientId, quoteId, paymentMethod, currency, exchangeRate, items } = req.body

  if (!clientId || !items?.length) {
    res.status(400).json({ error: 'Cliente y productos requeridos' })
    return
  }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
  const productMap = new Map(products.map((p) => [p.id, p]))

  let subtotal = 0
  let ivaTotal = 0
  const invoiceItems = items.map((i: any) => {
    const product = productMap.get(i.productId)
    if (!product) throw new Error(`Producto ${i.productId} no encontrado`)
    const unitPrice = i.unitPrice || Number(product.price)
    const itemSubtotal = unitPrice * i.quantity
    const itemIva = itemSubtotal * Number(product.ivaPercent) / 100
    subtotal += itemSubtotal
    ivaTotal += itemIva
    return {
      productId: i.productId,
      quantity: i.quantity,
      unitPrice,
      ivaPercent: product.ivaPercent,
      subtotal: itemSubtotal,
    }
  })

  const total = subtotal + ivaTotal
  const invCurrency = currency || 'usd'
  let totalBs = null
  if (invCurrency === 'usd' && exchangeRate) {
    totalBs = total * Number(exchangeRate)
  } else if (invCurrency === 'bs') {
    totalBs = total
  }

  const count = await prisma.invoice.count()
  const number = `FACT-${String(count + 1).padStart(4, '0')}`

  const invoice = await prisma.invoice.create({
    data: {
      number,
      clientId,
      userId: req.user!.id,
      quoteId: quoteId || null,
      currency: invCurrency,
      exchangeRate: exchangeRate || null,
      subtotal,
      ivaTotal,
      total,
      totalBs,
      paymentMethod: paymentMethod || 'efectivo',
      items: { create: invoiceItems },
    },
    include: {
      client: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  })

  for (const item of invoiceItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    })
  }

  res.status(201).json(invoice)
}

export async function cancel(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  if (invoice.status === 'anulada') { res.status(400).json({ error: 'La factura ya está anulada' }); return }

  await prisma.invoice.update({
    where: { id },
    data: { status: 'anulada', cancelledAt: new Date() },
  })

  for (const item of invoice.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    })
  }

  res.json({ message: 'Factura anulada exitosamente' })
}

export async function getPrintData(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      user: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
  })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }

  const company = {
    name: 'Efi- Pos',
    rif: 'J-12345678-9',
    address: 'Av. Principal, Local 1',
    phone: '0412-1234567',
  }

  res.json({ company, invoice })
}

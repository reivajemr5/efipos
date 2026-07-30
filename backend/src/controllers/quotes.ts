import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim()
  const status = String(req.query.status || '').trim()
  const where: any = {}
  if (status) where.status = status
  if (q) {
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { client: { name: { contains: q, mode: 'insensitive' } } },
      { client: { documentNumber: { contains: q } } },
    ]
  }
  const quotes = await prisma.quote.findMany({
    where,
    include: { client: { select: { id: true, name: true, documentType: true, documentNumber: true } }, items: { include: { product: { select: { id: true, name: true, code: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(quotes)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true, user: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true, code: true, price: true } } } } },
  })
  if (!quote) { res.status(404).json({ error: 'Cotización no encontrada' }); return }
  res.json(quote)
}

export async function create(req: AuthRequest, res: Response) {
  const { clientId, validUntil, currency, exchangeRate, items } = req.body
  if (!clientId || !items?.length) {
    res.status(400).json({ error: 'Cliente y productos requeridos' })
    return
  }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
  const productMap = new Map(products.map((p) => [p.id, p]))

  let subtotal = 0
  let ivaTotal = 0
  const quoteItems = items.map((i: any) => {
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
  const qCurrency = currency || 'usd'
  let totalBs = null
  if (qCurrency === 'usd' && exchangeRate) {
    totalBs = total * Number(exchangeRate)
  } else if (qCurrency === 'bs') {
    totalBs = total
  }

  const count = await prisma.quote.count()
  const number = `COTI-${String(count + 1).padStart(4, '0')}`

  const quote = await prisma.quote.create({
    data: {
      number,
      clientId,
      userId: req.user!.id,
      currency: qCurrency,
      exchangeRate: exchangeRate || null,
      subtotal,
      ivaTotal,
      total,
      totalBs,
      validUntil: new Date(validUntil || Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: { create: quoteItems },
    },
    include: { client: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } },
  })

  res.status(201).json(quote)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { clientId, validUntil, items } = req.body

  const existing = await prisma.quote.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ error: 'Cotización no encontrada' }); return }

  if (!items?.length) {
    res.status(400).json({ error: 'Productos requeridos' })
    return
  }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
  const productMap = new Map(products.map((p) => [p.id, p]))

  let subtotal = 0
  let ivaTotal = 0
  const quoteItems = items.map((i: any) => {
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
  const qCurrency = existing.currency || 'usd'
  let totalBs: number | null = existing.totalBs ? Number(existing.totalBs) : null
  if (qCurrency === 'usd' && existing.exchangeRate) {
    totalBs = total * Number(existing.exchangeRate)
  } else if (qCurrency === 'bs') {
    totalBs = total
  }

  // Delete old items and create new ones
  await prisma.quoteItem.deleteMany({ where: { quoteId: id } })
  await prisma.quoteItem.createMany({
    data: quoteItems.map((i: { productId: number; quantity: number; unitPrice: number; ivaPercent: string | number; subtotal: number }) => ({ ...i, quoteId: id })),
  })

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      ...(clientId && { clientId }),
      ...(validUntil && { validUntil: new Date(validUntil) }),
      subtotal,
      ivaTotal,
      total,
      totalBs,
    },
    include: { client: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } },
  })

  res.json(updated)
}

export async function convertToInvoice(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!quote) { res.status(404).json({ error: 'Cotización no encontrada' }); return }
  if (quote.status !== 'activa') { res.status(400).json({ error: 'La cotización no está activa' }); return }

  const invoiceCount = await prisma.invoice.count()
  const invoiceNumber = `FACT-${String(invoiceCount + 1).padStart(4, '0')}`

  const invoice = await prisma.invoice.create({
    data: {
      number: invoiceNumber,
      clientId: quote.clientId,
      userId: req.user!.id,
      quoteId: quote.id,
      currency: quote.currency,
      exchangeRate: quote.exchangeRate,
      subtotal: quote.subtotal,
      ivaTotal: quote.ivaTotal,
      total: quote.total,
      totalBs: quote.totalBs,
      items: {
        create: quote.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ivaPercent: item.ivaPercent,
          subtotal: item.subtotal,
        })),
      },
    },
  })

  await prisma.quote.update({ where: { id }, data: { status: 'convertida' } })

  for (const item of quote.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    })
  }

  res.json({ invoiceId: invoice.id, invoiceNumber: invoice.number, message: 'Cotización convertida a factura' })
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  await prisma.quote.delete({ where: { id } })
  res.status(204).send()
}

export async function getPrintData(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      user: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true, price: true } } },
      },
    },
  })
  if (!quote) { res.status(404).json({ error: 'Cotización no encontrada' }); return }

  const company = {
    name: 'Efi- Pos',
    rif: 'J-12345678-9',
    address: 'Av. Principal, Local 1',
    phone: '0412-1234567',
  }

  res.json({ company, quote })
}

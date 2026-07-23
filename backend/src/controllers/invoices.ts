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
  const { clientId, quoteId, paymentMethod, currency, exchangeRate, items, payments, status } = req.body
  const isDraft = status === 'borrador'

  if (!items?.length) {
    res.status(400).json({ error: 'Productos requeridos' })
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

  let finalClientId = clientId
  if (!finalClientId) {
    let walkIn = await prisma.client.findFirst({ where: { documentNumber: '00000000' } })
    if (!walkIn) {
      walkIn = await prisma.client.create({ data: { name: 'Consumidor Final', documentType: 'V', documentNumber: '00000000' } })
    }
    finalClientId = walkIn.id
  }

  const invoice = await prisma.invoice.create({
    data: {
      number,
      clientId: finalClientId,
      userId: req.user!.id,
      quoteId: quoteId || null,
      currency: invCurrency,
      exchangeRate: exchangeRate || null,
      subtotal,
      ivaTotal,
      total,
      totalBs,
      paymentMethod: paymentMethod || 'efectivo',
      status: isDraft ? 'borrador' : undefined,
      items: { create: invoiceItems },
      payments: payments?.length ? {
        create: payments.map((p: any) => ({
          amount: p.amount,
          method: p.method,
          reference: p.reference || null,
          userId: req.user!.id,
        })),
      } : undefined,
    },
    include: {
      client: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
      payments: true,
    },
  })

  if (!isDraft) {
    for (const item of invoiceItems) {
      const product = productMap.get(item.productId)!
      const stockBefore = Number(product.stock)
      const stockAfter = stockBefore - item.quantity
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: stockAfter },
      })
      await prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'sale',
          quantity: -item.quantity,
          stockBefore,
          stockAfter,
          reference: number,
          notes: `Venta #${number}`,
          userId: req.user!.id,
        },
      })
    }
  }

  res.status(201).json(invoice)
}

export async function listDrafts(req: AuthRequest, res: Response) {
  const drafts = await prisma.invoice.findMany({
    where: { userId: req.user!.id, status: 'borrador' },
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, name: true, documentType: true, documentNumber: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true, price: true } } },
      },
    },
  })
  res.json(drafts)
}

export async function completeDraft(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  if (invoice.status !== 'borrador') { res.status(400).json({ error: 'La factura no es un borrador' }); return }

  // Subtract stock
  for (const item of invoice.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (!product) continue
    const stockBefore = Number(product.stock)
    const stockAfter = stockBefore - item.quantity
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: stockAfter },
    })
    await prisma.stockMovement.create({
      data: {
        productId: item.productId,
        type: 'sale',
        quantity: -item.quantity,
        stockBefore,
        stockAfter,
        reference: invoice.number,
        notes: `Venta #${invoice.number}`,
        userId: req.user!.id,
      },
    })
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'activa' },
    include: {
      client: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  })
  res.json(updated)
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

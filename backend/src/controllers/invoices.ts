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
      balance: (paymentMethod || '').includes('credito')
        ? total - (payments?.filter((p: any) => p.method !== 'credito').reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)
        : 0,
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
  const q = String(req.query.q || '').trim()
  const where: any = { userId: req.user!.id, status: 'borrador' }
  if (q) {
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { client: { name: { contains: q, mode: 'insensitive' } } },
      { client: { documentNumber: { contains: q } } },
    ]
  }
  const drafts = await prisma.invoice.findMany({
    where,
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
  const { items: newItems, payments, exchangeRate: newRate, paymentMethod: newMethod } = req.body

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  if (invoice.status !== 'borrador') { res.status(400).json({ error: 'La factura no es un borrador' }); return }

  // If new items provided, recalculate totals and replace items
  let finalItems = invoice.items
  let finalSubtotal = Number(invoice.subtotal)
  let finalIvaTotal = Number(invoice.ivaTotal)
  let finalTotal = Number(invoice.total)
  let finalBalance = Number(invoice.balance)
  let finalTotalBs = invoice.totalBs ? Number(invoice.totalBs) : null

  if (newItems?.length) {
    const productIds = newItems.map((i: any) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
    const productMap = new Map(products.map((p) => [p.id, p]))

    let subtotal = 0
    let ivaTotal = 0
    const computedItems = newItems.map((i: any) => {
      const product = productMap.get(i.productId)
      if (!product) throw new Error(`Producto ${i.productId} no encontrado`)
      const unitPrice = i.unitPrice || Number(product.price)
      const itemSubtotal = unitPrice * i.quantity
      const itemIva = itemSubtotal * Number(product.ivaPercent) / 100
      subtotal += itemSubtotal
      ivaTotal += itemIva
      return { productId: i.productId, quantity: i.quantity, unitPrice, ivaPercent: product.ivaPercent, subtotal: itemSubtotal }
    })

    finalSubtotal = subtotal
    finalIvaTotal = ivaTotal
    finalTotal = subtotal + ivaTotal
    finalItems = computedItems as any

    const rate = newRate || invoice.exchangeRate
    if (rate) finalTotalBs = finalTotal * Number(rate)
    else finalTotalBs = null

    const payMethod = newMethod || invoice.paymentMethod
    finalBalance = payMethod.includes('credito')
      ? finalTotal - (payments?.filter((p: any) => p.method !== 'credito').reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)
      : 0

    // Delete old items and create new ones
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await prisma.invoiceItem.createMany({
      data: computedItems.map((i: any) => ({ ...i, invoiceId: id })),
    })
  }

  // Subtract stock for final items
  for (const item of finalItems) {
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

  // Create payments if provided
  if (payments?.length) {
    await prisma.payment.createMany({
      data: payments.map((p: any) => ({
        invoiceId: id,
        amount: p.amount,
        method: p.method,
        reference: p.reference || null,
        userId: req.user!.id,
      })),
    })
  }

  const updateData: any = {
    status: 'activa',
    subtotal: finalSubtotal,
    ivaTotal: finalIvaTotal,
    total: finalTotal,
    totalBs: finalTotalBs,
    balance: finalBalance,
  }
  if (newMethod) updateData.paymentMethod = newMethod
  if (newRate) updateData.exchangeRate = newRate

  const updated = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      client: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
      payments: true,
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
    data: { status: 'anulada', cancelledAt: new Date(), balance: 0 },
  })

  for (const item of invoice.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    })
  }

  res.json({ message: 'Factura anulada exitosamente' })
}

export async function abonar(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { amountBs, exchangeRate } = req.body
  if (!amountBs || amountBs <= 0) {
    res.status(400).json({ error: 'Monto inválido' })
    return
  }
  if (!exchangeRate || exchangeRate <= 0) {
    res.status(400).json({ error: 'Tasa de cambio inválida' })
    return
  }

  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  if (invoice.status === 'anulada') { res.status(400).json({ error: 'Factura anulada' }); return }

  const amountUsd = Math.round((amountBs / exchangeRate) * 100) / 100
  const currentBalance = Number(invoice.balance)
  if (amountUsd > currentBalance) {
    res.status(400).json({ error: `El abono excede el saldo pendiente de $${currentBalance.toFixed(2)}` })
    return
  }

  const newBalance = Math.round((currentBalance - amountUsd) * 100) / 100

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId: id,
        amount: amountUsd,
        method: 'abono_credito',
        reference: `Bs.${amountBs.toFixed(2)} @ ${exchangeRate.toFixed(2)}`,
        notes: `Abono a crédito. Tasa: Bs.${exchangeRate.toFixed(2)}/USD`,
        userId: req.user!.id,
      },
    }),
    prisma.invoice.update({
      where: { id },
      data: { balance: newBalance },
    }),
  ])

  const updated = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, documentType: true, documentNumber: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })

  res.json(updated)
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

export async function updateDraft(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { items, exchangeRate, paymentMethod } = req.body

  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  if (invoice.status !== 'borrador') { res.status(400).json({ error: 'La factura no es un borrador' }); return }
  if (!items?.length) { res.status(400).json({ error: 'Productos requeridos' }); return }

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
    return { productId: i.productId, quantity: i.quantity, unitPrice, ivaPercent: product.ivaPercent, subtotal: itemSubtotal }
  })

  const total = subtotal + ivaTotal
  const rate = exchangeRate || invoice.exchangeRate
  let totalBs = null
  if (rate) totalBs = total * Number(rate)

  const payMethod = paymentMethod || invoice.paymentMethod
  const balance = payMethod.includes('credito') ? total : 0

  // Delete old items and create new ones
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
  await prisma.invoiceItem.createMany({
    data: invoiceItems.map((i: any) => ({ ...i, invoiceId: id })),
  })

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      subtotal,
      ivaTotal,
      total,
      totalBs,
      paymentMethod: payMethod,
      exchangeRate: rate || null,
      balance,
    },
    include: {
      client: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  })

  res.json(updated)
}

import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext } from '../lib/tenant'
import { changeStock } from '../lib/stock'
import { validateItems } from '../lib/validation'
import { nextDocumentNumber } from '../lib/numbering'

async function creditClientError(paymentMethod: string | undefined, clientId: number): Promise<string | null> {
  if (!(paymentMethod || '').includes('credito')) return null
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { documentNumber: true } })
  if (client && client.documentNumber === '00000000') return 'Crédito requiere un cliente identificado'
  return null
}

export async function list(req: AuthRequest, res: Response) {
  const { date_from, date_to, status } = req.query
  const q = String(req.query.q || '').trim()
  const ctx = resolveContext(req)
  const where: any = { businessId: ctx.businessId ?? 0 }
  if (ctx.branchId) where.branchId = ctx.branchId
  if (date_from || date_to) {
    where.createdAt = {}
    if (date_from) where.createdAt.gte = new Date(String(date_from))
    if (date_to) where.createdAt.lte = new Date(String(date_to) + 'T23:59:59.999Z')
  }
  if (status) where.status = status
  if (q) {
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { client: { name: { contains: q, mode: 'insensitive' } } },
      { client: { documentNumber: { contains: q } } },
    ]
  }

  const include = { client: { select: { id: true, name: true, documentType: true, documentNumber: true } } }
  const orderBy = { createdAt: 'desc' as const }
  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const result = await paginate(prisma.invoice, { where, include, orderBy }, limit, offset)
    res.json(result)
    return
  }

  const invoices = await prisma.invoice.findMany({ where, include, orderBy })
  res.json(invoices)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const where: any = { id, businessId: ctx.businessId ?? 0 }
  if (ctx.branchId) where.branchId = ctx.branchId
  const invoice = await prisma.invoice.findFirst({
    where,
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
  const { clientId, quoteId, paymentMethod, currency, exchangeRate, items, payments, status, discount, requestKey } = req.body
  const ctx = resolveContext(req)
  const isDraft = status === 'borrador'

  if (!items?.length) {
    res.status(400).json({ error: 'Productos requeridos' })
    return
  }
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }

  if (requestKey) {
    const existing = await prisma.invoice.findFirst({ where: { businessId: ctx.businessId, requestKey } })
    if (existing) {
      const dup = await prisma.invoice.findFirst({
        where: { id: existing.id },
        include: { client: { select: { id: true, name: true } }, items: true, payments: true },
      })
      res.status(200).json({ ...dup, _dup: true })
      return
    }
  }

  const itemsError = validateItems(items)
  if (itemsError) {
    res.status(400).json({ error: itemsError })
    return
  }

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: Number(clientId) } })
    if (!client) {
      res.status(400).json({ error: 'Cliente no válido' })
      return
    }
  }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId: ctx.businessId } })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const globalDisc = Math.max(0, Number(discount) || 0)
  let subtotal = 0
  let ivaTotal = 0
  const invoiceItems = items.map((i: any) => {
    const product = productMap.get(i.productId)
    if (!product) throw new Error(`Producto ${i.productId} no encontrado`)
    const unitPrice = i.unitPrice || Number(product.price)
    const lineDisc = Math.min(Math.max(0, Number(i.discount) || 0), unitPrice * i.quantity)
    const itemSubtotal = unitPrice * i.quantity - lineDisc
    const itemIva = itemSubtotal * Number(product.ivaPercent) / 100
    subtotal += itemSubtotal
    ivaTotal += itemIva
    return {
      productId: i.productId,
      quantity: i.quantity,
      unitPrice,
      discount: lineDisc || null,
      ivaPercent: product.ivaPercent,
      subtotal: itemSubtotal,
    }
  })

  const total = Math.max(0, subtotal + ivaTotal - globalDisc)
  const invCurrency = currency || 'usd'
  let totalBs = null
  if (invCurrency === 'usd' && exchangeRate) {
    totalBs = total * Number(exchangeRate)
  } else if (invCurrency === 'bs') {
    totalBs = total
  }

  const number = await nextDocumentNumber('FACT-', String(ctx.businessId))

  let finalClientId = clientId
  if (!finalClientId) {
    let walkIn = await prisma.client.findFirst({ where: { businessId: ctx.businessId, documentNumber: '00000000' } })
    if (!walkIn) {
      walkIn = await prisma.client.create({
        data: { businessId: ctx.businessId, name: 'Consumidor Final', documentType: 'V', documentNumber: '00000000' },
      })
    }
    finalClientId = walkIn.id
  }

  const creditErr = await creditClientError(paymentMethod, finalClientId)
  if (creditErr) { res.status(400).json({ error: creditErr }); return }

  const invoice = await prisma.invoice.create({
    data: {
      businessId: ctx.businessId,
      branchId: ctx.branchId ?? 0,
      number,
      clientId: finalClientId,
      userId: req.user!.id,
      quoteId: quoteId || null,
      currency: invCurrency,
      exchangeRate: exchangeRate || null,
      discount: globalDisc || null,
      subtotal,
      ivaTotal,
      total,
      totalBs,
      paymentMethod: paymentMethod || 'efectivo',
      status: isDraft ? 'borrador' : undefined,
      requestKey: requestKey || null,
      items: { create: invoiceItems },
      payments: payments?.length ? {
        create: payments.map((p: any) => ({
          amount: p.amount,
          method: p.method,
          reference: p.reference || null,
          businessId: ctx.businessId,
          branchId: ctx.branchId ?? 0,
          userId: req.user!.id,
        })),
      } : undefined,
      balance: isDraft
        ? 0
        : (paymentMethod || '').includes('credito')
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
    await prisma.$transaction(async (tx) => {
      for (const item of invoiceItems) {
        await changeStock(tx, {
          businessId: ctx.businessId!,
          branchId: ctx.branchId ?? 0,
          productId: item.productId,
          type: 'sale',
          quantity: -item.quantity,
          reference: number,
          notes: `Venta #${number}`,
          userId: req.user!.id,
        })
      }
    })
  }

  res.status(201).json(invoice)
}

export async function listDrafts(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim()
  const ctx = resolveContext(req)
  const where: any = { userId: req.user!.id, status: 'borrador', businessId: ctx.businessId ?? 0 }
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
  const { items: newItems, payments, exchangeRate: newRate, paymentMethod: newMethod, discount: newDiscount } = req.body
  const ctx = resolveContext(req)

  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: { items: true },
  })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  if (invoice.status !== 'borrador') { res.status(400).json({ error: 'La factura no es un borrador' }); return }

  const creditErr = await creditClientError(newMethod || invoice.paymentMethod, invoice.clientId)
  if (creditErr) { res.status(400).json({ error: creditErr }); return }

  let finalItems = invoice.items
  let finalSubtotal = Number(invoice.subtotal)
  let finalIvaTotal = Number(invoice.ivaTotal)
  let finalTotal = Number(invoice.total)
  let finalDiscount = invoice.discount ? Number(invoice.discount) : 0
  let finalBalance = Number(invoice.balance)
  let finalTotalBs = invoice.totalBs ? Number(invoice.totalBs) : null

  if (newItems?.length) {
    const productIds = newItems.map((i: any) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId: ctx.businessId ?? 0 } })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const globalDisc = Math.max(0, Number(newDiscount) || 0)
    let subtotal = 0
    let ivaTotal = 0
    const computedItems = newItems.map((i: any) => {
      const product = productMap.get(i.productId)
      if (!product) throw new Error(`Producto ${i.productId} no encontrado`)
      const unitPrice = i.unitPrice || Number(product.price)
      const lineDisc = Math.min(Math.max(0, Number(i.discount) || 0), unitPrice * i.quantity)
      const itemSubtotal = unitPrice * i.quantity - lineDisc
      const itemIva = itemSubtotal * Number(product.ivaPercent) / 100
      subtotal += itemSubtotal
      ivaTotal += itemIva
      return { productId: i.productId, quantity: i.quantity, unitPrice, discount: lineDisc || null, ivaPercent: product.ivaPercent, subtotal: itemSubtotal }
    })

    finalSubtotal = subtotal
    finalIvaTotal = ivaTotal
    finalDiscount = globalDisc
    finalTotal = Math.max(0, subtotal + ivaTotal - globalDisc)
    finalItems = computedItems as any

    const rate = newRate || invoice.exchangeRate
    if (rate) finalTotalBs = finalTotal * Number(rate)
    else finalTotalBs = null

    const payMethod = newMethod || invoice.paymentMethod
    finalBalance = payMethod.includes('credito')
      ? finalTotal - (payments?.filter((p: any) => p.method !== 'credito').reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)
      : 0

    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await prisma.invoiceItem.createMany({
      data: computedItems.map((i: any) => ({ ...i, invoiceId: id })),
    })
  }

  await prisma.$transaction(async (tx) => {
    for (const item of finalItems) {
      await changeStock(tx, {
        businessId: invoice.businessId,
        branchId: invoice.branchId,
        productId: item.productId,
        type: 'sale',
        quantity: -item.quantity,
        reference: invoice.number,
        notes: `Venta #${invoice.number}`,
        userId: req.user!.id,
      })
    }
    if (payments?.length) {
      await tx.payment.createMany({
        data: payments.map((p: any) => ({
          invoiceId: id,
          amount: p.amount,
          method: p.method,
          reference: p.reference || null,
          businessId: invoice.businessId,
          branchId: invoice.branchId,
          userId: req.user!.id,
        })),
      })
    }
  })

  const updateData: any = {
    status: 'activa',
    discount: finalDiscount || null,
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
  const ctx = resolveContext(req)
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: { items: true },
  })

  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  if (invoice.status === 'anulada') { res.status(400).json({ error: 'La factura ya está anulada' }); return }

  await prisma.invoice.update({
    where: { id },
    data: { status: 'anulada', cancelledAt: new Date(), balance: 0 },
  })

  await prisma.$transaction(async (tx) => {
    for (const item of invoice.items) {
      await changeStock(tx, {
        businessId: invoice.businessId,
        branchId: invoice.branchId,
        productId: item.productId,
        type: 'cancellation',
        quantity: item.quantity,
        reference: invoice.number,
        notes: `Anulación #${invoice.number}`,
        userId: req.user!.id,
      })
    }
  })

  res.json({ message: 'Factura anulada exitosamente' })
}

export async function abonar(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { amountBs, exchangeRate, requestKey } = req.body
  const ctx = resolveContext(req)
  if (!amountBs || amountBs <= 0) {
    res.status(400).json({ error: 'Monto inválido' })
    return
  }
  if (!exchangeRate || exchangeRate <= 0) {
    res.status(400).json({ error: 'Tasa de cambio inválida' })
    return
  }

  if (requestKey) {
    const existing = await prisma.payment.findFirst({ where: { businessId: ctx.businessId ?? 0, requestKey } })
    if (existing) { res.status(200).json({ message: 'Abono ya registrado', payment: existing, _dup: true }); return }
  }

  const invoice = await prisma.invoice.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
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
        businessId: invoice.businessId,
        branchId: invoice.branchId,
        userId: req.user!.id,
        requestKey: requestKey || null,
      },
    }),
    prisma.invoice.update({
      where: { id },
      data: { balance: newBalance },
    }),
  ])

  const updated = await prisma.invoice.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: {
      client: { select: { id: true, name: true, documentType: true, documentNumber: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })

  res.json(updated)
}

export async function getPrintData(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: {
      client: true,
      user: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
  })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }

  const business = await prisma.business.findUnique({ where: { id: invoice.businessId } })
  const company = {
    name: business?.name || 'Mi Negocio',
    rif: business?.rif || '',
    address: business?.address || '',
    phone: business?.phone || '',
  }

  res.json({ company, invoice })
}

export async function updateDraft(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { items, exchangeRate, paymentMethod, discount } = req.body
  const ctx = resolveContext(req)

  const invoice = await prisma.invoice.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!invoice) { res.status(404).json({ error: 'Factura no encontrada' }); return }
  if (invoice.status !== 'borrador') { res.status(400).json({ error: 'La factura no es un borrador' }); return }
  if (!items?.length) { res.status(400).json({ error: 'Productos requeridos' }); return }

  const payMethod = paymentMethod || invoice.paymentMethod
  const creditErr = await creditClientError(payMethod, invoice.clientId)
  if (creditErr) { res.status(400).json({ error: creditErr }); return }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId: ctx.businessId ?? 0 } })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const globalDisc = Math.max(0, Number(discount) || 0)
  let subtotal = 0
  let ivaTotal = 0
  const invoiceItems = items.map((i: any) => {
    const product = productMap.get(i.productId)
    if (!product) throw new Error(`Producto ${i.productId} no encontrado`)
    const unitPrice = i.unitPrice || Number(product.price)
    const lineDisc = Math.min(Math.max(0, Number(i.discount) || 0), unitPrice * i.quantity)
    const itemSubtotal = unitPrice * i.quantity - lineDisc
    const itemIva = itemSubtotal * Number(product.ivaPercent) / 100
    subtotal += itemSubtotal
    ivaTotal += itemIva
    return { productId: i.productId, quantity: i.quantity, unitPrice, discount: lineDisc || null, ivaPercent: product.ivaPercent, subtotal: itemSubtotal }
  })

  const total = Math.max(0, subtotal + ivaTotal - globalDisc)
  const rate = exchangeRate || invoice.exchangeRate
  let totalBs = null
  if (rate) totalBs = total * Number(rate)

  const balance = 0

  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
  await prisma.invoiceItem.createMany({
    data: invoiceItems.map((i: any) => ({ ...i, invoiceId: id })),
  })

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      discount: globalDisc || null,
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
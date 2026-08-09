import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext, resolveEffectiveBranchId } from '../lib/tenant'
import { changeStock } from '../lib/stock'
import { validateItems } from '../lib/validation'
import { nextDocumentNumber } from '../lib/numbering'

export async function list(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim()
  const status = String(req.query.status || '').trim()
  const ctx = resolveContext(req)
  const where: any = { businessId: ctx.businessId ?? 0 }
  if (status) where.status = status
  if (q) {
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { client: { name: { contains: q, mode: 'insensitive' } } },
      { client: { documentNumber: { contains: q } } },
    ]
  }
  const include = { client: { select: { id: true, name: true, documentType: true, documentNumber: true } }, items: { include: { product: { select: { id: true, name: true, code: true } } } } }
  const orderBy = { createdAt: 'desc' as const }
  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const result = await paginate(prisma.quote, { where, include, orderBy }, limit, offset)
    res.json(result)
    return
  }
  const quotes = await prisma.quote.findMany({ where, include, orderBy })
  res.json(quotes)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const quote = await prisma.quote.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: { client: true, user: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true, code: true, price: true } } } } },
  })
  if (!quote) { res.status(404).json({ error: 'Cotización no encontrada' }); return }
  res.json(quote)
}

export async function create(req: AuthRequest, res: Response) {
  const { clientId, validUntil, currency, exchangeRate, items, discount } = req.body
  const ctx = resolveContext(req)
  if (!clientId || !items?.length) {
    res.status(400).json({ error: 'Cliente y productos requeridos' })
    return
  }
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }

  const branchId = await resolveEffectiveBranchId(ctx)
  if (!branchId) { res.status(403).json({ error: 'La empresa no tiene sucursales activas' }); return }

  const itemsError = validateItems(items)
  if (itemsError) {
    res.status(400).json({ error: itemsError })
    return
  }

  const client = await prisma.client.findUnique({ where: { id: Number(clientId) } })
  if (!client) {
    res.status(400).json({ error: 'Cliente no válido' })
    return
  }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId: ctx.businessId } })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const globalDisc = Math.max(0, Number(discount) || 0)
  let subtotal = 0
  let ivaTotal = 0
  const quoteItems = items.map((i: any) => {
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
  const qCurrency = currency || 'usd'
  let totalBs = null
  if (qCurrency === 'usd' && exchangeRate) {
    totalBs = total * Number(exchangeRate)
  } else if (qCurrency === 'bs') {
    totalBs = total
  }

  const number = await nextDocumentNumber('COTI-', String(ctx.businessId))

  const quote = await prisma.quote.create({
    data: {
      businessId: ctx.businessId,
      branchId,
      number,
      clientId,
      userId: req.user!.id,
      currency: qCurrency,
      exchangeRate: exchangeRate || null,
      discount: globalDisc || null,
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
  const { clientId, validUntil, items, discount } = req.body
  const ctx = resolveContext(req)

  const existing = await prisma.quote.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!existing) { res.status(404).json({ error: 'Cotización no encontrada' }); return }

  if (!items?.length) {
    res.status(400).json({ error: 'Productos requeridos' })
    return
  }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId: ctx.businessId ?? 0 } })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const globalDisc = Math.max(0, Number(discount) || 0)
  let subtotal = 0
  let ivaTotal = 0
  const quoteItems = items.map((i: any) => {
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
  const qCurrency = existing.currency || 'usd'
  let totalBs: number | null = existing.totalBs ? Number(existing.totalBs) : null
  if (qCurrency === 'usd' && existing.exchangeRate) {
    totalBs = total * Number(existing.exchangeRate)
  } else if (qCurrency === 'bs') {
    totalBs = total
  }

  await prisma.quoteItem.deleteMany({ where: { quoteId: id } })
  await prisma.quoteItem.createMany({
    data: quoteItems.map((i: any) => ({ ...i, quoteId: id })),
  })

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      ...(clientId && { clientId }),
      ...(validUntil && { validUntil: new Date(validUntil) }),
      discount: globalDisc || null,
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
  const ctx = resolveContext(req)
  const quote = await prisma.quote.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: { items: true },
  })

  if (!quote) { res.status(404).json({ error: 'Cotización no encontrada' }); return }
  if (quote.status !== 'activa') { res.status(400).json({ error: 'La cotización no está activa' }); return }

  const invoiceNumber = await nextDocumentNumber('FACT-', String(quote.businessId))

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        businessId: quote.businessId,
        branchId: ctx.branchId ?? quote.branchId,
        number: invoiceNumber,
        clientId: quote.clientId,
        userId: req.user!.id,
        quoteId: quote.id,
        currency: quote.currency,
        exchangeRate: quote.exchangeRate,
        discount: quote.discount,
        subtotal: quote.subtotal,
        ivaTotal: quote.ivaTotal,
        total: quote.total,
        totalBs: quote.totalBs,
        items: {
          create: quote.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            ivaPercent: item.ivaPercent,
            subtotal: item.subtotal,
          })),
        },
      },
    })

    for (const item of quote.items) {
      await changeStock(tx, {
        businessId: quote.businessId,
        branchId: ctx.branchId ?? quote.branchId,
        productId: item.productId,
        type: 'sale',
        quantity: -item.quantity,
        userId: req.user!.id,
        reference: `FACT-${invoiceNumber}`,
      })
    }
    return inv
  })

  await prisma.quote.update({ where: { id }, data: { status: 'convertida' } })

  res.json({ invoiceId: invoice.id, invoiceNumber: invoice.number, message: 'Cotización convertida a factura' })
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.quote.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!existing) { res.status(404).json({ error: 'Cotización no encontrada' }); return }
  await prisma.quote.delete({ where: { id } })
  res.status(204).send()
}

export async function getPrintData(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const quote = await prisma.quote.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: {
      client: true,
      user: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true, price: true } } },
      },
    },
  })
  if (!quote) { res.status(404).json({ error: 'Cotización no encontrada' }); return }

  const business = await prisma.business.findUnique({ where: { id: quote.businessId } })
  const company = {
    name: business?.name || 'Mi Negocio',
    rif: business?.rif || '',
    address: business?.address || '',
    phone: business?.phone || '',
  }

  res.json({ company, quote })
}
import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext } from '../lib/tenant'
import { changeStock } from '../lib/stock'

export async function list(req: AuthRequest, res: Response) {
  const { status } = req.query
  const ctx = resolveContext(req)
  const where: any = { businessId: ctx.businessId ?? 0 }
  if (status) where.status = status
  if (ctx.branchId) where.branchId = ctx.branchId

  const include = {
    supplier: { select: { id: true, name: true, documentType: true, documentNumber: true } },
    items: { include: { product: { select: { id: true, name: true, code: true } } } },
  }
  const orderBy = { createdAt: 'desc' as const }
  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const result = await paginate(prisma.purchaseInvoice, { where, include, orderBy }, limit, offset)
    res.json(result)
    return
  }

  const purchases = await prisma.purchaseInvoice.findMany({ where, include, orderBy })
  res.json(purchases)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const where: any = { id, businessId: ctx.businessId ?? 0 }
  if (ctx.branchId) where.branchId = ctx.branchId
  const purchase = await prisma.purchaseInvoice.findFirst({
    where,
    include: {
      supplier: true,
      user: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
  })
  if (!purchase) { res.status(404).json({ error: 'Compra no encontrada' }); return }
  res.json(purchase)
}

export async function create(req: AuthRequest, res: Response) {
  const { supplierId, currency, exchangeRate, paymentMethod, dueDate, notes, items, type, sourceOrderId, requestKey, paid } = req.body
  const ctx = resolveContext(req)

  if (!supplierId || !items?.length) {
    res.status(400).json({ error: 'Proveedor y productos requeridos' })
    return
  }
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }

  if (requestKey) {
    const existing = await prisma.purchaseInvoice.findFirst({ where: { businessId: ctx.businessId, requestKey } })
    if (existing) {
      const dup = await prisma.purchaseInvoice.findFirst({
        where: { id: existing.id },
        include: { supplier: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } },
      })
      res.status(200).json({ ...dup, _dup: true })
      return
    }
  }

  const branchId = ctx.branchId ?? (await prisma.branch.findFirst({ where: { businessId: ctx.businessId, active: true }, select: { id: true }, orderBy: { id: 'asc' } }))?.id ?? 0
  if (!branchId) { res.status(403).json({ error: 'La empresa no tiene sucursales activas' }); return }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId: ctx.businessId } })
  const productMap = new Map(products.map((p) => [p.id, p]))

  let subtotal = 0
  let ivaTotal = 0
  const purchaseItems = items.map((i: any) => {
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
      salePrice: i.salePrice,
      distribution: Array.isArray(i.distribution) ? i.distribution : undefined,
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

  const count = await prisma.purchaseInvoice.count({ where: { businessId: ctx.businessId } })
  const prefix = type === 'factura' ? 'FACT-C' : 'PED-'
  const number = `${prefix}${String(count + 1).padStart(4, '0')}`
  const isFactura = type === 'factura'
  const status = isFactura ? (paid ? 'pagada' : 'recibido') : 'pedido'

  let purchase: any
  try {
    purchase = await prisma.purchaseInvoice.create({
      data: {
        businessId: ctx.businessId,
        branchId,
        number,
        supplierId,
        userId: req.user!.id,
        currency: invCurrency,
        exchangeRate: exchangeRate || null,
        subtotal,
        ivaTotal,
        total,
        totalBs,
        status,
        paymentMethod: paymentMethod || 'efectivo_bs',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        requestKey: requestKey || null,
        items: { create: purchaseItems.map((it: any) => { const { salePrice: _sp, distribution: _d, ...rest } = it; return rest }) },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    })
  } catch (e: any) {
    if (requestKey && e?.code === 'P2002') {
      const dup = await prisma.purchaseInvoice.findFirst({
        where: { businessId: ctx.businessId, requestKey },
        include: { supplier: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } },
      })
      if (dup) { res.status(200).json({ ...dup, _dup: true }); return }
    }
    throw e
  }

  if (isFactura) {
    const branches = await prisma.branch.findMany({ where: { businessId: ctx.businessId, active: true }, select: { id: true } })
    const branchIds = new Set(branches.map((b) => b.id))

    await prisma.$transaction(async (tx) => {
      for (const it of purchaseItems) {
        const dist = Array.isArray(it.distribution) && it.distribution.length
          ? it.distribution
          : [{ branchId, quantity: it.quantity }]
        let allocated = 0
        for (const d of dist) {
          const q = Math.max(0, Number(d.quantity) || 0)
          if (q <= 0) continue
          if (!branchIds.has(Number(d.branchId))) throw new Error(`Sucursal ${d.branchId} no pertenece al negocio`)
          allocated += q
          await changeStock(tx, {
            businessId: ctx.businessId!,
            branchId: Number(d.branchId),
            productId: it.productId,
            type: 'purchase',
            quantity: q,
            reference: number,
            notes: `Compra #${number}`,
            userId: req.user!.id,
          })
        }
        if (allocated !== it.quantity) throw new Error(`La distribución del producto ${it.productId} no suma ${it.quantity}`)
      }
    })

    for (const it of purchaseItems) {
      if (it.salePrice !== undefined && it.salePrice !== null) {
        const product = productMap.get(it.productId)
        const saleVal = Number(it.salePrice)
        const invRate = exchangeRate ? Number(exchangeRate) : null
        const costUsd = invCurrency === 'bs' && invRate ? it.unitPrice / invRate : it.unitPrice
        let priceVal = saleVal
        if (product && invRate) {
          if (product.currency === 'usd' && invCurrency === 'bs') priceVal = saleVal / invRate
          else if (product.currency === 'bs' && invCurrency === 'usd') priceVal = saleVal * invRate
        }
        await prisma.product.update({
          where: { id: it.productId },
          data: { price: priceVal, cost: Number(costUsd) || it.unitPrice },
        })
      }
    }
  }

  if (isFactura && sourceOrderId) {
    const source = await prisma.purchaseInvoice.findFirst({
      where: { id: Number(sourceOrderId), businessId: ctx.businessId, supplierId, status: 'pedido' },
    })
    if (source) {
      await prisma.purchaseInvoice.update({
        where: { id: source.id },
        data: {
          status: 'anulada',
          notes: source.notes ? `${source.notes} | Convertido a factura ${number}` : `Convertido a factura ${number}`,
        },
      })
    }
  }

  res.status(201).json(purchase)
}

export async function receive(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { items: receivedItems } = req.body
  const ctx = resolveContext(req)

  const purchase = await prisma.purchaseInvoice.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: { items: true },
  })

  if (!purchase) { res.status(404).json({ error: 'Compra no encontrada' }); return }
  if (purchase.status !== 'pedido') { res.status(400).json({ error: 'Solo se pueden recibir pedidos pendientes' }); return }

  if (receivedItems?.length) {
    const receivedIds = receivedItems.map((i: any) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: receivedIds }, businessId: ctx.businessId ?? 0 } })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const existingIds = purchase.items.map((i) => i.productId)
    const toRemove = purchase.items.filter((i) => !receivedIds.includes(i.productId))

    await prisma.$transaction(async (tx) => {
      for (const item of toRemove) {
        await tx.purchaseInvoiceItem.delete({ where: { id: item.id } })
      }

      for (const ri of receivedItems) {
        const product = productMap.get(ri.productId)
        if (!product) throw new Error(`Producto ${ri.productId} no encontrado`)

        const existing = purchase.items.find((i) => i.productId === ri.productId)
        const unitPrice = ri.unitPrice || Number(product.price)
        const itemSubtotal = unitPrice * ri.quantity
        const itemIva = itemSubtotal * Number(product.ivaPercent) / 100

        if (existing) {
          await tx.purchaseInvoiceItem.update({
            where: { id: existing.id },
            data: { quantity: ri.quantity, unitPrice, subtotal: itemSubtotal },
          })
        } else {
          await tx.purchaseInvoiceItem.create({
            data: {
              purchaseInvoiceId: id,
              productId: ri.productId,
              quantity: ri.quantity,
              unitPrice,
              ivaPercent: product.ivaPercent,
              subtotal: itemSubtotal,
            },
          })
        }

        await changeStock(tx, {
          businessId: purchase.businessId,
          branchId: purchase.branchId,
          productId: ri.productId,
          type: 'purchase',
          quantity: ri.quantity,
          reference: purchase.number,
          notes: `Recepción de compra #${purchase.number}`,
          userId: req.user!.id,
        })
      }

      const allItems = await tx.purchaseInvoiceItem.findMany({ where: { purchaseInvoiceId: id } })
      const subtotal = allItems.reduce((s, i) => s + Number(i.subtotal), 0)
      const ivaTotal = allItems.reduce((s, i) => s + Number(i.subtotal) * Number(i.ivaPercent) / 100, 0)
      const total = subtotal + ivaTotal

      await tx.purchaseInvoice.update({
        where: { id },
        data: { status: 'recibido', subtotal, ivaTotal, total },
      })
    })
  } else {
    await prisma.purchaseInvoice.update({
      where: { id },
      data: { status: 'recibido' },
    })

    await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await changeStock(tx, {
          businessId: purchase.businessId,
          branchId: purchase.branchId,
          productId: item.productId,
          type: 'purchase',
          quantity: item.quantity,
          reference: purchase.number,
          notes: `Recepción de compra #${purchase.number}`,
          userId: req.user!.id,
        })
      }
    })
  }

  const updated = await prisma.purchaseInvoice.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: { items: { include: { product: { select: { id: true, name: true, code: true } } } } },
  })

  res.json({ message: 'Pedido recibido exitosamente', purchase: updated })
}

export async function markAsPaid(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const purchase = await prisma.purchaseInvoice.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!purchase) { res.status(404).json({ error: 'Compra no encontrada' }); return }
  if (purchase.status === 'anulada') { res.status(400).json({ error: 'No se puede pagar una compra anulada' }); return }
  if (purchase.status === 'pedido') { res.status(400).json({ error: 'Debe recibir el pedido antes de pagar' }); return }

  const updated = await prisma.purchaseInvoice.update({
    where: { id },
    data: { status: 'pagada' },
  })
  res.json(updated)
}

export async function cancel(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const purchase = await prisma.purchaseInvoice.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: { items: true },
  })

  if (!purchase) { res.status(404).json({ error: 'Compra no encontrada' }); return }
  if (purchase.status === 'anulada') { res.status(400).json({ error: 'La compra ya está anulada' }); return }

  await prisma.purchaseInvoice.update({
    where: { id },
    data: { status: 'anulada', cancelledAt: new Date() },
  })

  if (purchase.status === 'recibido' || purchase.status === 'pagada') {
    await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await changeStock(tx, {
          businessId: purchase.businessId,
          branchId: purchase.branchId,
          productId: item.productId,
          type: 'purchase_cancellation',
          quantity: -item.quantity,
          reference: purchase.number,
          notes: `Anulación de compra #${purchase.number}`,
          userId: req.user!.id,
        })
      }
    })
  }

  res.json({ message: 'Compra anulada exitosamente' })
}
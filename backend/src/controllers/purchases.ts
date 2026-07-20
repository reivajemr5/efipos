import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const { status } = req.query
  const where: any = {}
  if (status) where.status = status

  const purchases = await prisma.purchaseInvoice.findMany({
    where,
    include: { supplier: { select: { id: true, name: true, documentType: true, documentNumber: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(purchases)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const purchase = await prisma.purchaseInvoice.findUnique({
    where: { id },
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
  const { supplierId, currency, exchangeRate, paymentMethod, dueDate, notes, items, type } = req.body

  if (!supplierId || !items?.length) {
    res.status(400).json({ error: 'Proveedor y productos requeridos' })
    return
  }

  const productIds = items.map((i: any) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
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

  const count = await prisma.purchaseInvoice.count()
  const prefix = type === 'factura' ? 'FACT-C' : 'PED-'
  const number = `${prefix}${String(count + 1).padStart(4, '0')}`
  const status = type === 'factura' ? 'recibido' : 'pedido'

  const purchase = await prisma.purchaseInvoice.create({
    data: {
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
      items: { create: purchaseItems },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  })

  if (type === 'factura') {
    for (const item of purchaseItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    }
  }

  res.status(201).json(purchase)
}

export async function receive(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { items: receivedItems } = req.body

  const purchase = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!purchase) { res.status(404).json({ error: 'Compra no encontrada' }); return }
  if (purchase.status !== 'pedido') { res.status(400).json({ error: 'Solo se pueden recibir pedidos pendientes' }); return }

  if (receivedItems?.length) {
    const receivedIds = receivedItems.map((i: any) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: receivedIds } } })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const existingIds = purchase.items.map((i) => i.productId)
    const toRemove = purchase.items.filter((i) => !receivedIds.includes(i.productId))

    for (const item of toRemove) {
      await prisma.purchaseInvoiceItem.delete({ where: { id: item.id } })
    }

    for (const ri of receivedItems) {
      const product = productMap.get(ri.productId)
      if (!product) throw new Error(`Producto ${ri.productId} no encontrado`)

      const existing = purchase.items.find((i) => i.productId === ri.productId)
      const unitPrice = ri.unitPrice || Number(product.price)
      const itemSubtotal = unitPrice * ri.quantity
      const itemIva = itemSubtotal * Number(product.ivaPercent) / 100

      if (existing) {
        await prisma.purchaseInvoiceItem.update({
          where: { id: existing.id },
          data: { quantity: ri.quantity, unitPrice, subtotal: itemSubtotal },
        })
      } else {
        await prisma.purchaseInvoiceItem.create({
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

      await prisma.product.update({
        where: { id: ri.productId },
        data: { stock: { increment: ri.quantity } },
      })
    }

    const allItems = await prisma.purchaseInvoiceItem.findMany({ where: { purchaseInvoiceId: id } })
    const subtotal = allItems.reduce((s, i) => s + Number(i.subtotal), 0)
    const ivaTotal = allItems.reduce((s, i) => s + Number(i.subtotal) * Number(i.ivaPercent) / 100, 0)
    const total = subtotal + ivaTotal

    await prisma.purchaseInvoice.update({
      where: { id },
      data: { status: 'recibido', subtotal, ivaTotal, total },
    })
  } else {
    await prisma.purchaseInvoice.update({
      where: { id },
      data: { status: 'recibido' },
    })

    for (const item of purchase.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    }
  }

  const updated = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { items: { include: { product: { select: { id: true, name: true, code: true } } } } },
  })

  res.json({ message: 'Pedido recibido exitosamente', purchase: updated })
}

export async function markAsPaid(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const purchase = await prisma.purchaseInvoice.findUnique({ where: { id } })
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
  const purchase = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!purchase) { res.status(404).json({ error: 'Compra no encontrada' }); return }
  if (purchase.status === 'anulada') { res.status(400).json({ error: 'La compra ya está anulada' }); return }

  await prisma.purchaseInvoice.update({
    where: { id },
    data: { status: 'anulada', cancelledAt: new Date() },
  })

  if (purchase.status === 'recibido' || purchase.status === 'pagada') {
    for (const item of purchase.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }
  }

  res.json({ message: 'Compra anulada exitosamente' })
}

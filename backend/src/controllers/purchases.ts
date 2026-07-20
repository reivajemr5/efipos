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
  const { supplierId, currency, exchangeRate, paymentMethod, dueDate, notes, items } = req.body

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
  const number = `COMP-${String(count + 1).padStart(4, '0')}`

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
      paymentMethod: paymentMethod || 'efectivo',
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
      items: { create: purchaseItems },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  })

  for (const item of purchaseItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    })
  }

  res.status(201).json(purchase)
}

export async function markAsPaid(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const purchase = await prisma.purchaseInvoice.findUnique({ where: { id } })
  if (!purchase) { res.status(404).json({ error: 'Compra no encontrada' }); return }
  if (purchase.status === 'anulada') { res.status(400).json({ error: 'No se puede pagar una compra anulada' }); return }

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

  for (const item of purchase.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    })
  }

  res.json({ message: 'Compra anulada exitosamente' })
}

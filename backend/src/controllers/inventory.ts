import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'

export async function movements(req: AuthRequest, res: Response) {
  const { product_id, type } = req.query
  const where: any = {}
  if (product_id) where.productId = Number(product_id)
  if (type) where.type = String(type)

  const include = {
    product: { select: { id: true, name: true, code: true } },
    user: { select: { id: true, name: true } },
  }
  const orderBy = { createdAt: 'desc' as const }
  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const result = await paginate(prisma.stockMovement, { where, include, orderBy }, limit, offset)
    res.json(result)
    return
  }

  // Backwards compatible default (legacy callers used `limit` param)
  const takeLegacy = Number(req.query.limit) || 100
  const movements = await prisma.stockMovement.findMany({ where, include, orderBy, take: takeLegacy })
  res.json(movements)
}

export async function adjust(req: AuthRequest, res: Response) {
  const { productId, quantity, type, notes } = req.body
  if (!productId || quantity === undefined || !type) {
    res.status(400).json({ error: 'productId, quantity y type requeridos' })
    return
  }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }

  const stockBefore = Number(product.stock)
  const stockAfter = type === 'adjustment' ? quantity : stockBefore + quantity

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: type === 'adjustment' ? quantity - stockBefore : quantity,
        stockBefore,
        stockAfter: Math.max(0, stockAfter),
        reference: notes || null,
        notes,
        userId: req.user!.id,
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { stock: Math.max(0, stockAfter) },
    }),
  ])

  res.status(201).json(movement)
}

export async function history(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const movements = await prisma.stockMovement.findMany({
    where: { productId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(movements)
}

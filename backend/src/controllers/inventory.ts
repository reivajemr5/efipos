import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext } from '../lib/tenant'
import { changeStock } from '../lib/stock'

const include = {
  product: { select: { id: true, name: true, code: true } },
  user: { select: { id: true, name: true } },
}
const orderBy = { createdAt: 'desc' as const }

export async function movements(req: AuthRequest, res: Response) {
  const { product_id, type } = req.query
  const ctx = resolveContext(req)
  const where: any = { businessId: ctx.businessId ?? 0 }
  if (ctx.branchId) where.branchId = ctx.branchId
  if (product_id) where.productId = Number(product_id)
  if (type) where.type = String(type)

  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const result = await paginate(prisma.stockMovement, { include, where, orderBy }, limit, offset)
    res.json(result)
    return
  }
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
  const ctx = resolveContext(req)
  if (!ctx.businessId || !ctx.branchId) {
    res.status(403).json({ error: 'Se requiere un negocio y sucursal activos' })
    return
  }
  const product = await prisma.product.findFirst({ where: { id: productId, businessId: ctx.businessId } })
  if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }

  const result = await prisma.$transaction(async (tx) => {
    return changeStock(tx, {
      businessId: ctx.businessId!,
      branchId: ctx.branchId!,
      productId,
      type,
      quantity,
      notes: notes || null,
      userId: req.user!.id,
    })
  })

  res.status(201).json({
    id: 0, productId, type, quantity,
    stockBefore: result.before,
    stockAfter: result.after,
  })
}

export async function history(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const movements = await prisma.stockMovement.findMany({
    where: { productId: id, businessId: ctx.businessId ?? 0, branchId: ctx.branchId ?? 0 },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(movements)
}
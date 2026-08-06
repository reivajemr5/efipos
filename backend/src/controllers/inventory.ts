import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext } from '../lib/tenant'
import { setBranchStock } from '../lib/stock'

const include = {
  product: { select: { id: true, name: true, code: true } },
  user: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
}
const orderBy = { createdAt: 'desc' as const }

export async function movements(req: AuthRequest, res: Response) {
  const { product_id, type, branchId: qBranch } = req.query
  const ctx = resolveContext(req)
  const where: any = { businessId: ctx.businessId ?? 0 }
  // Read-only: any role may inspect another branch's movements for verification.
  let branchId = ctx.branchId
  if (qBranch && ctx.businessId) {
    const target = Number(qBranch)
    const branch = await prisma.branch.findFirst({ where: { id: target, businessId: ctx.businessId, active: true } })
    if (branch) branchId = target
  }
  if (branchId) where.branchId = branchId
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
  const { productId, quantity, notes, branchId: bodyBranchId } = req.body
  if (!productId || quantity === undefined || Number.isNaN(Number(quantity))) {
    res.status(400).json({ error: 'productId, quantity requeridos' })
    return
  }
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }

  const product = await prisma.product.findFirst({ where: { id: productId, businessId: ctx.businessId } })
  if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }

  // superadmin/dueno can adjust any branch; body branchId is honored. Admin is locked to their own branch.
  let branchId: number
  if (bodyBranchId && (req.user!.role === 'superadmin' || req.user!.role === 'dueno')) {
    branchId = Number(bodyBranchId)
    const branch = await prisma.branch.findFirst({ where: { id: branchId, businessId: ctx.businessId, active: true } })
    if (!branch) { res.status(403).json({ error: 'Sucursal no autorizada' }); return }
  } else if (req.user!.branchId) {
    branchId = req.user!.branchId
  } else {
    branchId = ctx.branchId || 0
  }
  if (!branchId) { res.status(403).json({ error: 'Se requiere una sucursal activa' }); return }

  const result = await prisma.$transaction(async (tx) => {
    return setBranchStock(tx, {
      businessId: ctx.businessId!,
      branchId,
      productId,
      stock: Math.max(0, Math.round(Number(quantity))),
      notes: notes || null,
      userId: req.user!.id,
    })
  })

  res.status(201).json({
    id: 0, productId, branchId, type: 'adjustment', quantity,
    stockBefore: result.before,
    stockAfter: result.after,
  })
}

export async function history(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const movements = await prisma.stockMovement.findMany({
    where: { productId: id, businessId: ctx.businessId ?? 0 },
    include: { user: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(movements)
}
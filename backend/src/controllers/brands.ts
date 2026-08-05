import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { resolveContext } from '../lib/tenant'

export async function list(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(400).json({ error: 'Se requiere un negocio activo' }); return }
  const brands = await prisma.brand.findMany({
    where: { businessId: ctx.businessId, active: true },
    orderBy: { name: 'asc' },
  })
  res.json(brands)
}

export async function create(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }
  const { name } = req.body
  if (!name?.trim()) {
    res.status(400).json({ error: 'Nombre requerido' })
    return
  }
  const brand = await prisma.brand.create({ data: { name: name.trim(), businessId: ctx.businessId } })
  res.status(201).json(brand)
}
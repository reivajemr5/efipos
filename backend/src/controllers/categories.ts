import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { resolveContext } from '../lib/tenant'

export async function list(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(400).json({ error: 'Se requiere un negocio activo' }); return }
  const categories = await prisma.category.findMany({
    where: { businessId: ctx.businessId, active: true },
    orderBy: { name: 'asc' },
  })
  res.json(categories)
}

export async function create(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }
  const { name } = req.body
  if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return }
  const category = await prisma.category.create({ data: { name, businessId: ctx.businessId } })
  res.status(201).json(category)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.category.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!existing) { res.status(404).json({ error: 'Categoría no encontrada' }); return }
  const { name, active } = req.body
  const category = await prisma.category.update({ where: { id }, data: { name, active } })
  res.json(category)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.category.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!existing) { res.status(404).json({ error: 'Categoría no encontrada' }); return }
  await prisma.category.update({ where: { id }, data: { active: false } })
  res.status(204).send()
}
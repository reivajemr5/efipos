import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { resolveContext } from '../lib/tenant'

export async function list(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(400).json({ error: 'Se requiere un negocio activo' }); return }
  const templates = await prisma.attributeTemplate.findMany({
    where: { businessId: ctx.businessId },
    include: { values: { select: { id: true, value: true } } },
    orderBy: { name: 'asc' },
  })
  res.json(templates)
}

export async function create(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }
  const { name, values } = req.body
  if (!name || !values?.length) {
    res.status(400).json({ error: 'Nombre y valores requeridos' })
    return
  }
  const template = await prisma.attributeTemplate.create({
    data: {
      businessId: ctx.businessId,
      name,
      values: { create: values.map((v: string) => ({ value: v })) },
    },
    include: { values: { select: { id: true, value: true } } },
  })
  res.status(201).json(template)
}
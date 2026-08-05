import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { resolveContext } from '../lib/tenant'

function canAccessBusiness(req: AuthRequest, businessId: number): boolean {
  return req.user!.role === 'superadmin' || req.user!.businessId === businessId
}

export async function list(req: AuthRequest, res: Response) {
  let businessId = Number(req.params.businessId)
  if (req.user!.role !== 'superadmin') businessId = req.user!.businessId ?? -1
  if (!businessId) { res.status(400).json({ error: 'businessId requerido' }); return }

  const branches = await prisma.branch.findMany({
    where: { businessId, active: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  })
  res.json(branches)
}

export async function listBranchesForContext(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(400).json({ error: 'Se requiere un negocio activo' }); return }
  const branches = await prisma.branch.findMany({
    where: { businessId: ctx.businessId, active: true },
    orderBy: { name: 'asc' },
  })
  res.json(branches)
}

export async function create(req: AuthRequest, res: Response) {
  let businessId = Number(req.body.businessId || req.params.businessId)
  if (req.user!.role !== 'superadmin') businessId = req.user!.businessId ?? -1
  if (!businessId || !canAccessBusiness(req, businessId)) {
    res.status(403).json({ error: 'Negocio requerido o sin permiso' })
    return
  }
  const { name, address, phone } = req.body
  if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return }
  const branch = await prisma.branch.create({
    data: { businessId, name, address: address || null, phone: phone || null },
  })
  res.status(201).json(branch)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: { business: { select: { id: true, name: true } } },
  })
  if (!branch) { res.status(404).json({ error: 'Sucursal no encontrada' }); return }
  if (!canAccessBusiness(req, branch.businessId)) {
    res.status(403).json({ error: 'No tienes permiso para esta sucursal' })
    return
  }
  res.json(branch)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) { res.status(404).json({ error: 'Sucursal no encontrada' }); return }
  if (!canAccessBusiness(req, branch.businessId)) {
    res.status(403).json({ error: 'No tienes permiso para esta sucursal' })
    return
  }
  const { name, address, phone, active } = req.body
  const updated = await prisma.branch.update({
    where: { id },
    data: { name, address, phone, ...(active !== undefined ? { active } : {}) },
  })
  res.json(updated)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) { res.status(404).json({ error: 'Sucursal no encontrada' }); return }
  if (!canAccessBusiness(req, branch.businessId)) {
    res.status(403).json({ error: 'No tienes permiso para esta sucursal' })
    return
  }
  await prisma.branch.update({ where: { id }, data: { active: false } })
  res.status(204).send()
}
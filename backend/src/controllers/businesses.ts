import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const where: any = {}
  if (req.user!.role !== 'superadmin') {
    where.id = req.user!.businessId ?? -1
  }
  const businesses = await prisma.business.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { branches: true, users: true } } },
  })
  res.json(businesses)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  if (req.user!.role !== 'superadmin' && req.user!.businessId !== id) {
    res.status(403).json({ error: 'No tienes permiso para este negocio' })
    return
  }
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      branches: { orderBy: { name: 'asc' } },
      _count: { select: { users: true, products: true } },
    },
  })
  if (!business) { res.status(404).json({ error: 'Negocio no encontrado' }); return }
  res.json(business)
}

export async function create(req: AuthRequest, res: Response) {
  const { name, rif, address, phone, email } = req.body
  if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return }
  const business = await prisma.business.create({
    data: { name, rif: rif || null, address: address || null, phone: phone || null, email: email || null },
  })
  res.status(201).json(business)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  if (req.user!.role !== 'superadmin' && req.user!.businessId !== id) {
    res.status(403).json({ error: 'No tienes permiso para este negocio' })
    return
  }
  const { name, rif, address, phone, email, active } = req.body
  const business = await prisma.business.update({
    where: { id },
    data: {
      name, rif, address, phone, email,
      ...(active !== undefined ? { active } : {}),
    },
  })
  res.json(business)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  if (req.user!.role !== 'superadmin') {
    res.status(403).json({ error: 'Solo el superadmin puede eliminar un negocio' })
    return
  }
  await prisma.business.update({ where: { id }, data: { active: false } })
  res.status(204).send()
}
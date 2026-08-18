import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { resolveContext } from '../lib/tenant'
import { isValidMode } from '../lib/config'

const MODE_FIELDS = ['decimalQuantityMode', 'sellWithoutStockMode', 'priceOverrideMode'] as const
const DEFAULT_MODES = { decimalQuantityMode: 'none', sellWithoutStockMode: 'none', priceOverrideMode: 'none' }

/** Config de venta del negocio activo, accesible para cualquier rol autenticado. */
export async function context(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.json(DEFAULT_MODES); return }
  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { decimalQuantityMode: true, sellWithoutStockMode: true, priceOverrideMode: true },
  })
  res.json(business || DEFAULT_MODES)
}

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
  const { name, rif, address, phone, email, active, decimalQuantityMode, sellWithoutStockMode, priceOverrideMode } = req.body
  for (const f of MODE_FIELDS) {
    const value = req.body[f]
    if (value !== undefined && !isValidMode(value)) {
      res.status(400).json({ error: `Modo inválido para ${f}. Usa: all, selected o none` })
      return
    }
  }
  const business = await prisma.business.update({
    where: { id },
    data: {
      name, rif, address, phone, email,
      ...(active !== undefined ? { active } : {}),
      ...(decimalQuantityMode !== undefined ? { decimalQuantityMode } : {}),
      ...(sellWithoutStockMode !== undefined ? { sellWithoutStockMode } : {}),
      ...(priceOverrideMode !== undefined ? { priceOverrideMode } : {}),
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
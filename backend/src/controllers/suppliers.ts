import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext } from '../lib/tenant'

export async function list(req: AuthRequest, res: Response) {
  const { q } = req.query
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(400).json({ error: 'Se requiere un negocio activo' }); return }
  const where: any = { businessId: ctx.businessId }
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' as const } },
      { documentNumber: { contains: String(q) } },
    ]
  }
  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const result = await paginate(prisma.supplier, { where, orderBy: { name: 'asc' } }, limit, offset)
    res.json(result)
    return
  }
  const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: 'asc' } })
  res.json(suppliers)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const supplier = await prisma.supplier.findFirst({
    where: { id, businessId: ctx.businessId ?? 0 },
    include: { products: { include: { product: true } } },
  })
  if (!supplier) { res.status(404).json({ error: 'Proveedor no encontrado' }); return }
  res.json(supplier)
}

export async function create(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }
  const { name, documentType, documentNumber, phone, address } = req.body
  if (!name || !documentType || !documentNumber) {
    res.status(400).json({ error: 'Nombre, tipo y número de documento requeridos' })
    return
  }
  const supplier = await prisma.supplier.create({
    data: { name, documentType, documentNumber, phone, address, businessId: ctx.businessId },
  })
  res.status(201).json(supplier)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.supplier.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!existing) { res.status(404).json({ error: 'Proveedor no encontrado' }); return }
  const { name, documentType, documentNumber, phone, address } = req.body
  const supplier = await prisma.supplier.update({
    where: { id },
    data: { name, documentType, documentNumber, phone, address },
  })
  res.json(supplier)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.supplier.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!existing) { res.status(404).json({ error: 'Proveedor no encontrado' }); return }
  await prisma.supplier.delete({ where: { id } })
  res.status(204).send()
}
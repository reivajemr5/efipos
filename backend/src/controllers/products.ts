import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const { q, supplier_id, low_stock } = req.query
  const where: any = { active: true }
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' as const } },
      { code: { contains: String(q), mode: 'insensitive' as const } },
    ]
  }
  if (supplier_id) where.supplierId = Number(supplier_id)
  if (low_stock === 'true') where.stock = { lte: prisma.product.fields.minStock }

  const products = await prisma.product.findMany({
    where,
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  })
  res.json(products)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const product = await prisma.product.findUnique({
    where: { id },
    include: { supplier: { select: { id: true, name: true } } },
  })
  if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  res.json(product)
}

export async function create(req: AuthRequest, res: Response) {
  const { code, name, description, price, currency, ivaPercent, stock, minStock, supplierId } = req.body
  if (!code || !name || !price) {
    res.status(400).json({ error: 'Código, nombre y precio requeridos' })
    return
  }
  const product = await prisma.product.create({
    data: { code, name, description, price, currency: currency || 'bs', ivaPercent: ivaPercent || 16, stock: stock || 0, minStock: minStock || 5, supplierId },
  })
  res.status(201).json(product)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { code, name, description, price, currency, ivaPercent, stock, minStock, supplierId, active } = req.body
  const product = await prisma.product.update({
    where: { id },
    data: { code, name, description, price, currency, ivaPercent, stock, minStock, supplierId, active },
  })
  res.json(product)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  await prisma.product.update({ where: { id }, data: { active: false } })
  res.status(204).send()
}

import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const { q, supplier_id, low_stock, category_id, type } = req.query
  const where: any = { active: true }
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' as const } },
      { code: { contains: String(q), mode: 'insensitive' as const } },
      { barcode: { contains: String(q) } },
      { barcodes: { some: { barcode: { contains: String(q) } } } },
    ]
  }
  if (supplier_id) where.suppliers = { some: { supplierId: Number(supplier_id) } }
  if (low_stock === 'true') where.stock = { lte: prisma.product.fields.minStock }
  if (category_id) where.categoryId = Number(category_id)
  if (type) where.type = String(type)

  const products = await prisma.product.findMany({
    where,
    include: {
      suppliers: { include: { supplier: { select: { id: true, name: true } } } },
      category: { select: { id: true, name: true } },
      barcodes: { select: { id: true, barcode: true } },
    },
    orderBy: { name: 'asc' },
  })
  res.json(products)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      suppliers: { include: { supplier: { select: { id: true, name: true } } } },
      category: { select: { id: true, name: true } },
      barcodes: { select: { id: true, barcode: true } },
    },
  })
  if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  res.json(product)
}

export async function create(req: AuthRequest, res: Response) {
  const { code, name, description, notes, type, price, cost, barcode, barcodes, price2, currency, ivaPercent, stock, minStock, categoryId, variations, supplierIds, brand } = req.body
  if (!code || !name || !price) {
    res.status(400).json({ error: 'Código, nombre y precio requeridos' })
    return
  }
  const product = await prisma.product.create({
    data: {
      code, name, description, notes, brand: brand || null, type: type || 'simple',
      price, cost: cost || 0, barcode,
      price2: price2 || null,
      currency: currency || 'bs',
      ivaPercent: ivaPercent || 0,
      stock: stock || 0,
      minStock: minStock || 5,
      categoryId: categoryId || null,
      variations: variations || [],
      barcodes: barcodes?.length ? { create: barcodes.map((b: string) => ({ barcode: b })) } : undefined,
      suppliers: supplierIds?.length
        ? { create: supplierIds.map((id: number) => ({ supplierId: id })) }
        : undefined,
    },
    include: {
      suppliers: { include: { supplier: { select: { id: true, name: true } } } },
      category: { select: { id: true, name: true } },
      barcodes: { select: { id: true, barcode: true } },
    },
  })
  res.status(201).json(product)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { code, name, description, notes, type, price, cost, barcode, barcodes, price2, currency, ivaPercent, stock, minStock, categoryId, variations, supplierIds, active, brand } = req.body

  if (supplierIds) {
    await prisma.productSupplier.deleteMany({ where: { productId: id } })
    if (supplierIds.length) {
      await prisma.productSupplier.createMany({
        data: supplierIds.map((sid: number) => ({ productId: id, supplierId: sid })),
      })
    }
  }

  if (barcodes) {
    await prisma.productBarcode.deleteMany({ where: { productId: id } })
    if (barcodes.length) {
      await prisma.productBarcode.createMany({
        data: barcodes.map((b: string) => ({ productId: id, barcode: b })),
      })
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      code, name, description, notes, type, brand: brand || null,
      price, cost, barcode, price2,
      currency, ivaPercent, stock, minStock,
      categoryId: categoryId || null,
      variations,
      active,
    },
    include: {
      suppliers: { include: { supplier: { select: { id: true, name: true } } } },
      category: { select: { id: true, name: true } },
      barcodes: { select: { id: true, barcode: true } },
    },
  })
  res.json(product)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  await prisma.product.update({ where: { id }, data: { active: false } })
  res.status(204).send()
}

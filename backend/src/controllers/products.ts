import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext } from '../lib/tenant'
import { changeStock } from '../lib/stock'

const BASE_INCLUDE = {
  suppliers: { include: { supplier: { select: { id: true, name: true } } } },
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  barcodes: { select: { id: true, barcode: true } },
}

function withBranchStock(include: any, branchId: number | null) {
  if (!branchId) return include
  return {
    ...include,
    stocks: { where: { branchId }, select: { stock: true, minStock: true } },
  }
}

function toDto(p: any) {
  const s = Array.isArray(p.stocks) ? p.stocks[0] : undefined
  const { stocks, ...rest } = p
  return { ...rest, stock: s ? Number(s.stock) : 0, minStock: s ? s.minStock : 5 }
}

export async function list(req: AuthRequest, res: Response) {
  const { q, supplier_id, low_stock, category_id, type } = req.query
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(400).json({ error: 'Se requiere un negocio activo' }); return }

  const where: any = { businessId: ctx.businessId, active: true }
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' as const } },
      { code: { contains: String(q), mode: 'insensitive' as const } },
      { barcode: { contains: String(q) } },
      { barcodes: { some: { barcode: { contains: String(q) } } } },
    ]
  }
  if (supplier_id) where.suppliers = { some: { supplierId: Number(supplier_id) } }
  if (category_id) where.categoryId = Number(category_id)
  if (type) where.type = String(type)

  const include = withBranchStock(BASE_INCLUDE, ctx.branchId)
  const orderBy = { name: 'asc' as const }

  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const result = await paginate(prisma.product, { where, include, orderBy }, limit, offset)
    let items = result.items.map(toDto)
    if (low_stock === 'true') items = items.filter((p: any) => p.stock <= p.minStock)
    res.json({ ...result, items })
    return
  }

  let products = await prisma.product.findMany({ where, include, orderBy })
  let dto = products.map(toDto)
  if (low_stock === 'true') dto = dto.filter((p: any) => p.stock <= p.minStock)
  res.json(dto)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const product = await prisma.product.findFirst({
    where: { id, ...(ctx.businessId ? { businessId: ctx.businessId } : {}) },
    include: withBranchStock(BASE_INCLUDE, ctx.branchId),
  })
  if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  res.json(toDto(product))
}

export async function create(req: AuthRequest, res: Response) {
  const { name, description, notes, type, price, cost, barcode, barcodes, price2, currency, ivaPercent, stock, minStock, categoryId, brandId, variations, supplierIds, imageUrl } = req.body
  const ctx = resolveContext(req)
  if (!name || price === undefined || price === null || price === '') {
    res.status(400).json({ error: 'Nombre y precio requeridos' })
    return
  }
  if (!ctx.businessId) {
    res.status(403).json({ error: 'Se requiere un negocio activo' })
    return
  }

  const data = {
    code: '',
    name,
    description,
    notes,
    brandId: brandId || null,
    type: type || 'simple',
    price,
    cost: cost || 0,
    barcode,
    price2: price2 || null,
    currency: currency || 'bs',
    ivaPercent: ivaPercent || 0,
    categoryId: categoryId || null,
    imageUrl: imageUrl || null,
    variations: variations || [],
    barcodes: barcodes?.length ? { create: barcodes.map((b: string) => ({ barcode: b })) } : undefined,
    suppliers: supplierIds?.length
      ? { create: supplierIds.map((id: number) => ({ supplierId: id })) }
      : undefined,
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const product = await prisma.$transaction(async (tx) => {
        const last = await tx.product.findFirst({
          where: { businessId: ctx.businessId! },
          orderBy: { id: 'desc' },
          select: { id: true },
        })
        const code = formatProductCode((last?.id ?? 0) + 1)
        const created = await tx.product.create({
          data: { ...data, code, businessId: ctx.businessId! },
          include: BASE_INCLUDE,
        })
        if (ctx.branchId) {
          await tx.branchStock.upsert({
            where: { branchId_productId: { branchId: ctx.branchId, productId: created.id } },
            create: { branchId: ctx.branchId, productId: created.id, stock: stock || 0, minStock: minStock || 5 },
            update: {},
          })
        }
        return created
      })
      res.status(201).json(toDto({ ...product, stocks: [] }))
      return
    } catch (e) {
      if (!isUniqueConstraintError(e)) throw e
    }
  }
  res.status(500).json({ error: 'No se pudo asignar un código único' })
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.product.findFirst({
    where: { id, ...(ctx.businessId ? { businessId: ctx.businessId } : {}) },
  })
  if (!existing) { res.status(404).json({ error: 'Producto no encontrado' }); return }

  const { name, description, notes, type, price, cost, barcode, barcodes, price2, currency, ivaPercent, stock, minStock, categoryId, brandId, variations, supplierIds, active, imageUrl } = req.body

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

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name, description, notes, type, brandId: brandId || null,
        price, cost, barcode, price2,
        currency, ivaPercent, categoryId: categoryId || null,
        imageUrl: imageUrl || null,
        variations,
        ...(active !== undefined ? { active } : {}),
      },
    })
    if (ctx.branchId && (stock !== undefined || minStock !== undefined)) {
      const cur = await tx.branchStock.findUnique({
        where: { branchId_productId: { branchId: ctx.branchId, productId: id } },
      })
      await tx.branchStock.upsert({
        where: { branchId_productId: { branchId: ctx.branchId, productId: id } },
        create: {
          branchId: ctx.branchId, productId: id,
          stock: stock ?? 0, minStock: minStock ?? 5,
        },
        update: {
          ...(stock !== undefined ? { stock } : {}),
          ...(minStock !== undefined ? { minStock } : {}),
        },
      })
      if (cur && stock !== undefined && Number(stock) !== Number(cur.stock)) {
        await tx.stockMovement.create({
          data: {
            businessId: existing.businessId,
            branchId: ctx.branchId,
            productId: id,
            type: 'adjustment',
            quantity: Number(stock) - Number(cur.stock),
            stockBefore: Number(cur.stock),
            stockAfter: Number(stock),
            userId: req.user!.id,
          },
        })
      }
    }
  })

  const updated = await prisma.product.findFirst({
    where: { id },
    include: withBranchStock(BASE_INCLUDE, ctx.branchId),
  })
  res.json(toDto(updated!))
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.product.findFirst({
    where: { id, ...(ctx.businessId ? { businessId: ctx.businessId } : {}) },
  })
  if (!existing) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  await prisma.product.update({ where: { id }, data: { active: false } })
  res.status(204).send()
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function parseDecimal(val: string | undefined | null): number {
  if (!val) return 0
  const cleaned = val.trim().replace(/[^\d.,-]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function formatProductCode(id: number): string {
  return `PRD-${String(id).padStart(5, '0')}`
}

function isUniqueConstraintError(e: unknown): boolean {
  return e instanceof Error && (e as any).code === 'P2002'
}

async function upsertImportedProduct(
  tx: any,
  p: {
    businessId: number
    name: string
    code?: string
    barcode?: string
    price: number
    cost?: number
    stock?: number
    ivaPercent?: number
    currency?: string
    description?: string | null
    categoryId?: number | null
    minStock?: number
  },
  generalCategoryId: number,
): Promise<{ status: 'created' | 'updated'; id: number }> {
  const name = (p.name || '').trim()

  let existing: any = null
  if (p.code) existing = await tx.product.findFirst({ where: { businessId: p.businessId, code: p.code } })
  if (!existing && p.barcode) {
    existing = await tx.product.findFirst({
      where: { businessId: p.businessId, OR: [{ barcode: p.barcode }, { barcodes: { some: { barcode: p.barcode } } }] },
    })
  }
  if (!existing) {
    existing = await tx.product.findFirst({
      where: { businessId: p.businessId, name: { equals: name, mode: 'insensitive' } },
    })
  }

  const base = {
    price: p.price,
    cost: p.cost ?? 0,
    currency: (p.currency as any) || 'usd',
    ivaPercent: p.ivaPercent ?? 0,
    description: p.description ?? null,
    categoryId: p.categoryId || generalCategoryId,
  }

  if (existing) {
    await tx.product.update({
      where: { id: existing.id },
      data: {
        ...base,
        active: p.price > 0,
        ...(p.barcode && !existing.barcode ? { barcode: p.barcode } : {}),
      },
    })
    return { status: 'updated', id: existing.id }
  }

  const last = await tx.product.findFirst({
    where: { businessId: p.businessId },
    orderBy: { id: 'desc' },
    select: { id: true },
  })
  const code = p.code || formatProductCode((last?.id ?? 0) + 1)
  const created = await tx.product.create({
    data: {
      ...base,
      businessId: p.businessId,
      code,
      name,
      barcode: p.barcode ?? null,
    },
  })
  return { status: 'created', id: created.id }
}

export async function importCsv(req: AuthRequest, res: Response) {
  const file = req.file
  if (!file) { res.status(400).json({ error: 'Archivo CSV requerido' }); return }

  const { parse } = require('csv-parse/sync')
  const content = file.buffer.toString('utf-8')
  let rows: any[]
  try {
    rows = parse(content, { columns: true, skip_empty_lines: true, bom: true, delimiter: [',', ';', '\t'] })
  } catch {
    res.status(400).json({ error: 'Error al parsear el CSV. Verifica el formato.' })
    return
  }

  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }

  let generalCategory = await prisma.category.findFirst({ where: { businessId: ctx.businessId, name: 'General' } })
  if (!generalCategory) {
    generalCategory = await prisma.category.create({ data: { businessId: ctx.businessId, name: 'General' } })
  }

  const existingCategories = await prisma.category.findMany({ where: { businessId: ctx.businessId, active: true } })
  const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]))

  let created = 0
  let updated = 0
  let skipped = 0
  let errors: { row: number; name: string; error: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = row.nombre?.trim()
    if (!name) { skipped++; continue }

    const price = parseDecimal(row.precio)
    const stock = parseDecimal(row.stock)
    const cost = parseDecimal(row.costo)
    const iva = parseDecimal(row.iva || '0')
    const barcode = row.codigo_barra?.trim() || undefined
    const description = row.descripcion?.trim() || undefined
    const normalizedName = toTitleCase(name)

    let categoryId: number | null = null
    const catName = row.categoria?.trim()
    if (catName) {
      const key = catName.toLowerCase()
      if (categoryMap.has(key)) {
        categoryId = categoryMap.get(key)!
      } else {
        const newCat = await prisma.category.create({ data: { businessId: ctx.businessId, name: toTitleCase(catName) } })
        categoryMap.set(key, newCat.id)
        categoryId = newCat.id
      }
    }

    try {
      const { status, id } = await prisma.$transaction(async (tx) => {
        const result = await upsertImportedProduct(
          tx,
          {
            businessId: ctx.businessId!,
            name: normalizedName,
            code: row.codigo_unico?.trim() || row.codigo?.trim() || undefined,
            barcode,
            price,
            cost,
            stock,
            ivaPercent: iva,
            currency: 'usd',
            description,
            categoryId: categoryId || generalCategory.id,
          },
          generalCategory.id,
        )
        if (result.status === 'created' && ctx.branchId && stock > 0) {
          await changeStock(tx, {
            businessId: ctx.businessId!,
            branchId: ctx.branchId,
            productId: result.id,
            type: 'import',
            quantity: stock,
            userId: req.user!.id,
          })
        }
        return result
      })
      if (status === 'created') created++
      else updated++
    } catch (e) {
      errors.push({ row: i + 2, name: normalizedName, error: e instanceof Error ? e.message : 'Error desconocido' })
    }
  }

  res.json({ total: rows.length, created, updated, skipped, errors })
}

interface BulkProductInput {
  name: string
  price: number
  cost?: number
  stock?: number
  ivaPercent?: number
  currency?: string
  barcode?: string
  description?: string
  categoryId?: number | null
  code?: string
}

export async function bulkImport(req: AuthRequest, res: Response) {
  const products: BulkProductInput[] = req.body.products
  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: 'Se requiere un array de productos' })
    return
  }
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }

  let created = 0
  let updated = 0
  let errors: { row: number; name: string; error: string }[] = []

  let generalCategory = await prisma.category.findFirst({ where: { businessId: ctx.businessId, name: 'General' } })
  if (!generalCategory) {
    generalCategory = await prisma.category.create({ data: { businessId: ctx.businessId, name: 'General' } })
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!p.name || !p.name.trim()) { errors.push({ row: i + 1, name: '', error: 'Nombre requerido' }); continue }
      if (p.price === undefined || p.price === null) { errors.push({ row: i + 1, name: p.name, error: 'Precio requerido' }); continue }

      try {
        const { status, id } = await upsertImportedProduct(
          tx,
          {
            businessId: ctx.businessId!,
            name: p.name.trim(),
            code: p.code,
            barcode: p.barcode,
            price: p.price,
            cost: p.cost,
            stock: p.stock,
            ivaPercent: p.ivaPercent,
            currency: (p.currency as any) || 'usd',
            description: p.description,
            categoryId: p.categoryId,
          },
          generalCategory!.id,
        )
        if (status === 'created') {
          created++
          if (ctx.branchId && p.stock) {
            await changeStock(tx, {
              businessId: ctx.businessId!,
              branchId: ctx.branchId,
              productId: id,
              type: 'import',
              quantity: p.stock,
              userId: req.user!.id,
            })
          }
        } else updated++
      } catch (e) {
        errors.push({ row: i + 1, name: p.name, error: e instanceof Error ? e.message : 'Error desconocido' })
      }
    }
  })

  res.json({ total: products.length, created, updated, errors })
}

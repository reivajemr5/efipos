import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'

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

  const { limit, offset, hasPagination } = parsePagination(req.query)
  const include = {
    suppliers: { include: { supplier: { select: { id: true, name: true } } } },
    category: { select: { id: true, name: true } },
    brand: { select: { id: true, name: true } },
    barcodes: { select: { id: true, barcode: true } },
  }
  const orderBy = { name: 'asc' as const }

  if (hasPagination) {
    const result = await paginate(prisma.product, { where, include, orderBy }, limit, offset)
    res.json(result)
    return
  }

  const products = await prisma.product.findMany({
    where,
    include,
    orderBy,
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
      brand: { select: { id: true, name: true } },
      barcodes: { select: { id: true, barcode: true } },
    },
  })
  if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  res.json(product)
}

export async function create(req: AuthRequest, res: Response) {
  const { name, description, notes, type, price, cost, barcode, barcodes, price2, currency, ivaPercent, stock, minStock, categoryId, brandId, variations, supplierIds, imageUrl } = req.body
  if (!name || price === undefined || price === null || price === '') {
    res.status(400).json({ error: 'Nombre y precio requeridos' })
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
    stock: stock || 0,
    minStock: minStock || 5,
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
      const product = await prisma.product.create({
        data: { ...data, code: formatProductCode(await nextProductCode()) },
        include: {
          suppliers: { include: { supplier: { select: { id: true, name: true } } } },
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          barcodes: { select: { id: true, barcode: true } },
        },
      })
      res.status(201).json(product)
      return
    } catch (e) {
      if (!isUniqueConstraintError(e)) throw e
    }
  }
  res.status(500).json({ error: 'No se pudo asignar un código único' })
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { code, name, description, notes, type, price, cost, barcode, barcodes, price2, currency, ivaPercent, stock, minStock, categoryId, brandId, variations, supplierIds, active, imageUrl } = req.body

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
      code, name, description, notes, type, brandId: brandId || null,
      price, cost, barcode, price2,
      currency, ivaPercent, stock, minStock,
      categoryId: categoryId || null,
      imageUrl: imageUrl || null,
      variations,
      active,
    },
    include: {
      suppliers: { include: { supplier: { select: { id: true, name: true } } } },
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
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

async function nextProductCode(tx: any = prisma): Promise<number> {
  const last = await tx.product.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
  return (last?.id ?? 0) + 1
}

function isUniqueConstraintError(e: unknown): boolean {
  return e instanceof Error && (e as any).code === 'P2002'
}

async function upsertImportedProduct(
  tx: any,
  p: { name: string; code?: string; barcode?: string; price: number; cost?: number; stock?: number; ivaPercent?: number; currency?: string; description?: string | null; categoryId?: number | null },
  generalCategoryId: number,
  nextId: { value: number },
): Promise<'created' | 'updated'> {
  const name = (p.name || '').trim()

  let existing: any = null
  if (p.code) existing = await tx.product.findUnique({ where: { code: p.code } })
  if (!existing && p.barcode) {
    existing = await tx.product.findFirst({
      where: { OR: [{ barcode: p.barcode }, { barcodes: { some: { barcode: p.barcode } } }] },
    })
  }
  if (!existing) {
    existing = await tx.product.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
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
        stock: p.stock ?? existing.stock,
        active: p.price > 0,
        ...(p.barcode && !existing.barcode ? { barcode: p.barcode } : {}),
      },
    })
    return 'updated'
  }

  const code = p.code || formatProductCode(nextId.value)
  nextId.value++
  await tx.product.create({
    data: {
      ...base,
      code,
      name,
      stock: p.stock ?? 0,
      active: p.price > 0,
      barcode: p.barcode ?? null,
    },
  })
  return 'created'
}

export async function importCsv(req: AuthRequest, res: Response) {
  const file = req.file
  if (!file) { res.status(400).json({ error: 'Archivo CSV requerido' }); return }

  // Ensure csv-parse is imported
  const { parse } = require('csv-parse/sync')
  const content = file.buffer.toString('utf-8')
  let rows: any[]
  try {
    rows = parse(content, { columns: true, skip_empty_lines: true, bom: true, delimiter: [',', ';', '\t'] })
  } catch {
    res.status(400).json({ error: 'Error al parsear el CSV. Verifica el formato.' })
    return
  }

  // Resolve "General" category
  let generalCategory = await prisma.category.findFirst({ where: { name: 'General' } })
  if (!generalCategory) {
    generalCategory = await prisma.category.create({ data: { name: 'General' } })
  }

  const existingCategories = await prisma.category.findMany({ where: { active: true } })
  const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]))

  let created = 0
  let updated = 0
  let skipped = 0
  let errors: { row: number; name: string; error: string }[] = []
  let nextId = await nextProductCode()

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
        const newCat = await prisma.category.create({ data: { name: toTitleCase(catName) } })
        categoryMap.set(key, newCat.id)
        categoryId = newCat.id
      }
    }

    try {
      const result = await upsertImportedProduct(
        prisma,
        {
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
        { value: nextId },
      )
      if (result === 'created') created++
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

  let created = 0
  let updated = 0
  let errors: { row: number; name: string; error: string }[] = []

  let generalCategory = await prisma.category.findFirst({ where: { name: 'General' } })
  if (!generalCategory) {
    generalCategory = await prisma.category.create({ data: { name: 'General' } })
  }

  await prisma.$transaction(async (tx) => {
    const nextId = { value: await nextProductCode(tx) }
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!p.name || !p.name.trim()) { errors.push({ row: i + 1, name: '', error: 'Nombre requerido' }); continue }
      if (p.price === undefined || p.price === null) { errors.push({ row: i + 1, name: p.name, error: 'Precio requerido' }); continue }

      try {
        const result = await upsertImportedProduct(
          tx,
          {
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
          nextId,
        )
        if (result === 'created') created++
        else updated++
      } catch (e) {
        errors.push({ row: i + 1, name: p.name, error: e instanceof Error ? e.message : 'Error desconocido' })
      }
    }
  })

  res.json({ total: products.length, created, updated, errors })
}

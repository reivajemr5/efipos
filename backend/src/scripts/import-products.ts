import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import prisma from '../lib/prisma'

interface CsvRow {
  codigo?: string
  nombre?: string
  precio?: string
  costo?: string
  stock?: string
  categoria?: string
  marca?: string
  codigo_barra?: string
  iva?: string
  descripcion?: string
  [key: string]: string | undefined
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

function generateCode(index: number): string {
  return `IMP-${String(index + 1).padStart(5, '0')}`
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx ts-node src/scripts/import-products.ts <path-to-csv>')
    process.exit(1)
  }

  const rows: CsvRow[] = []
  const parser = createReadStream(csvPath).pipe(parse({ columns: true, skip_empty_lines: true, bom: true, delimiter: [',', ';', '\t'] }))

  for await (const row of parser) {
    rows.push(row as CsvRow)
  }

  console.log(`📄 Leídas ${rows.length} filas del CSV`)

  // Resolve "General" category
  let generalCategory = await prisma.category.findFirst({ where: { name: 'General' } })
  if (!generalCategory) {
    generalCategory = await prisma.category.create({ data: { name: 'General' } })
    console.log('➕ Categoría "General" creada')
  }

  // Build category name → id map
  const existingCategories = await prisma.category.findMany({ where: { active: true } })
  const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]))

  let created = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = row.nombre?.trim()
    if (!name) { skipped++; continue }

    const price = parseDecimal(row.precio)
    const stock = parseDecimal(row.stock)
    const cost = parseDecimal(row.costo)
    const iva = parseDecimal(row.iva || '16')
    const barcode = row.codigo_barra?.trim() || undefined
    const description = row.descripcion?.trim() || undefined

    const normalizedName = toTitleCase(name)
    const code = generateCode(i)

    // Resolve category
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
        console.log(`➕ Categoría "${newCat.name}" creada`)
      }
    }

    try {
      await prisma.product.create({
        data: {
          code,
          name: normalizedName,
          description,
      price,
      cost: cost || 0,
      currency: 'usd',
      stock,
      active: price > 0,
      ivaPercent: iva || 0,
      barcode,
          categoryId: categoryId || generalCategory!.id,
        },
      })
      created++
      if ((i + 1) % 100 === 0) console.log(`✅ ${i + 1}/${rows.length} procesados`)
    } catch (e) {
      console.error(`❌ Error fila ${i + 1} ("${normalizedName}"): ${e instanceof Error ? e.message : e}`)
      errors++
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESULTADO DE IMPORTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total filas:    ${rows.length}
  Creados:        ${created}
  Saltados:       ${skipped}
  Errores:        ${errors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

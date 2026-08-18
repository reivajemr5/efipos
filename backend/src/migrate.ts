import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

const DISCOUNT_TABLES = ['quotes', 'quote_items', 'invoices', 'invoice_items']

const BUSINESS_COLUMNS: { name: string; type: string }[] = [
  { name: 'decimal_quantity_mode', type: 'TEXT NOT NULL DEFAULT \'none\'' },
  { name: 'sell_without_stock_mode', type: 'TEXT NOT NULL DEFAULT \'none\'' },
  { name: 'price_override_mode', type: 'TEXT NOT NULL DEFAULT \'none\'' },
]

const PRODUCT_COLUMNS: { name: string; type: string }[] = [
  { name: 'decimal_quantity', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  { name: 'sell_without_stock', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  { name: 'price_override', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
]

const QUANTITY_TABLES = ['quote_items', 'invoice_items', 'purchase_invoice_items']

async function findSchema(): Promise<string> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ table_schema: string }[]>(
      `SELECT table_schema FROM information_schema.tables WHERE table_name IN ('quotes','invoices') GROUP BY table_schema ORDER BY count(*) DESC LIMIT 1`
    )
    if (rows && rows.length > 0) return rows[0].table_schema
  } catch (e) {
    console.log('migrate: no pude detectar schema ->', e instanceof Error ? e.message : e)
  }
  return 'public'
}

async function columnType(schema: string, table: string, column: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ data_type: string }[]>(
      `SELECT data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
      schema,
      table,
      column
    )
    return rows.length > 0 ? rows[0].data_type : null
  } catch {
    return null
  }
}

function statementsFor(schema: string): string[] {
  const stmts: string[] = []
  for (const t of DISCOUNT_TABLES) {
    stmts.push(`ALTER TABLE "${schema}"."${t}" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`)
    stmts.push(`ALTER TABLE "${schema}"."${t}" ALTER COLUMN "discount" TYPE DECIMAL(12,6)`)
  }
  for (const c of BUSINESS_COLUMNS) {
    stmts.push(`ALTER TABLE "${schema}"."businesses" ADD COLUMN IF NOT EXISTS "${c.name}" ${c.type}`)
  }
  for (const c of PRODUCT_COLUMNS) {
    stmts.push(`ALTER TABLE "${schema}"."products" ADD COLUMN IF NOT EXISTS "${c.name}" ${c.type}`)
  }
  for (const t of QUANTITY_TABLES) {
    stmts.push(`ALTER TABLE "${schema}"."${t}" ALTER COLUMN "quantity" SET DEFAULT 1`)
    stmts.push(`ALTER TABLE "${schema}"."${t}" ALTER COLUMN "quantity" TYPE DECIMAL(12,3)`)
  }
  return stmts
}

async function runStatements(schema: string): Promise<void> {
  for (const t of QUANTITY_TABLES) {
    const dt = await columnType(schema, t, 'quantity')
    if (dt && dt !== 'integer' && dt !== 'int' && dt !== 'smallint' && dt !== 'bigint') {
      console.log(`migrate: quantity de ${t} ya es ${dt}, se omite`)
    }
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const stmts = statementsFor(schema)
      for (const s of stmts) {
        await prisma.$executeRawUnsafe(s)
        console.log(`migrate: OK -> ${s}`)
      }
      console.log('migrate: schema listo')
      return
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`migrate: intento ${attempt} falló -> ${msg}`)
      if (attempt < 3) await new Promise((r) => setTimeout(r, 5000))
      else throw e
    }
  }
}

async function run() {
  const schema = await findSchema()
  console.log(`migrate: schema detectado = ${schema}`)
  await runStatements(schema)
}

run()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('migrate: ERROR definitivo', e)
    await prisma.$disconnect()
    process.exit(1)
  })
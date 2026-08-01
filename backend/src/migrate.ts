import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function findSchema(): Promise<string> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ table_schema: string }[]>(
      `SELECT table_schema FROM information_schema.tables WHERE table_name IN ('Quote','Invoice') GROUP BY table_schema ORDER BY count(*) DESC LIMIT 1`
    )
    if (rows && rows.length > 0) return rows[0].table_schema
  } catch (e) {
    console.log('migrate: no pude detectar schema ->', e instanceof Error ? e.message : e)
  }
  return 'public'
}

function statementsFor(schema: string): string[] {
  const q = (name: string) => `"${schema}"."${name}"`
  return [
    `ALTER TABLE ${q('Quote')} ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`,
    `ALTER TABLE ${q('Quote')} ALTER COLUMN "discount" TYPE DECIMAL(12,6)`,
    `ALTER TABLE ${q('Invoice')} ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`,
    `ALTER TABLE ${q('Invoice')} ALTER COLUMN "discount" TYPE DECIMAL(12,6)`,
    `ALTER TABLE ${q('QuoteItem')} ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`,
    `ALTER TABLE ${q('QuoteItem')} ALTER COLUMN "discount" TYPE DECIMAL(12,6)`,
    `ALTER TABLE ${q('InvoiceItem')} ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`,
    `ALTER TABLE ${q('InvoiceItem')} ALTER COLUMN "discount" TYPE DECIMAL(12,6)`,
  ]
}

async function run() {
  const schema = await findSchema()
  console.log(`migrate: schema detectado = ${schema}`)
  const statements = statementsFor(schema)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      for (const s of statements) {
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

run()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('migrate: ERROR definitivo', e)
    await prisma.$disconnect()
    process.exit(1)
  })

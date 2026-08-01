import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

const statements: string[] = [
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`,
  `ALTER TABLE "Quote" ALTER COLUMN "discount" TYPE DECIMAL(12,6)`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`,
  `ALTER TABLE "Invoice" ALTER COLUMN "discount" TYPE DECIMAL(12,6)`,
  `ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`,
  `ALTER TABLE "QuoteItem" ALTER COLUMN "discount" TYPE DECIMAL(12,6)`,
  `ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,6)`,
  `ALTER TABLE "InvoiceItem" ALTER COLUMN "discount" TYPE DECIMAL(12,6)`,
]

async function run() {
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

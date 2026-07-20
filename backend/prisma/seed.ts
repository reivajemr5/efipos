import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@efipos.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@efipos.com',
      passwordHash: hash,
      role: 'dueno',
    },
  })
  console.log('Usuario admin creado: admin@efipos.com / admin123')
}

main().finally(() => prisma.$disconnect())

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPERADMIN_EMAIL || 'Reivajemr@efipos.vercel.app'
  const password = process.env.SUPERADMIN_PASSWORD || '#Poss$9155#'
  const hash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, role: 'superadmin', active: true },
    create: {
      name: 'Super Admin',
      email,
      passwordHash: hash,
      role: 'superadmin',
    },
  })
  console.log(`Superadmin listo: ${email}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const brands = await prisma.brand.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
  res.json(brands)
}

export async function create(req: AuthRequest, res: Response) {
  const { name } = req.body
  if (!name?.trim()) {
    res.status(400).json({ error: 'Nombre requerido' })
    return
  }
  const brand = await prisma.brand.create({ data: { name: name.trim() } })
  res.status(201).json(brand)
}

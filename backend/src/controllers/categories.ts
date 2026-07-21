import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
  res.json(categories)
}

export async function create(req: AuthRequest, res: Response) {
  const { name } = req.body
  if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return }
  const category = await prisma.category.create({ data: { name } })
  res.status(201).json(category)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { name, active } = req.body
  const category = await prisma.category.update({ where: { id }, data: { name, active } })
  res.json(category)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  await prisma.category.update({ where: { id }, data: { active: false } })
  res.status(204).send()
}

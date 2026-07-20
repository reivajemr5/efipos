import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const { q } = req.query
  const where = q
    ? {
        OR: [
          { name: { contains: String(q), mode: 'insensitive' as const } },
          { documentNumber: { contains: String(q) } },
        ],
      }
    : {}
  const clients = await prisma.client.findMany({ where, orderBy: { name: 'asc' } })
  res.json(clients)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) { res.status(404).json({ error: 'Cliente no encontrado' }); return }
  res.json(client)
}

export async function create(req: AuthRequest, res: Response) {
  const { name, documentType, documentNumber, phone, address } = req.body
  if (!name || !documentType || !documentNumber) {
    res.status(400).json({ error: 'Nombre, tipo y número de documento requeridos' })
    return
  }
  const client = await prisma.client.create({
    data: { name, documentType, documentNumber, phone, address },
  })
  res.status(201).json(client)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { name, documentType, documentNumber, phone, address } = req.body
  const client = await prisma.client.update({
    where: { id },
    data: { name, documentType, documentNumber, phone, address },
  })
  res.json(client)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  await prisma.client.delete({ where: { id } })
  res.status(204).send()
}

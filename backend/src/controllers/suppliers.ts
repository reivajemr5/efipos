import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function list(req: AuthRequest, res: Response) {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
  res.json(suppliers)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { products: { include: { product: true } } },
  })
  if (!supplier) { res.status(404).json({ error: 'Proveedor no encontrado' }); return }
  res.json(supplier)
}

export async function create(req: AuthRequest, res: Response) {
  const { name, documentType, documentNumber, phone, address } = req.body
  if (!name || !documentType || !documentNumber) {
    res.status(400).json({ error: 'Nombre, tipo y número de documento requeridos' })
    return
  }
  const supplier = await prisma.supplier.create({
    data: { name, documentType, documentNumber, phone, address },
  })
  res.status(201).json(supplier)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const { name, documentType, documentNumber, phone, address } = req.body
  const supplier = await prisma.supplier.update({
    where: { id },
    data: { name, documentType, documentNumber, phone, address },
  })
  res.json(supplier)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  await prisma.supplier.delete({ where: { id } })
  res.status(204).send()
}

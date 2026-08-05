import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { parsePagination, paginate } from '../lib/paginate'
import { resolveContext } from '../lib/tenant'

export async function list(req: AuthRequest, res: Response) {
  const { q } = req.query
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(400).json({ error: 'Se requiere un negocio activo' }); return }
  const where: any = { businessId: ctx.businessId }
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' as const } },
      { documentNumber: { contains: String(q) } },
    ]
  }
  const { limit, offset, hasPagination } = parsePagination(req.query)
  if (hasPagination) {
    const result = await paginate(prisma.client, { where, orderBy: { name: 'asc' } }, limit, offset)
    res.json(result)
    return
  }
  const clients = await prisma.client.findMany({ where, orderBy: { name: 'asc' } })
  res.json(clients)
}

export async function statement(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const client = await prisma.client.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!client) { res.status(404).json({ error: 'Cliente no encontrado' }); return }

  const invoices = await prisma.invoice.findMany({
    where: { clientId: id, businessId: ctx.businessId ?? 0, status: { not: 'borrador' } },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, code: true } } } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })

  const active = invoices.filter((i) => i.status === 'activa')
  const totalComprado = active.reduce((s, i) => s + Number(i.total), 0)
  const totalPagado = active.reduce((s, i) => s + i.payments.reduce((p, pay) => p + Number(pay.amount), 0), 0)
  const totalPendiente = active.reduce((s, i) => s + Number(i.balance), 0)

  res.json({
    client,
    invoices,
    totals: {
      totalComprado: Math.round(totalComprado * 100) / 100,
      totalPagado: Math.round(totalPagado * 100) / 100,
      totalPendiente: Math.round(totalPendiente * 100) / 100,
      facturas: active.length,
    },
  })
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const client = await prisma.client.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!client) { res.status(404).json({ error: 'Cliente no encontrado' }); return }
  res.json(client)
}

export async function create(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) { res.status(403).json({ error: 'Se requiere un negocio activo' }); return }
  const { name, documentType, documentNumber, phone, address } = req.body
  if (!name || !documentType || !documentNumber) {
    res.status(400).json({ error: 'Nombre, tipo y número de documento requeridos' })
    return
  }
  const client = await prisma.client.create({
    data: { name, documentType, documentNumber, phone, address, businessId: ctx.businessId },
  })
  res.status(201).json(client)
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.client.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!existing) { res.status(404).json({ error: 'Cliente no encontrado' }); return }
  const { name, documentType, documentNumber, phone, address } = req.body
  const client = await prisma.client.update({
    where: { id },
    data: { name, documentType, documentNumber, phone, address },
  })
  res.json(client)
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const ctx = resolveContext(req)
  const existing = await prisma.client.findFirst({ where: { id, businessId: ctx.businessId ?? 0 } })
  if (!existing) { res.status(404).json({ error: 'Cliente no encontrado' }); return }
  await prisma.client.delete({ where: { id } })
  res.status(204).send()
}
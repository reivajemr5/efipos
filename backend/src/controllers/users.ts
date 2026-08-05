import { Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

const USER_SELECT = {
  id: true, name: true, email: true, role: true, active: true,
  businessId: true, branchId: true, createdAt: true,
  business: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
} as const

export async function list(req: AuthRequest, res: Response) {
  const where: any = {}
  if (req.user!.role !== 'superadmin') {
    where.businessId = req.user!.businessId ?? -1
  }
  const users = await prisma.user.findMany({ where, select: USER_SELECT, orderBy: { name: 'asc' } })
  res.json(users)
}

export async function getById(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT })
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
  if (req.user!.role !== 'superadmin' && user.businessId !== req.user!.businessId) {
    res.status(403).json({ error: 'No tienes permiso para este usuario' })
    return
  }
  res.json(user)
}

export async function create(req: AuthRequest, res: Response) {
  const { name, email, password, role, businessId, branchId } = req.body
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Nombre, email, password y rol requeridos' })
    return
  }
  const validRoles = ['dueno', 'admin', 'cajero']
  if (req.user!.role !== 'superadmin' && role === 'dueno') {
    res.status(403).json({ error: 'Solo el superadmin puede crear dueños' })
    return
  }
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: 'Rol inválido' })
    return
  }

  const targetBusinessId =
    req.user!.role === 'superadmin'
      ? (businessId || null)
      : (req.user!.businessId ?? null)

  let targetBranchId: number | null = branchId || null
  if (targetBranchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: targetBranchId, businessId: targetBusinessId ?? 0, active: true },
    })
    if (!branch) targetBranchId = null
  }

  const hash = await bcrypt.hash(password, 12)
  try {
    const user = await prisma.user.create({
      data: {
        name, email,
        passwordHash: hash,
        role, businessId: targetBusinessId, branchId: role === 'dueno' ? null : targetBranchId,
      },
      select: USER_SELECT,
    })
    res.status(201).json(user)
  } catch (e) {
    if ((e as any)?.code === 'P2002') {
      res.status(400).json({ error: 'Ya existe un usuario con ese email' })
      return
    }
    throw e
  }
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
  if (req.user!.role !== 'superadmin' && existing.businessId !== req.user!.businessId) {
    res.status(403).json({ error: 'No tienes permiso para este usuario' })
    return
  }

  const { name, email, password, role, businessId, branchId, active } = req.body
  const data: any = { name, email, active, role }
  if (password) data.passwordHash = await bcrypt.hash(password, 12)

  if (req.user!.role === 'superadmin') {
    data.businessId = businessId ?? null
    data.branchId = (role === 'dueno' || role === 'superadmin') ? null : (branchId ?? null)
  } else {
    data.businessId = req.user!.businessId ?? null
    data.branchId = (role === 'dueno') ? null : (branchId ?? existing.branchId)
  }

  try {
    const user = await prisma.user.update({ where: { id }, data, select: USER_SELECT })
    res.json(user)
  } catch (e) {
    if ((e as any)?.code === 'P2002') {
      res.status(400).json({ error: 'Ya existe un usuario con ese email' })
      return
    }
    throw e
  }
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
  if (req.user!.role !== 'superadmin' && existing.businessId !== req.user!.businessId) {
    res.status(403).json({ error: 'No tienes permiso para este usuario' })
    return
  }
  await prisma.user.update({ where: { id }, data: { active: false } })
  res.status(204).send()
}
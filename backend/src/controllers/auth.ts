import { Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

export async function login(req: AuthRequest, res: Response) {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña requeridos' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) {
    res.status(401).json({ error: 'Credenciales inválidas' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Credenciales inválidas' })
    return
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    branchId: user.branchId,
  }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  })

  res.json({ token, user: payload })
}

export async function logout(req: AuthRequest, res: Response) {
  res.clearCookie('token', { path: '/', sameSite: 'lax' })
  res.json({ message: 'Sesión cerrada' })
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true, active: true,
      businessId: true, branchId: true, createdAt: true,
      business: { select: { id: true, name: true, rif: true } },
      branch: { select: { id: true, name: true } },
    },
  })

  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado' })
    return
  }

  res.json(user)
}

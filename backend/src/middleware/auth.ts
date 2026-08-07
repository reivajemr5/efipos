import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

export type RoleValue = 'superadmin' | 'dueno' | 'admin' | 'cajero'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  businessId?: number | null
  branchId?: number | null
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  let token: string | undefined
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1]
  } else if (req.cookies?.token) {
    token = req.cookies.token
  }

  if (!token) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest['user']
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'No tienes permiso para esta acción' })
      return
    }
    next()
  }
}

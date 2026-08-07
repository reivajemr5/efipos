import { Request, Response, NextFunction } from 'express'

export function requireAppHeader(req: Request, res: Response, next: NextFunction) {
  const method = req.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next()
    return
  }

  const appHeader = req.headers['x-requested-with']
  if (appHeader !== 'XMLHttpRequest') {
    res.status(403).json({ error: 'Petición no permitida' })
    return
  }

  next()
}

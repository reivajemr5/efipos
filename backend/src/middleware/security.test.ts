import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import { requireAppHeader } from './csrf'
import { authenticate, authorize } from './auth'

function makeToken(role: string) {
  return jwt.sign({ id: 1, name: 'T', email: 't@test.com', role }, process.env.JWT_SECRET!)
}

describe('RBAC: authenticate + authorize', () => {
  const app = express()
  app.get('/protected', authenticate, authorize('dueno', 'admin'), (_req: any, res: any) =>
    res.json({ ok: true })
  )

  it('rechaza sin token (401)', async () => {
    const r = await request(app).get('/protected')
    expect(r.status).toBe(401)
  })

  it('devuelve 403 a un cajero', async () => {
    const r = await request(app).get('/protected').set('Authorization', `Bearer ${makeToken('cajero')}`)
    expect(r.status).toBe(403)
  })

  it('permite acceso a admin', async () => {
    const r = await request(app).get('/protected').set('Authorization', `Bearer ${makeToken('admin')}`)
    expect(r.status).toBe(200)
  })
})

describe('Rate limit anti fuerza bruta', () => {
  const { default: rateLimit } = require('express-rate-limit') as typeof import('express-rate-limit')
  const loginLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, skipSuccessfulRequests: true })
  const app = express()
  app.use(express.json())
  app.post('/login', loginLimiter, (_req: any, res: any) => res.status(401).json({ error: 'fallo' }))

  it('bloquea con 429 tras 5 intentos fallidos', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post('/login').send({ email: 'a@b.co', password: 'x' })
      expect(r.status).toBe(401)
    }
    const blocked = await request(app).post('/login').send({ email: 'a@b.co', password: 'x' })
    expect(blocked.status).toBe(429)
  })
})

describe('CSRF: requireAppHeader', () => {
  const app = express()
  app.use('/mut', requireAppHeader, (_req: any, res: any) => res.json({ ok: true }))

  it('permite GET sin cabecera', async () => {
    const r = await request(app).get('/mut')
    expect(r.status).toBe(200)
  })

  it('bloquea POST sin cabecera X-Requested-With', async () => {
    const r = await request(app).post('/mut').send({})
    expect(r.status).toBe(403)
  })

  it('permite POST con la cabecera', async () => {
    const r = await request(app).post('/mut').set('X-Requested-With', 'XMLHttpRequest').send({})
    expect(r.status).toBe(200)
  })
})
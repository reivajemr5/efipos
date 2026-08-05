import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { resolveContext } from '../lib/tenant'
import { updateBCVRate } from '../services/exchangeRateUpdater'

export async function getRate(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  // Per-business manual rate takes priority, otherwise fall back to global BCV.
  const where: any = req.user!.role === 'superadmin' && !ctx.businessId
    ? { businessId: null }
    : { businessId: ctx.businessId ?? null }
  const rate = await prisma.exchangeRate.findFirst({ where, orderBy: { date: 'desc' } })
  if (rate) {
    res.json(rate)
    return
  }
  if (where.businessId != null) {
    const global = await prisma.exchangeRate.findFirst({ where: { businessId: null }, orderBy: { date: 'desc' } })
    if (global) { res.json(global); return }
  }
  res.json({ id: 0, businessId: ctx.businessId, rate: 0, source: 'bcv', date: new Date().toISOString() })
}

export async function updateRate(req: AuthRequest, res: Response) {
  const { rate } = req.body
  if (!rate || rate <= 0) {
    res.status(400).json({ error: 'Tasa inválida' })
    return
  }
  const ctx = resolveContext(req)
  if (!ctx.businessId) {
    res.status(403).json({ error: 'Se requiere un negocio activo para ajustar su tasa' })
    return
  }
  const exchangeRate = await prisma.exchangeRate.create({
    data: { rate, source: 'manual', businessId: ctx.businessId },
  })
  res.status(201).json(exchangeRate)
}

export async function restoreAuto(req: AuthRequest, res: Response) {
  const ctx = resolveContext(req)
  if (!ctx.businessId) {
    res.status(403).json({ error: 'Se requiere un negocio activo' })
    return
  }
  await prisma.exchangeRate.deleteMany({ where: { businessId: ctx.businessId, source: 'manual' } })
  const global = await prisma.exchangeRate.findFirst({ where: { businessId: null }, orderBy: { date: 'desc' } })
  res.json(global || { source: 'bcv', rate: 0, businessId: null })
}

export async function autoUpdateRate(req: AuthRequest, res: Response) {
  const result = await updateBCVRate()
  if (!result) {
    res.status(502).json({ error: 'No se pudo obtener la tasa del BCV. Intenta manualmente.' })
    return
  }
  res.json({ message: 'Tasa actualizada automáticamente', ...result, businessId: null })
}
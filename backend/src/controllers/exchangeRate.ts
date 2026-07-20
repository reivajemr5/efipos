import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'
import { updateBCVRate } from '../services/exchangeRateUpdater'

export async function getRate(req: AuthRequest, res: Response) {
  const rate = await prisma.exchangeRate.findFirst({ orderBy: { date: 'desc' } })
  res.json(rate || { rate: 0, source: 'bcv', date: new Date().toISOString() })
}

export async function updateRate(req: AuthRequest, res: Response) {
  const { rate } = req.body
  if (!rate || rate <= 0) {
    res.status(400).json({ error: 'Tasa inválida' })
    return
  }
  const exchangeRate = await prisma.exchangeRate.create({
    data: { rate, source: 'manual' },
  })
  res.status(201).json(exchangeRate)
}

export async function autoUpdateRate(req: AuthRequest, res: Response) {
  const result = await updateBCVRate()
  if (!result) {
    res.status(502).json({ error: 'No se pudo obtener la tasa del BCV. Intenta manualmente.' })
    return
  }
  res.json({ message: 'Tasa actualizada automáticamente', ...result })
}


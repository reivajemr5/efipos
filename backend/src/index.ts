import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import authRoutes from './routes/auth'
import clientRoutes from './routes/clients'
import supplierRoutes from './routes/suppliers'
import productRoutes from './routes/products'
import quoteRoutes from './routes/quotes'
import invoiceRoutes from './routes/invoices'
import reportRoutes from './routes/reports'
import exchangeRateRoutes from './routes/exchangeRate'
import { updateBCVRate } from './services/exchangeRateUpdater'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/clients', clientRoutes)
app.use('/api/v1/suppliers', supplierRoutes)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/quotes', quoteRoutes)
app.use('/api/v1/invoices', invoiceRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/exchange-rate', exchangeRateRoutes)

// Auto-update BCV rate every day at 10:00 AM
cron.schedule('0 10 * * *', async () => {
  console.log('[cron] Actualizando tasa BCV automáticamente...')
  const result = await updateBCVRate()
  if (result) {
    console.log(`[cron] Tasa actualizada: Bs. ${result.rate} por USD (fuente: ${result.source})`)
  } else {
    console.log('[cron] No se pudo actualizar la tasa')
  }
})

app.listen(PORT, () => {
  console.log(`Efi- Pos API running on port ${PORT}`)
})

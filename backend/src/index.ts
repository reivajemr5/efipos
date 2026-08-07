import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import cron from 'node-cron'
import authRoutes from './routes/auth'
import clientRoutes from './routes/clients'
import supplierRoutes from './routes/suppliers'
import productRoutes from './routes/products'
import categoryRoutes from './routes/categories'
import quoteRoutes from './routes/quotes'
import invoiceRoutes from './routes/invoices'
import purchaseRoutes from './routes/purchases'
import reportRoutes from './routes/reports'
import exchangeRateRoutes from './routes/exchangeRate'
import accountRoutes from './routes/accounts'
import searchRoutes from './routes/search'
import inventoryRoutes from './routes/inventory'
import paymentRoutes from './routes/payments'
import attributeTemplateRoutes from './routes/attributeTemplates'
import brandRoutes from './routes/brands'
import businessRoutes from './routes/businesses'
import branchRoutes from './routes/branches'
import userRoutes from './routes/users'
import { updateBCVRate } from './services/exchangeRateUpdater'
import { requireAppHeader } from './middleware/csrf'

dotenv.config()

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cookieParser())
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
    credentials: true,
  })
)
app.use(express.json({ limit: '50mb' }))

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intente de nuevo en unos minutos.' },
})
app.use('/api/v1', globalLimiter)
app.use('/api/v1', requireAppHeader)

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
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/exchange-rate', exchangeRateRoutes)
app.use('/api/v1/purchases', purchaseRoutes)
app.use('/api/v1/accounts', accountRoutes)
app.use('/api/v1/search', searchRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/attribute-templates', attributeTemplateRoutes)
app.use('/api/v1/brands', brandRoutes)
app.use('/api/v1/businesses', businessRoutes)
app.use('/api/v1/branches', branchRoutes)
app.use('/api/v1/users', userRoutes)

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

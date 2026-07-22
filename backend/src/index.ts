import express from 'express'
import cors from 'cors'
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
import categoryRoutes from './routes/categories'
import inventoryRoutes from './routes/inventory'
import paymentRoutes from './routes/payments'
import attributeTemplateRoutes from './routes/attributeTemplates'
import brandRoutes from './routes/brands'
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
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/exchange-rate', exchangeRateRoutes)
app.use('/api/v1/purchases', purchaseRoutes)
app.use('/api/v1/accounts', accountRoutes)
app.use('/api/v1/search', searchRoutes)
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/attribute-templates', attributeTemplateRoutes)
app.use('/api/v1/brands', brandRoutes)

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

import { Router } from 'express'
import { salesReport, topProducts, cashClose, saveCashClose, dashboard } from '../controllers/reports'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/sales', salesReport)
router.get('/top-products', topProducts)
router.get('/cash-close', cashClose)
router.post('/cash-close', authorize('dueno', 'admin'), saveCashClose)
router.get('/dashboard', dashboard)

export default router

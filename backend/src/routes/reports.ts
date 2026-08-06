import { Router } from 'express'
import { salesReport, topProducts, cashClose, saveCashClose, dashboard } from '../controllers/reports'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/sales', authorize('superadmin', 'dueno', 'admin'), salesReport)
router.get('/top-products', authorize('superadmin', 'dueno', 'admin'), topProducts)
router.get('/cash-close', authorize('superadmin', 'dueno', 'admin'), cashClose)
router.post('/cash-close', authorize('superadmin', 'dueno', 'admin'), saveCashClose)
router.get('/dashboard', authorize('superadmin', 'dueno', 'admin'), dashboard)

export default router

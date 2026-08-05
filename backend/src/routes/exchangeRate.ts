import { Router } from 'express'
import { getRate, updateRate, restoreAuto, autoUpdateRate } from '../controllers/exchangeRate'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', getRate)
router.put('/', authorize('superadmin', 'dueno', 'admin'), updateRate)
router.post('/restore-auto', authorize('superadmin', 'dueno', 'admin'), restoreAuto)
router.post('/auto-update', authorize('superadmin', 'dueno', 'admin'), autoUpdateRate)

export default router

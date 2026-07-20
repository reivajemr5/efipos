import { Router } from 'express'
import { getRate, updateRate, autoUpdateRate } from '../controllers/exchangeRate'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', getRate)
router.put('/', authorize('dueno', 'admin'), updateRate)
router.post('/auto-update', authorize('dueno', 'admin'), autoUpdateRate)

export default router

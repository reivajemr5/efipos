import { Router } from 'express'
import { list, create, totals } from '../controllers/payments'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.post('/', authorize('dueno', 'admin'), create)
router.get('/totals', totals)

export default router

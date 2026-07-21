import { Router } from 'express'
import { list, create, totals } from '../controllers/payments'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.post('/', create)
router.get('/totals', totals)

export default router

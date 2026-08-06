import { Router } from 'express'
import { list, getById, create, receive, markAsPaid, cancel } from '../controllers/purchases'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/:id', getById)
router.post('/', authorize('superadmin', 'dueno', 'admin'), create)
router.post('/:id/receive', authorize('superadmin', 'dueno', 'admin'), receive)
router.post('/:id/pay', authorize('superadmin', 'dueno', 'admin'), markAsPaid)
router.post('/:id/cancel', authorize('superadmin', 'dueno', 'admin'), cancel)

export default router

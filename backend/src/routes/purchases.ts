import { Router } from 'express'
import { list, getById, create, markAsPaid, cancel } from '../controllers/purchases'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/:id', getById)
router.post('/', create)
router.post('/:id/pay', markAsPaid)
router.post('/:id/cancel', cancel)

export default router

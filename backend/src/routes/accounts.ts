import { Router } from 'express'
import { receivable, payable } from '../controllers/accounts'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/receivable', receivable)
router.get('/payable', payable)

export default router

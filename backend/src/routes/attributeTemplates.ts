import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { list, create } from '../controllers/attributeTemplates'

const router = Router()
router.use(authenticate)
router.get('/', list)
router.post('/', authorize('superadmin', 'dueno', 'admin'), create)

export default router

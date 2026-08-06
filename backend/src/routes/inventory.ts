import { Router } from 'express'
import { movements, adjust, history } from '../controllers/inventory'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/movements', movements)
router.post('/adjust', authorize('superadmin', 'dueno', 'admin'), adjust)
router.get('/history/:id', history)

export default router

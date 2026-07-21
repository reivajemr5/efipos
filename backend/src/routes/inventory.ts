import { Router } from 'express'
import { movements, adjust, history } from '../controllers/inventory'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/movements', movements)
router.post('/adjust', adjust)
router.get('/history/:id', history)

export default router

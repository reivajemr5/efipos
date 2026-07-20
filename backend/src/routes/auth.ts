import { Router } from 'express'
import { login, me } from '../controllers/auth'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.get('/me', authenticate, me)

export default router

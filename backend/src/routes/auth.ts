import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login, logout, me } from '../controllers/auth'
import { authenticate } from '../middleware/auth'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos fallidos. Intente de nuevo en 15 minutos.' },
})

router.post('/login', loginLimiter, login)
router.post('/logout', logout)
router.get('/me', authenticate, me)

export default router

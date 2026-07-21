import { Router } from 'express'
import { globalSearch } from '../controllers/search'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', globalSearch)

export default router

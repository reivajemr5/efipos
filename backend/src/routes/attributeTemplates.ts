import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { list, create } from '../controllers/attributeTemplates'

const router = Router()
router.use(authenticate)
router.get('/', list)
router.post('/', create)

export default router

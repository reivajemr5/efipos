import { Router } from 'express'
import { list, create, update, remove } from '../controllers/categories'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.post('/', authorize('dueno', 'admin'), create)
router.put('/:id', authorize('dueno', 'admin'), update)
router.delete('/:id', authorize('dueno', 'admin'), remove)

export default router

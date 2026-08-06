import { Router } from 'express'
import { list, getById, create, update, remove } from '../controllers/suppliers'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/:id', getById)
router.post('/', authorize('superadmin', 'dueno', 'admin'), create)
router.put('/:id', authorize('superadmin', 'dueno', 'admin'), update)
router.delete('/:id', authorize('superadmin', 'dueno', 'admin'), remove)

export default router

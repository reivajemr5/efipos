import { Router } from 'express'
import { list, getById, create, update, remove, statement } from '../controllers/clients'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/:id/statement', statement)
router.get('/:id', getById)
router.post('/', create)
router.put('/:id', authorize('superadmin', 'dueno', 'admin'), update)
router.delete('/:id', authorize('superadmin', 'dueno', 'admin'), remove)

export default router

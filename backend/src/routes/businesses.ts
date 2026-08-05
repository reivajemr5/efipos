import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import * as c from '../controllers/businesses'

const router = Router()

router.use(authenticate)
router.use(authorize('superadmin', 'dueno'))

router.get('/', c.list)
router.get('/:id', c.getById)
router.post('/', authorize('superadmin'), c.create)
router.put('/:id', c.update)
router.delete('/:id', authorize('superadmin'), c.remove)

export default router
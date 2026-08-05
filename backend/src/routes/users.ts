import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import * as c from '../controllers/users'

const router = Router()

router.use(authenticate)
router.use(authorize('superadmin', 'dueno', 'admin'))

router.get('/', c.list)
router.get('/:id', c.getById)
router.post('/', authorize('superadmin', 'dueno'), c.create)
router.put('/:id', authorize('superadmin', 'dueno'), c.update)
router.delete('/:id', authorize('superadmin', 'dueno'), c.remove)

export default router
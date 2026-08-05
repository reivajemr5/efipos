import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import * as c from '../controllers/branches'

const router = Router()

router.use(authenticate)
router.use(authorize('superadmin', 'dueno', 'admin', 'cajero'))

router.get('/context', c.listBranchesForContext)
router.get('/by-business/:businessId', c.list)
router.get('/:id', c.getById)
router.post('/', authorize('superadmin', 'dueno'), c.create)
router.put('/:id', authorize('superadmin', 'dueno'), c.update)
router.delete('/:id', authorize('superadmin', 'dueno'), c.remove)

export default router
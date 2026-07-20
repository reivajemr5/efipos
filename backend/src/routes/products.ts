import { Router } from 'express'
import { list, getById, create, update, remove } from '../controllers/products'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/:id', getById)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)

export default router

import { Router } from 'express'
import { list, getById, create, convertToInvoice, remove } from '../controllers/quotes'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/:id', getById)
router.post('/', create)
router.post('/:id/convert', convertToInvoice)
router.delete('/:id', remove)

export default router

import { Router } from 'express'
import { list, getById, create, update, convertToInvoice, remove, getPrintData } from '../controllers/quotes'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/print/:id', getPrintData)
router.get('/:id', getById)
router.post('/', create)
router.put('/:id', update)
router.post('/:id/convert', convertToInvoice)
router.delete('/:id', remove)

export default router

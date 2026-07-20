import { Router } from 'express'
import { list, getById, create, cancel, getPrintData } from '../controllers/invoices'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/print/:id', getPrintData)
router.get('/:id', getById)
router.post('/', create)
router.post('/:id/cancel', cancel)

export default router

import { Router } from 'express'
import { list, getById, create, cancel, getPrintData, listDrafts, completeDraft, abonar } from '../controllers/invoices'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/drafts', listDrafts)
router.get('/print/:id', getPrintData)
router.get('/:id', getById)
router.post('/', create)
router.post('/:id/cancel', cancel)
router.patch('/:id/complete', completeDraft)
router.post('/:id/abonar', abonar)

export default router

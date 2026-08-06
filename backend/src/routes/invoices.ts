import { Router } from 'express'
import { list, getById, create, cancel, getPrintData, listDrafts, completeDraft, abonar, updateDraft } from '../controllers/invoices'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', list)
router.get('/drafts', listDrafts)
router.get('/print/:id', getPrintData)
router.get('/:id', getById)
router.post('/', create)
router.post('/:id/cancel', authorize('superadmin', 'dueno', 'admin'), cancel)
router.patch('/:id/complete', completeDraft)
router.patch('/:id', updateDraft)
router.post('/:id/abonar', abonar)

export default router

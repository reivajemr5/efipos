import { Router } from 'express'
import multer from 'multer'
import { list, getById, create, update, remove, importCsv, bulkImport } from '../controllers/products'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.use(authenticate)

router.get('/', list)
router.get('/:id', getById)
router.post('/', authorize('superadmin', 'dueno', 'admin'), create)
router.post('/import-csv', authorize('superadmin', 'dueno', 'admin'), upload.single('file'), importCsv)
router.post('/import', authorize('superadmin', 'dueno', 'admin'), bulkImport)
router.put('/:id', authorize('superadmin', 'dueno', 'admin'), update)
router.delete('/:id', authorize('superadmin', 'dueno', 'admin'), remove)

export default router

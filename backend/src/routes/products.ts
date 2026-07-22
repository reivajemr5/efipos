import { Router } from 'express'
import multer from 'multer'
import { list, getById, create, update, remove, importCsv, bulkImport } from '../controllers/products'
import { authenticate } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.use(authenticate)

router.get('/', list)
router.get('/:id', getById)
router.post('/', create)
router.post('/import-csv', upload.single('file'), importCsv)
router.post('/import', bulkImport)
router.put('/:id', update)
router.delete('/:id', remove)

export default router

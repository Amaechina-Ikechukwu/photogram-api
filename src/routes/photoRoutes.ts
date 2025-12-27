import { Router } from 'express';
import { getCategories, getPublicPhotos, viewPhoto } from '../controllers/photoController.ts';
import { authenticate } from '../middleware/auth.ts';
import { validatePagination } from '../middleware/validation.ts';

const router = Router();

// GET /photos/public?page=1&pageSize=5 (no auth required)
router.get('/public', validatePagination, getPublicPhotos);

// GET /photos/categories?page=1&pageSize=5
router.get('/categories', authenticate, validatePagination, getCategories);

// POST /photos/:photoId/view
router.post('/:photoId/view', authenticate, viewPhoto);

export default router;

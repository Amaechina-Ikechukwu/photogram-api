import { Router } from 'express';
import { toggleLike } from '../controllers/likeController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

// POST /like/toggle/:photoId
router.post('/toggle/:photoId', authenticate, toggleLike);

export default router;

import { Router } from 'express';
import { toggleLike, toggleCommentLike } from '../controllers/likeController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

// POST /like/toggle/:photoId - Toggle like on a photo
router.post('/toggle/:photoId', authenticate, toggleLike);

// POST /like/comment/toggle/:commentId - Toggle like on a comment
router.post('/comment/toggle/:commentId', authenticate, toggleCommentLike);

export default router;

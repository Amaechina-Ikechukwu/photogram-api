import { Router } from 'express';
import { 
  createComment, 
  getPhotoComments, 
  updateComment, 
  deleteComment 
} from '../controllers/commentController.ts';
import { authenticate, optionalAuthenticate } from '../middleware/auth.ts';

const router = Router();

// POST /comments/:photoId - Create a comment on a photo
router.post('/:photoId', authenticate, createComment);

// GET /comments/:photoId - Get all comments for a photo
router.get('/:photoId', optionalAuthenticate, getPhotoComments);

// PUT /comments/:commentId - Update a comment
router.put('/:commentId', authenticate, updateComment);

// DELETE /comments/:commentId - Delete a comment
router.delete('/:commentId', authenticate, deleteComment);

export default router;

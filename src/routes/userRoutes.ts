import { Router } from 'express';
import { getCurrentUser, updateCurrentUser, getUserPhotos, requestAccountDeletion } from '../controllers/userController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

// Get current user photos
router.get('/photos', authenticate, getUserPhotos);

// Get current user
router.get('/me', authenticate, getCurrentUser);

// Update current user
router.put('/me', authenticate, updateCurrentUser);

// Request account deletion (unauthenticated)
router.post('/deletion-request', requestAccountDeletion);

export default router;

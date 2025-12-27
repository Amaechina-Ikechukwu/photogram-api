import { Router } from 'express';
import { getCurrentUser, updateCurrentUser } from '../controllers/userController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

// Get current user
router.get('/me', authenticate, getCurrentUser);

// Update current user
router.put('/me', authenticate, updateCurrentUser);

export default router;

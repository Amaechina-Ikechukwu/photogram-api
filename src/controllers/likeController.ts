import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.ts';
import { LikeService } from '../services/likeService.ts';
import { PhotoService } from '../services/photoService.ts';
import { ApiResponse } from '../types/index.ts';

const likeService = new LikeService();
const photoService = new PhotoService();

export async function toggleLike(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    const { photoId } = req.params;

    if (!photoId) {
      res.status(400).json({
        success: false,
        message: 'Photo ID is required',
      } as ApiResponse);
      return;
    }

    // Check if photo exists
    const photo = await photoService.getPhotoById(photoId);
    
    if (!photo) {
      res.status(404).json({
        success: false,
        message: 'Photo not found',
      } as ApiResponse);
      return;
    }

    const result = await likeService.toggleLike(req.user.uid, photoId);

    const response: ApiResponse<{ hasLiked: boolean }> = {
      success: true,
      message: result.message,
      data: { hasLiked: result.hasLiked },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in toggleLike:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

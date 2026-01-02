import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.ts';
import { LikeService } from '../services/likeService.ts';
import { PhotoService } from '../services/photoService.ts';
import { CommentService } from '../services/commentService.ts';
import type { ApiResponse } from '../types/index.ts';

const likeService = new LikeService();
const photoService = new PhotoService();
const commentService = new CommentService();

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

export async function toggleCommentLike(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    const { commentId } = req.params;

    if (!commentId) {
      res.status(400).json({
        success: false,
        message: 'Comment ID is required',
      } as ApiResponse);
      return;
    }

    // Check if comment exists
    const comment = await commentService.getCommentById(commentId);
    
    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      } as ApiResponse);
      return;
    }

    const result = await likeService.toggleCommentLike(req.user.uid, commentId);

    const response: ApiResponse<{ hasLiked: boolean }> = {
      success: true,
      message: result.message,
      data: { hasLiked: result.hasLiked },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in toggleCommentLike:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle comment like',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

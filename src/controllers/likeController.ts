import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.ts';
import { LikeService } from '../services/likeService.ts';
import type { ApiResponse } from '../types/index.ts';

const likeService = new LikeService();

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

    const result = await likeService.toggleLike(req.user.uid, photoId);

    const response: ApiResponse<{ hasLiked: boolean }> = {
      success: true,
      message: result.message,
      data: { hasLiked: result.hasLiked },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in toggleLike:', error);
    const statusCode = error instanceof Error && error.message === 'Photo not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error instanceof Error && error.message === 'Photo not found'
        ? 'Photo not found'
        : 'Failed to toggle like',
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

    const result = await likeService.toggleCommentLike(req.user.uid, commentId);

    const response: ApiResponse<{ hasLiked: boolean }> = {
      success: true,
      message: result.message,
      data: { hasLiked: result.hasLiked },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in toggleCommentLike:', error);
    const statusCode = error instanceof Error && error.message === 'Comment not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error instanceof Error && error.message === 'Comment not found'
        ? 'Comment not found'
        : 'Failed to toggle comment like',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

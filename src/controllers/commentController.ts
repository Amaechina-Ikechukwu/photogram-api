import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.ts';
import { CommentService } from '../services/commentService.ts';
import type { ApiResponse } from '../types/index.ts';

const commentService = new CommentService();

export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    const { photoId } = req.params;
    const { text } = req.body;

    if (!photoId) {
      res.status(400).json({
        success: false,
        message: 'Photo ID is required',
      } as ApiResponse);
      return;
    }

    if (!text || text.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Comment text is required',
      } as ApiResponse);
      return;
    }

    const comment = await commentService.createComment(req.user.uid, photoId, text.trim());

    const response: ApiResponse = {
      success: true,
      message: 'Comment created successfully',
      data: comment,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in createComment:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error && error.message === 'Photo not found' 
        ? 'Photo not found' 
        : 'Failed to create comment',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

export async function getPhotoComments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { photoId } = req.params;

    if (!photoId) {
      res.status(400).json({
        success: false,
        message: 'Photo ID is required',
      } as ApiResponse);
      return;
    }

    const userId = req.user?.uid || null;
    const comments = await commentService.getPhotoComments(photoId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Comments retrieved successfully',
      data: comments,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getPhotoComments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comments',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

export async function updateComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    const { commentId } = req.params;
    const { text } = req.body;

    if (!commentId) {
      res.status(400).json({
        success: false,
        message: 'Comment ID is required',
      } as ApiResponse);
      return;
    }

    if (!text || text.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Comment text is required',
      } as ApiResponse);
      return;
    }

    const comment = await commentService.updateComment(commentId, req.user.uid, text.trim());

    const response: ApiResponse = {
      success: true,
      message: 'Comment updated successfully',
      data: comment,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in updateComment:', error);
    const statusCode = error instanceof Error && 
      (error.message === 'Comment not found' || error.message === 'Unauthorized to edit this comment') 
      ? 404 
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update comment',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
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

    await commentService.deleteComment(commentId, req.user.uid);

    const response: ApiResponse = {
      success: true,
      message: 'Comment deleted successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in deleteComment:', error);
    const statusCode = error instanceof Error && 
      (error.message === 'Comment not found' || error.message === 'Unauthorized to delete this comment') 
      ? 404 
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete comment',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

import type{ Response } from 'express';
import type{ AuthRequest } from '../middleware/auth.ts';
import { PhotoService } from '../services/photoService.ts';
import type{ ApiResponse, CategoriesResponse } from '../types/index.ts';

const photoService = new PhotoService();

export async function getPublicPhotos(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const uid = req.user?.uid;
    const categories = await photoService.getCategoriesWithPagination(
      uid || null,
      { page, pageSize }
    );

    const response: ApiResponse<CategoriesResponse> = {
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getPublicPhotos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

export async function getCategories(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const categories = await photoService.getCategoriesWithPagination(
      req.user.uid,
      { page, pageSize }
    );

    const response: ApiResponse<CategoriesResponse> = {
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

export async function viewPhoto(req: AuthRequest, res: Response): Promise<void> {
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

    await photoService.incrementViewCount(photoId);

    const response: ApiResponse = {
      success: true,
      message: 'View count incremented successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in viewPhoto:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment view count',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse);
  }
}

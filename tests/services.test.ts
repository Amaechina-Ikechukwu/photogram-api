import { describe, test, expect } from 'bun:test';
import { PhotoService } from '../src/services/photoService.ts';
import { LikeService } from '../src/services/likeService.ts';

describe('PhotoService', () => {
  test('should create PhotoService instance', () => {
    const service = new PhotoService();
    expect(service).toBeDefined();
  });

  test('should have getUserByUid method', () => {
    const service = new PhotoService();
    expect(typeof service.getUserByUid).toBe('function');
  });

  test('should have getCategoriesWithPagination method', () => {
    const service = new PhotoService();
    expect(typeof service.getCategoriesWithPagination).toBe('function');
  });

  test('should have incrementViewCount method', () => {
    const service = new PhotoService();
    expect(typeof service.incrementViewCount).toBe('function');
  });

  test('should have getPhotoById method', () => {
    const service = new PhotoService();
    expect(typeof service.getPhotoById).toBe('function');
  });
});

describe('LikeService', () => {
  test('should create LikeService instance', () => {
    const service = new LikeService();
    expect(service).toBeDefined();
  });

  test('should have toggleLike method', () => {
    const service = new LikeService();
    expect(typeof service.toggleLike).toBe('function');
  });

  test('should have hasUserLikedPhoto method', () => {
    const service = new LikeService();
    expect(typeof service.hasUserLikedPhoto).toBe('function');
  });
});

import { getDatabase } from '../config/firebase.ts';
import type { Photo, User, PhotoWithUser, CategoriesResponse, PaginationParams } from '../types/index.ts';
import type { Database } from 'firebase-admin/database';

export class PhotoService {
  private async getDb(): Promise<Database> {
    return await getDatabase();
  }

  async getUserByUid(uid: string): Promise<User | null> {
    try {
      const db = await this.getDb();
      const userSnapshot = await db.ref(`users/${uid}`).once('value');
      
      if (!userSnapshot.exists()) {
        return null;
      }

      const user = userSnapshot.val() as User;

      // Get user's upload count from users/{uid}/images
      const userImagesSnapshot = await db.ref(`users/${uid}/images`).once('value');
      user.numberOfUploads = userImagesSnapshot.exists() ? userImagesSnapshot.numChildren() : 0;

      return user;
    } catch (error) {
      console.error(`Error fetching user ${uid}:`, error);
      throw error;
    }
  }

  async checkUserLikedPhoto(uid: string, photoId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      // Likes are stored flat at likes/{likeId}, need to query by userId and postId
      const likesSnapshot = await db.ref('likes').once('value');
      
      if (!likesSnapshot.exists()) {
        return false;
      }

      let hasLiked = false;
      likesSnapshot.forEach((child) => {
        const like = child.val();
        if (like.userId === uid && like.postId === photoId) {
          hasLiked = true;
          return true; // Stop iteration
        }
      });

      return hasLiked;
    } catch (error) {
      console.error(`Error checking like status:`, error);
      return false;
    }
  }

  async getPhotoLikesCount(photoId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const likesSnapshot = await db.ref('likes').once('value');
      
      if (!likesSnapshot.exists()) {
        return 0;
      }

      let count = 0;
      likesSnapshot.forEach((child) => {
        const like = child.val();
        if (like.postId === photoId) {
          count++;
        }
      });

      return count;
    } catch (error) {
      console.error(`Error getting likes count:`, error);
      return 0;
    }
  }

  async getPhotoViewsCount(photoId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const viewsSnapshot = await db.ref(`views/${photoId}`).once('value');
      
      return viewsSnapshot.exists() ? viewsSnapshot.numChildren() : 0;
    } catch (error) {
      console.error(`Error getting views count:`, error);
      return 0;
    }
  }

  async getCategoriesWithPagination(
    uid: string | null,
    pagination: PaginationParams
  ): Promise<CategoriesResponse> {
    try {
      const db = await this.getDb();
      const photosSnapshot = await db.ref('images/public').once('value');
      
      if (!photosSnapshot.exists()) {
        return {};
      }

      const allPhotos: Photo[] = [];
      
      photosSnapshot.forEach((childSnapshot) => {
        const photo = childSnapshot.val() as Photo;
        photo.id = childSnapshot.key as string;
        allPhotos.push(photo);
      });

      // Sort by createdAt descending
      allPhotos.sort((a, b) => b.createdAt - a.createdAt);

      // Group by category
      const categoriesMap: { [key: string]: Photo[] } = {};
      
      for (const photo of allPhotos) {
        const category = photo.category || 'Other';
        if (!categoriesMap[category]) {
          categoriesMap[category] = [];
        }
        categoriesMap[category].push(photo);
      }

      // Fetch all likes once for performance
      const allLikesSnapshot = await db.ref('likes').once('value');
      const likesMap: { [photoId: string]: number } = {};
      const userLikesMap: { [photoId: string]: boolean } = {};

      if (allLikesSnapshot.exists()) {
        allLikesSnapshot.forEach((child) => {
          const like = child.val();
          const postId = like.postId;
          
          // Count likes per photo
          likesMap[postId] = (likesMap[postId] || 0) + 1;
          
          // Check if current user liked this photo
          if (uid && like.userId === uid) {
            userLikesMap[postId] = true;
          }
        });
      }

      // Apply pagination to each category
      const result: CategoriesResponse = {};
      const { page, pageSize } = pagination;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      for (const [category, photos] of Object.entries(categoriesMap)) {
        const paginatedPhotos = photos.slice(startIndex, endIndex);
        
        if (paginatedPhotos.length > 0) {
          const photosWithUsers: PhotoWithUser[] = [];

          for (const photo of paginatedPhotos) {
            const user = await this.getUserByUid(photo.uid);
            
            if (user) {
              // Get likes and views count
              photo.likes = likesMap[photo.id] || 0;
              photo.views = await this.getPhotoViewsCount(photo.id);
              
              const hasLiked = userLikesMap[photo.id] || false;
              
              photosWithUsers.push({
                photo,
                user,
                hasLiked,
              });
            }
          }

          if (photosWithUsers.length > 0) {
            result[category] = photosWithUsers;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async incrementViewCount(photoId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const photoRef = db.ref(`images/public/${photoId}`);
      const snapshot = await photoRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Photo not found');
      }

      const photo = snapshot.val() as Photo;

      // Add a new view entry to views/{photoId}
      const viewData = {
        timestamp: Date.now(),
        photoId: photoId,
        uid: photo.uid || ''
      };

      await db.ref(`views/${photoId}`).push(viewData);
    } catch (error) {
      console.error('Error incrementing view count:', error);
      throw error;
    }
  }

  async getPhotoById(photoId: string): Promise<Photo | null> {
    try {
      const db = await this.getDb();
      const snapshot = await db.ref(`images/public/${photoId}`).once('value');
      
      if (!snapshot.exists()) {
        return null;
      }

      const photo = snapshot.val() as Photo;
      photo.id = snapshot.key as string;
      
      return photo;
    } catch (error) {
      console.error('Error fetching photo:', error);
      throw error;
    }
  }
}

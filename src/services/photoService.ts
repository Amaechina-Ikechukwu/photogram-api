import { getDatabase } from '../config/firebase.ts';
import type { Photo, User, PhotoWithUser, CategoriesResponse, PaginationParams } from '../types/index.ts';
import type { DataSnapshot, Database } from 'firebase-admin/database';

export class PhotoService {
  private async getDb(): Promise<Database> {
    return getDatabase();
  }

  private buildLikesMaps(
    likesSnapshot: DataSnapshot,
    uid: string | null
  ): { likesMap: Record<string, number>; userLikesMap: Record<string, boolean> } {
    const likesMap: Record<string, number> = {};
    const userLikesMap: Record<string, boolean> = {};

    if (!likesSnapshot.exists()) {
      return { likesMap, userLikesMap };
    }

    likesSnapshot.forEach((child) => {
      const like = child.val();
      const postId = like.postId;

      likesMap[postId] = (likesMap[postId] || 0) + 1;

      if (uid && like.userId === uid) {
        userLikesMap[postId] = true;
      }
    });

    return { likesMap, userLikesMap };
  }

  private async getUsersByUids(db: Database, uids: string[]): Promise<Map<string, User>> {
    const uniqueUids = [...new Set(uids.filter(Boolean))];
    const users = new Map<string, User>();

    await Promise.all(uniqueUids.map(async (uid) => {
      const [userSnapshot, uploadsSnapshot] = await Promise.all([
        db.ref(`users/${uid}`).once('value'),
        db.ref(`users/${uid}/images`).once('value'),
      ]);

      if (!userSnapshot.exists()) {
        return;
      }

      const user = userSnapshot.val() as User;
      user.numberOfUploads = uploadsSnapshot.exists() ? uploadsSnapshot.numChildren() : 0;
      users.set(uid, user);
    }));

    return users;
  }

  private async getViewsMap(db: Database, photoIds: string[]): Promise<Record<string, number>> {
    const uniquePhotoIds = [...new Set(photoIds.filter(Boolean))];
    const entries = await Promise.all(uniquePhotoIds.map(async (photoId) => {
      const viewsSnapshot = await db.ref(`views/${photoId}`).once('value');
      return [photoId, viewsSnapshot.exists() ? viewsSnapshot.numChildren() : 0] as const;
    }));

    return Object.fromEntries(entries);
  }

  private async enrichPhotos(
    db: Database,
    photos: Photo[],
    uid: string | null,
    likesMap: Record<string, number>,
    userLikesMap: Record<string, boolean>
  ): Promise<PhotoWithUser[]> {
    if (photos.length === 0) {
      return [];
    }

    const [usersMap, viewsMap] = await Promise.all([
      this.getUsersByUids(db, photos.map((photo) => photo.uid)),
      this.getViewsMap(db, photos.map((photo) => photo.id)),
    ]);

    return photos.flatMap((photo) => {
      const user = usersMap.get(photo.uid);

      if (!user) {
        return [];
      }

      return [{
        photo: {
          ...photo,
          likes: likesMap[photo.id] || 0,
          views: viewsMap[photo.id] || 0,
        },
        user,
        hasLiked: uid ? Boolean(userLikesMap[photo.id]) : false,
      }];
    });
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

      const allLikesSnapshot = await db.ref('likes').once('value');
      const { likesMap, userLikesMap } = this.buildLikesMaps(allLikesSnapshot, uid);

      const result: CategoriesResponse = {};
      const { page, pageSize } = pagination;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      for (const [category, photos] of Object.entries(categoriesMap)) {
        const paginatedPhotos = photos.slice(startIndex, endIndex);

        if (paginatedPhotos.length === 0) {
          continue;
        }

        const photosWithUsers = await this.enrichPhotos(
          db,
          paginatedPhotos,
          uid,
          likesMap,
          userLikesMap
        );

        if (photosWithUsers.length > 0) {
          result[category] = photosWithUsers;
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

  async getPublicPhotosWithPagination(
    uid: string | null,
    pagination: PaginationParams
  ): Promise<PhotoWithUser[]> {
    try {
      const db = await this.getDb();
      const photosSnapshot = await db.ref('images/public').once('value');
      
      if (!photosSnapshot.exists()) {
        return [];
      }

      const allPhotos: Photo[] = [];
      
      photosSnapshot.forEach((childSnapshot) => {
        const photo = childSnapshot.val() as Photo;
        photo.id = childSnapshot.key as string;
        allPhotos.push(photo);
      });

      // Sort by createdAt descending
      allPhotos.sort((a, b) => b.createdAt - a.createdAt);

      // Apply pagination
      const { page, pageSize } = pagination;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedPhotos = allPhotos.slice(startIndex, endIndex);

      const allLikesSnapshot = await db.ref('likes').once('value');
      const { likesMap, userLikesMap } = this.buildLikesMaps(allLikesSnapshot, uid);

      return this.enrichPhotos(db, paginatedPhotos, uid, likesMap, userLikesMap);
    } catch (error) {
      console.error('Error fetching public photos:', error);
      throw error;
    }
  }
}

import { getDatabase } from '../config/firebase.ts';
import type { Photo, User, PhotoWithUser, CategoriesResponse, PaginationParams } from '../types/index.ts';
import type { Database } from 'firebase-admin/database';

export class PhotoService {
  private async getDb(): Promise<Database> {
    return getDatabase();
  }

  private async getUserLikedSet(db: Database, uid: string | null): Promise<Set<string>> {
    if (!uid) return new Set();
    const snap = await db.ref(`likes/byUser/${uid}`).once('value');
    if (!snap.exists()) return new Set();
    return new Set(Object.keys(snap.val() as Record<string, unknown>));
  }

  private async getUsersByUids(db: Database, uids: string[]): Promise<Map<string, User>> {
    const uniqueUids = [...new Set(uids.filter(Boolean))];
    const users = new Map<string, User>();

    await Promise.all(uniqueUids.map(async (uid) => {
      const userSnapshot = await db.ref(`users/${uid}`).once('value');
      if (!userSnapshot.exists()) return;
      users.set(uid, userSnapshot.val() as User);
    }));

    return users;
  }

  private async enrichPhotos(
    db: Database,
    photos: Photo[],
    uid: string | null
  ): Promise<PhotoWithUser[]> {
    if (photos.length === 0) return [];

    const [usersMap, userLikedSet] = await Promise.all([
      this.getUsersByUids(db, photos.map((photo) => photo.uid)),
      this.getUserLikedSet(db, uid),
    ]);

    return photos.flatMap((photo) => {
      const user = usersMap.get(photo.uid);
      if (!user) return [];

      return [{
        photo: {
          ...photo,
          likes: photo.likes || 0,
          views: photo.views || 0,
        },
        user,
        hasLiked: userLikedSet.has(photo.id),
      }];
    });
  }

  private async loadRecentPhotos(db: Database, limit: number): Promise<Photo[]> {
    const snapshot = await db.ref('images/public')
      .orderByChild('createdAt')
      .limitToLast(limit)
      .once('value');

    if (!snapshot.exists()) return [];

    const photos: Photo[] = [];
    snapshot.forEach((child) => {
      const photo = child.val() as Photo;
      photo.id = child.key as string;
      photos.push(photo);
    });
    photos.sort((a, b) => b.createdAt - a.createdAt);
    return photos;
  }

  async getUserByUid(uid: string): Promise<User | null> {
    try {
      const db = await this.getDb();
      const userSnapshot = await db.ref(`users/${uid}`).once('value');
      if (!userSnapshot.exists()) return null;
      return userSnapshot.val() as User;
    } catch (error) {
      console.error(`Error fetching user ${uid}:`, error);
      throw error;
    }
  }

  async checkUserLikedPhoto(uid: string, photoId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      const snap = await db.ref(`likes/byUser/${uid}/${photoId}`).once('value');
      return snap.exists();
    } catch (error) {
      console.error(`Error checking like status:`, error);
      return false;
    }
  }

  async getPhotoLikesCount(photoId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const snap = await db.ref(`images/public/${photoId}/likes`).once('value');
      return snap.exists() ? (snap.val() as number) : 0;
    } catch (error) {
      console.error(`Error getting likes count:`, error);
      return 0;
    }
  }

  async getPhotoViewsCount(photoId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const snap = await db.ref(`images/public/${photoId}/views`).once('value');
      return snap.exists() ? (snap.val() as number) : 0;
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
      const { page, pageSize } = pagination;
      const photos = await this.loadRecentPhotos(db, page * pageSize);
      if (photos.length === 0) return {};

      const categoriesMap: { [key: string]: Photo[] } = {};
      for (const photo of photos) {
        const category = photo.category || 'Other';
        (categoriesMap[category] ||= []).push(photo);
      }

      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const result: CategoriesResponse = {};
      for (const [category, catPhotos] of Object.entries(categoriesMap)) {
        const paginated = catPhotos.slice(startIndex, endIndex);
        if (paginated.length === 0) continue;

        const enriched = await this.enrichPhotos(db, paginated, uid);
        if (enriched.length > 0) result[category] = enriched;
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

      await Promise.all([
        db.ref(`views/${photoId}`).push({
          timestamp: Date.now(),
          photoId,
          uid: photo.uid || '',
        }),
        photoRef.child('views').transaction((current: number | null) => (current || 0) + 1),
      ]);
    } catch (error) {
      console.error('Error incrementing view count:', error);
      throw error;
    }
  }

  async getPhotoById(photoId: string): Promise<Photo | null> {
    try {
      const db = await this.getDb();
      const snapshot = await db.ref(`images/public/${photoId}`).once('value');
      if (!snapshot.exists()) return null;

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
      const { page, pageSize } = pagination;
      const photos = await this.loadRecentPhotos(db, page * pageSize);

      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedPhotos = photos.slice(startIndex, endIndex);

      return this.enrichPhotos(db, paginatedPhotos, uid);
    } catch (error) {
      console.error('Error fetching public photos:', error);
      throw error;
    }
  }
}

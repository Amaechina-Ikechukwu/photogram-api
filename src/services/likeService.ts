import { getDatabase } from '../config/firebase.ts';
import type { User } from '../types/index.ts';
import type { Database } from 'firebase-admin/database';

export class LikeService {
  private async getDb(): Promise<Database> {
    return await getDatabase();
  }

  private async adjustUserTotalLikes(db: Database, ownerId: string, delta: number): Promise<void> {
    if (!ownerId) return;
    await db.ref(`users/${ownerId}/totalLikes`).transaction((current: number | null) => {
      const next = (current || 0) + delta;
      return next < 0 ? 0 : next;
    });
  }

  async toggleLike(uid: string, photoId: string): Promise<{ hasLiked: boolean; message: string }> {
    try {
      const db = await this.getDb();

      const photoRef = db.ref(`images/public/${photoId}`);
      const photoSnapshot = await photoRef.once('value');

      if (!photoSnapshot.exists()) {
        throw new Error('Photo not found');
      }

      const photoOwnerId = (photoSnapshot.val() as { uid?: string }).uid || '';

      const userLikeRef = db.ref(`likes/byUser/${uid}/${photoId}`);
      const existing = await userLikeRef.once('value');

      if (existing.exists()) {
        await Promise.all([
          userLikeRef.remove(),
          db.ref(`likes/byPost/${photoId}/${uid}`).remove(),
          photoRef.child('likes').transaction((c: number | null) => Math.max(0, (c || 0) - 1)),
          this.adjustUserTotalLikes(db, photoOwnerId, -1),
        ]);

        return { hasLiked: false, message: 'Like removed successfully.' };
      }

      const now = Date.now();
      await Promise.all([
        userLikeRef.set(now),
        db.ref(`likes/byPost/${photoId}/${uid}`).set(now),
        photoRef.child('likes').transaction((c: number | null) => (c || 0) + 1),
        this.adjustUserTotalLikes(db, photoOwnerId, 1),
      ]);

      return { hasLiked: true, message: 'Like added successfully.' };
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  async hasUserLikedPhoto(uid: string, photoId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      const snap = await db.ref(`likes/byUser/${uid}/${photoId}`).once('value');
      return snap.exists();
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  }

  async toggleCommentLike(uid: string, commentId: string): Promise<{ hasLiked: boolean; message: string }> {
    try {
      const db = await this.getDb();

      const commentRef = db.ref(`comments/${commentId}`);
      const commentSnapshot = await commentRef.once('value');

      if (!commentSnapshot.exists()) {
        throw new Error('Comment not found');
      }

      const userLikeRef = db.ref(`commentLikes/byUser/${uid}/${commentId}`);
      const existing = await userLikeRef.once('value');

      if (existing.exists()) {
        await Promise.all([
          userLikeRef.remove(),
          db.ref(`commentLikes/byComment/${commentId}/${uid}`).remove(),
          commentRef.child('likesCount').transaction((c: number | null) => Math.max(0, (c || 0) - 1)),
        ]);
        return { hasLiked: false, message: 'Comment like removed successfully.' };
      }

      const now = Date.now();
      await Promise.all([
        userLikeRef.set(now),
        db.ref(`commentLikes/byComment/${commentId}/${uid}`).set(now),
        commentRef.child('likesCount').transaction((c: number | null) => (c || 0) + 1),
      ]);

      return { hasLiked: true, message: 'Comment liked successfully.' };
    } catch (error) {
      console.error('Error toggling comment like:', error);
      throw error;
    }
  }

  async hasUserLikedComment(uid: string, commentId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      const snap = await db.ref(`commentLikes/byUser/${uid}/${commentId}`).once('value');
      return snap.exists();
    } catch (error) {
      console.error('Error checking comment like status:', error);
      return false;
    }
  }
}

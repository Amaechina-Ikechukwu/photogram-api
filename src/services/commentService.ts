import { getDatabase } from '../config/firebase.ts';
import type { Comment, CommentWithUser, User } from '../types/index.ts';
import type { Database } from 'firebase-admin/database';

export class CommentService {
  private async getDb(): Promise<Database> {
    return getDatabase();
  }

  private async getUserCommentLikedSet(db: Database, userId: string | null): Promise<Set<string>> {
    if (!userId) return new Set();
    const snap = await db.ref(`commentLikes/byUser/${userId}`).once('value');
    if (!snap.exists()) return new Set();
    return new Set(Object.keys(snap.val() as Record<string, unknown>));
  }

  async createComment(userId: string, photoId: string, text: string): Promise<Comment> {
    try {
      const db = await this.getDb();
      
      // Check if photo exists
      const photoRef = db.ref(`images/public/${photoId}`);
      const photoSnapshot = await photoRef.once('value');

      if (!photoSnapshot.exists()) {
        throw new Error('Photo not found');
      }

      // Create new comment
      const newCommentRef = db.ref('comments').push();
      const comment: Comment = {
        id: newCommentRef.key as string,
        photoId,
        userId,
        text,
        createdAt: Date.now(),
        likesCount: 0,
      };

      await newCommentRef.set(comment);

      return comment;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async getCommentById(commentId: string): Promise<Comment | null> {
    try {
      const db = await this.getDb();
      const commentSnapshot = await db.ref(`comments/${commentId}`).once('value');
      
      if (!commentSnapshot.exists()) {
        return null;
      }

      return commentSnapshot.val() as Comment;
    } catch (error) {
      console.error('Error getting comment:', error);
      throw error;
    }
  }

  async getPhotoComments(photoId: string, userId: string | null): Promise<CommentWithUser[]> {
    try {
      const db = await this.getDb();
      const commentsSnapshot = await db.ref('comments')
        .orderByChild('photoId')
        .equalTo(photoId)
        .once('value');

      if (!commentsSnapshot.exists()) {
        return [];
      }

      const photoComments = Object.values(commentsSnapshot.val() as Record<string, Comment>)
        .sort((a, b) => b.createdAt - a.createdAt);

      if (photoComments.length === 0) {
        return [];
      }

      const uniqueUserIds = [...new Set(photoComments.map((comment) => comment.userId))];
      const users = new Map<string, User>();

      const [_, userLikedSet] = await Promise.all([
        Promise.all(uniqueUserIds.map(async (uid) => {
          const userSnapshot = await db.ref(`users/${uid}`).once('value');
          if (!userSnapshot.exists()) return;
          users.set(uid, userSnapshot.val() as User);
        })),
        this.getUserCommentLikedSet(db, userId),
      ]);

      return photoComments.flatMap((comment) => {
        const user = users.get(comment.userId);
        if (!user) return [];

        return [{
          comment: {
            ...comment,
            likesCount: comment.likesCount || 0,
          },
          user,
          hasLiked: userLikedSet.has(comment.id),
        }];
      });
    } catch (error) {
      console.error('Error getting photo comments:', error);
      throw error;
    }
  }

  async updateComment(commentId: string, userId: string, text: string): Promise<Comment> {
    try {
      const db = await this.getDb();
      const commentRef = db.ref(`comments/${commentId}`);
      const commentSnapshot = await commentRef.once('value');

      if (!commentSnapshot.exists()) {
        throw new Error('Comment not found');
      }

      const comment = commentSnapshot.val() as Comment;

      // Check if user is the owner of the comment
      if (comment.userId !== userId) {
        throw new Error('Unauthorized to edit this comment');
      }

      await commentRef.update({
        text,
      });

      return {
        ...comment,
        text,
      };
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const commentRef = db.ref(`comments/${commentId}`);
      const commentSnapshot = await commentRef.once('value');

      if (!commentSnapshot.exists()) {
        throw new Error('Comment not found');
      }

      const comment = commentSnapshot.val() as Comment;

      // Check if user is the owner of the comment
      if (comment.userId !== userId) {
        throw new Error('Unauthorized to delete this comment');
      }

      // Delete all likes associated with this comment (denormalized index)
      const byCommentSnap = await db.ref(`commentLikes/byComment/${commentId}`).once('value');
      if (byCommentSnap.exists()) {
        const userIds = Object.keys(byCommentSnap.val() as Record<string, unknown>);
        await Promise.all(userIds.map((likerUid) =>
          db.ref(`commentLikes/byUser/${likerUid}/${commentId}`).remove()
        ));
        await db.ref(`commentLikes/byComment/${commentId}`).remove();
      }

      // Delete the comment
      await commentRef.remove();
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  async getCommentLikesCount(commentId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const snap = await db.ref(`comments/${commentId}/likesCount`).once('value');
      return snap.exists() ? (snap.val() as number) : 0;
    } catch (error) {
      console.error('Error getting comment likes count:', error);
      return 0;
    }
  }

  async hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      const snap = await db.ref(`commentLikes/byUser/${userId}/${commentId}`).once('value');
      return snap.exists();
    } catch (error) {
      console.error('Error checking comment like status:', error);
      return false;
    }
  }
}

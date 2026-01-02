import { getDatabase } from '../config/firebase.ts';
import type { Like, User } from '../types/index.ts';
import type { Database } from 'firebase-admin/database';

export class LikeService {
  private async getDb(): Promise<Database> {
    return await getDatabase();
  }

  async toggleLike(uid: string, photoId: string): Promise<{ hasLiked: boolean; message: string }> {
    try {
      const db = await this.getDb();
      
      // Check if photo exists at images/public/{photoId}
      const photoRef = db.ref(`images/public/${photoId}`);
      const photoSnapshot = await photoRef.once('value');

      if (!photoSnapshot.exists()) {
        throw new Error('Photo not found');
      }

      const photo = photoSnapshot.val();
      const photoOwnerId = photo.uid;

      // Find existing like in flat likes structure
      const likesSnapshot = await db.ref('likes').once('value');
      let existingLikeKey: string | null = null;

      if (likesSnapshot.exists()) {
        likesSnapshot.forEach((child) => {
          const like = child.val();
          if (like.userId === uid && like.postId === photoId) {
            existingLikeKey = child.key;
            return true; // Stop iteration
          }
        });
      }

      if (existingLikeKey) {
        // Unlike - remove like
        await db.ref(`likes/${existingLikeKey}`).remove();

        // Decrement user's total likes
        const userRef = db.ref(`users/${photoOwnerId}`);
        const userSnapshot = await userRef.once('value');
        
        if (userSnapshot.exists()) {
          const user = userSnapshot.val() as User;
          const totalLikes = user.totalLikes || 0;
          
          await userRef.update({
            totalLikes: Math.max(0, totalLikes - 1),
          });
        }

        return {
          hasLiked: false,
          message: 'Like removed successfully.',
        };
      } else {
        // Like - add like with generated ID
        const newLikeRef = db.ref('likes').push();
        const like = {
          id: newLikeRef.key,
          postId: photoId,
          userId: uid
        };

        await newLikeRef.set(like);

        // Increment user's total likes
        const userRef = db.ref(`users/${photoOwnerId}`);
        const userSnapshot = await userRef.once('value');
        
        if (userSnapshot.exists()) {
          const user = userSnapshot.val() as User;
          const totalLikes = user.totalLikes || 0;
          
          await userRef.update({
            totalLikes: totalLikes + 1,
          });
        }

        return {
          hasLiked: true,
          message: 'Like added successfully.',
        };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  async hasUserLikedPhoto(uid: string, photoId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
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
      console.error('Error checking like status:', error);
      return false;
    }
  }

  async toggleCommentLike(uid: string, commentId: string): Promise<{ hasLiked: boolean; message: string }> {
    try {
      const db = await this.getDb();
      
      // Check if comment exists
      const commentRef = db.ref(`comments/${commentId}`);
      const commentSnapshot = await commentRef.once('value');

      if (!commentSnapshot.exists()) {
        throw new Error('Comment not found');
      }

      // Find existing like in flat commentLikes structure
      const commentLikesSnapshot = await db.ref('commentLikes').once('value');
      let existingLikeKey: string | null = null;

      if (commentLikesSnapshot.exists()) {
        commentLikesSnapshot.forEach((child) => {
          const like = child.val();
          if (like.userId === uid && like.commentId === commentId) {
            existingLikeKey = child.key;
            return true; // Stop iteration
          }
        });
      }

      if (existingLikeKey) {
        // Unlike - remove like
        await db.ref(`commentLikes/${existingLikeKey}`).remove();

        return {
          hasLiked: false,
          message: 'Comment like removed successfully.',
        };
      } else {
        // Like - add like with generated ID
        const newLikeRef = db.ref('commentLikes').push();
        const like = {
          id: newLikeRef.key,
          commentId: commentId,
          userId: uid,
          createdAt: Date.now(),
        };

        await newLikeRef.set(like);

        return {
          hasLiked: true,
          message: 'Comment liked successfully.',
        };
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      throw error;
    }
  }

  async hasUserLikedComment(uid: string, commentId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      const commentLikesSnapshot = await db.ref('commentLikes').once('value');
      
      if (!commentLikesSnapshot.exists()) {
        return false;
      }

      let hasLiked = false;
      commentLikesSnapshot.forEach((child) => {
        const like = child.val();
        if (like.userId === uid && like.commentId === commentId) {
          hasLiked = true;
          return true; // Stop iteration
        }
      });

      return hasLiked;
    } catch (error) {
      console.error('Error checking comment like status:', error);
      return false;
    }
  }
}

import { getDatabase } from '../config/firebase.ts';
import type { Comment, CommentWithUser, User } from '../types/index.ts';
import type { Database } from 'firebase-admin/database';

export class CommentService {
  private async getDb(): Promise<Database> {
    return await getDatabase();
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
      const commentsSnapshot = await db.ref('comments').once('value');
      
      if (!commentsSnapshot.exists()) {
        return [];
      }

      const comments: CommentWithUser[] = [];

      for (const child of Object.values(commentsSnapshot.val())) {
        const comment = child as Comment;
        
        if (comment.photoId === photoId) {
          // Get user info
          const userSnapshot = await db.ref(`users/${comment.userId}`).once('value');
          const user = userSnapshot.exists() ? userSnapshot.val() as User : null;

          if (user) {
            // Get likes count for comment
            const likesCount = await this.getCommentLikesCount(comment.id);
            comment.likesCount = likesCount;

            // Check if user has liked this comment
            const hasLiked = userId ? await this.hasUserLikedComment(userId, comment.id) : false;

            comments.push({
              comment,
              user,
              hasLiked,
            });
          }
        }
      }

      // Sort by createdAt descending (newest first)
      comments.sort((a, b) => b.comment.createdAt - a.comment.createdAt);

      return comments;
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

      // Delete all likes associated with this comment
      const commentLikesSnapshot = await db.ref('commentLikes').once('value');
      if (commentLikesSnapshot.exists()) {
        const deletePromises: Promise<void>[] = [];
        commentLikesSnapshot.forEach((child) => {
          const like = child.val();
          if (like.commentId === commentId) {
            deletePromises.push(db.ref(`commentLikes/${child.key}`).remove());
          }
        });
        await Promise.all(deletePromises);
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
      const commentLikesSnapshot = await db.ref('commentLikes').once('value');
      
      if (!commentLikesSnapshot.exists()) {
        return 0;
      }

      let count = 0;
      commentLikesSnapshot.forEach((child) => {
        const like = child.val();
        if (like.commentId === commentId) {
          count++;
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting comment likes count:', error);
      return 0;
    }
  }

  async hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      const commentLikesSnapshot = await db.ref('commentLikes').once('value');
      
      if (!commentLikesSnapshot.exists()) {
        return false;
      }

      let hasLiked = false;
      commentLikesSnapshot.forEach((child) => {
        const like = child.val();
        if (like.userId === userId && like.commentId === commentId) {
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

import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../config/firebase.ts';

export const getUserPhotos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const db = await getDatabase();
    const userImagesRef = db.ref(`users/${uid}/images`);
    const snapshot = await userImagesRef.once('value');

    if (!snapshot.exists()) {
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }

    // Collect all photo IDs
    const photoIds: string[] = [];
    snapshot.forEach((childSnapshot) => {
      photoIds.push(childSnapshot.key as string);
    });

    // Fetch photo details from images/public
    const photos: any[] = [];
    for (const photoId of photoIds) {
      const photoRef = db.ref(`images/public/${photoId}`);
      const photoSnapshot = await photoRef.once('value');
      
      if (photoSnapshot.exists()) {
        const photoData = photoSnapshot.val();
        photos.push({
          id: photoId,
          ...photoData,
        });
      }
    }

    // Sort by createdAt descending
    photos.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPhotos = photos.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedPhotos,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const db = await getDatabase();
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const userData = snapshot.val();

    // Calculate numberOfUploads
    const userImagesRef = db.ref(`users/${uid}/images`);
    const imagesSnapshot = await userImagesRef.once('value');
    const numberOfUploads = imagesSnapshot.exists() ? imagesSnapshot.numChildren() : 0;

    // Get photo IDs to calculate total views and likes
    const photoIds: string[] = [];
    if (imagesSnapshot.exists()) {
      imagesSnapshot.forEach((childSnapshot) => {
        photoIds.push(childSnapshot.key as string);
      });
    }

    // Calculate total views and likes
    let totalViews = 0;
    let totalLikes = 0;

    for (const photoId of photoIds) {
      // Get views for this photo
      const viewsSnapshot = await db.ref(`views/${photoId}`).once('value');
      if (viewsSnapshot.exists()) {
        totalViews += viewsSnapshot.numChildren();
      }
    }

    // Get all likes and count those for user's photos
    const likesSnapshot = await db.ref('likes').once('value');
    if (likesSnapshot.exists()) {
      likesSnapshot.forEach((childSnapshot) => {
        const like = childSnapshot.val();
        if (photoIds.includes(like.postId)) {
          totalLikes++;
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        name: userData.name || null,
        uid: uid,
        email: userData.email,
        numberOfUploads,
        totalViews,
        totalLikes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.uid;
    delete updates.email;

    const db = await getDatabase();
    const userRef = db.ref(`users/${uid}`);
    
    await userRef.update(updates);

    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};

export const requestAccountDeletion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const db = await getDatabase();
    const usersRef = db.ref('users');
    const snapshot = await usersRef.once('value');

    if (!snapshot.exists()) {
      res.status(404).json({
        success: false,
        message: 'No account found with that email',
      });
      return;
    }

    let matchedUid: string | null = null;
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
        matchedUid = childSnapshot.key as string;
      }
    });

    if (!matchedUid) {
      res.status(404).json({
        success: false,
        message: 'No account found with that email',
      });
      return;
    }

    const deletionRef = db.ref(`deletion_requests/${matchedUid}`);
    await deletionRef.set({
      uid: matchedUid,
      email: email.toLowerCase(),
      requestedAt: Date.now(),
      status: 'pending',
    });

    res.status(200).json({
      success: true,
      message: 'Account deletion request recorded. Your account will be reviewed for deletion.',
    });
  } catch (error) {
    next(error);
  }
};

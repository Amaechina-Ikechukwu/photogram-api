import type { Request, Response, NextFunction } from 'express';
import { getDatabase, getAuth } from '../config/firebase.ts';

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

    const photoIds: string[] = [];
    snapshot.forEach((childSnapshot) => {
      photoIds.push(childSnapshot.key as string);
    });

    const photoResults = await Promise.all(photoIds.map(async (photoId) => {
      const photoSnapshot = await db.ref(`images/public/${photoId}`).once('value');
      if (!photoSnapshot.exists()) return null;
      return { id: photoId, ...photoSnapshot.val() };
    }));

    const photos = photoResults
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => b.createdAt - a.createdAt);

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

    const imagesSnapshot = await db.ref(`users/${uid}/images`).once('value');
    const numberOfUploads = imagesSnapshot.exists() ? imagesSnapshot.numChildren() : 0;

    res.status(200).json({
      success: true,
      data: {
        name: userData.name || null,
        uid,
        email: userData.email,
        numberOfUploads,
        totalViews: userData.totalViews || 0,
        totalLikes: userData.totalLikes || 0,
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

    const auth = await getAuth();

    let userRecord: import('firebase-admin').auth.UserRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch {
      res.status(404).json({
        success: false,
        message: 'No account found with that email',
      });
      return;
    }

    const db = await getDatabase();
    const deletionRef = db.ref(`deletion_requests/${userRecord.uid}`);
    await deletionRef.set({
      uid: userRecord.uid,
      email: userRecord.email!.toLowerCase(),
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

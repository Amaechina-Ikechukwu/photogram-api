import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../config/firebase.ts';

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

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: userData,
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

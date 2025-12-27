import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase.ts';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided',
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token format',
      });
      return;
    }

    try {
      const auth = await getAuth();
      const decodedToken = await auth.verifyIdToken(token);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired token',
      });
      return;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
    return;
  }
}

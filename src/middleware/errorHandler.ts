import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index.ts';

export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export function errorHandler(
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);

  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Internal server error';

  const response: ApiResponse = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  };

  res.status(status).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
}

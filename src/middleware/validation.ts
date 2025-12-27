import { Request, Response, NextFunction } from 'express';

export function validatePagination(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  if (page < 1) {
    res.status(400).json({
      success: false,
      message: 'Page must be greater than 0',
    });
    return;
  }

  if (pageSize < 1 || pageSize > 100) {
    res.status(400).json({
      success: false,
      message: 'Page size must be between 1 and 100',
    });
    return;
  }

  req.query.page = page.toString();
  req.query.pageSize = pageSize.toString();

  next();
}

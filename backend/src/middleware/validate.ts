import { Request, Response, NextFunction } from 'express';

/**
 * Validates that required fields exist in the request body.
 */
export function validateBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = requiredFields.filter((f) => {
      const value = req.body[f];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Simple API key authentication middleware.
 */
export function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.API_KEY || 'ms-dev-api-key-change-in-production';

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
    });
    return;
  }

  next();
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@clinical-fire/shared';
import { UnauthorizedError } from './error.handler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw UnauthorizedError('Authorization header is required');
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      throw UnauthorizedError('Token is required');
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // In a real application, you would fetch the full user from database
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      firstName: 'John', // These would come from database
      lastName: 'Doe',
      role: decoded.role as any,
      permissions: [], // These would come from database
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
} 
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '@clinical-fire/shared';
import { BadRequestError, UnauthorizedError } from '../middleware/error.handler';

export class AuthController {
  
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw BadRequestError('Email and password are required');
      }

      // In a real application, you would validate against a database
      // This is a simple mock implementation
      if (email === 'admin@example.com' && password === 'password') {
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const token = jwt.sign(
          { 
            userId: 'user_1', 
            email: email,
            role: 'admin' 
          },
          jwtSecret,
          { expiresIn: '24h' }
        );

        const response: ApiResponse = {
          success: true,
          data: { 
            token,
            user: {
              id: 'user_1',
              email: email,
              role: 'admin'
            }
          },
          timestamp: new Date(),
        };

        res.json(response);
      } else {
        throw UnauthorizedError('Invalid credentials');
      }
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In a real application, you might blacklist the token
      const response: ApiResponse = {
        success: true,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: req.user,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      // In a real application, you would validate the refresh token
      // This is a simple mock implementation
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign(
        { 
          userId: 'user_1', 
          email: 'admin@example.com',
          role: 'admin' 
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      const response: ApiResponse = {
        success: true,
        data: { token },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // In a real application, you would save to database
      const response: ApiResponse = {
        success: true,
        data: {
          id: `user_${Date.now()}`,
          email,
          firstName,
          lastName,
          role,
        },
        timestamp: new Date(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };
} 
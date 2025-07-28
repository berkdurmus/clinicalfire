import { Request, Response, NextFunction } from 'express';
import { Logger } from '@clinical-fire/core';
import { ApiResponse } from '@clinical-fire/shared';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

export function errorHandler(logger: Logger) {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error('API Error occurred', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Handle different error types
    if (error instanceof ApiError) {
      const response: ApiResponse = {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };

      return res.status(error.statusCode).json(response);
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        timestamp: new Date(),
      };

      return res.status(400).json(response);
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid token',
        timestamp: new Date(),
      };

      return res.status(401).json(response);
    }

    if (error.name === 'TokenExpiredError') {
      const response: ApiResponse = {
        success: false,
        error: 'Token expired',
        timestamp: new Date(),
      };

      return res.status(401).json(response);
    }

    // Default error response
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      timestamp: new Date(),
    };

    return res.status(500).json(response);
  };
}

// Helper functions for creating common errors
export const NotFoundError = (message: string = 'Resource not found') =>
  new ApiError(message, 404, 'NOT_FOUND');

export const BadRequestError = (message: string = 'Bad request') =>
  new ApiError(message, 400, 'BAD_REQUEST');

export const UnauthorizedError = (message: string = 'Unauthorized') =>
  new ApiError(message, 401, 'UNAUTHORIZED');

export const ForbiddenError = (message: string = 'Forbidden') =>
  new ApiError(message, 403, 'FORBIDDEN');

export const ConflictError = (message: string = 'Conflict') =>
  new ApiError(message, 409, 'CONFLICT');

export const ValidationError = (message: string = 'Validation failed') =>
  new ApiError(message, 422, 'VALIDATION_ERROR'); 
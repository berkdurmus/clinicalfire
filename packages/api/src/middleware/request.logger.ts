import { Request, Response, NextFunction } from 'express';
import { Logger } from '@clinical-fire/core';

export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log incoming request
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentLength: req.get('Content-Length'),
    });

    // Log response when it finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length'),
      });
    });

    next();
  };
} 
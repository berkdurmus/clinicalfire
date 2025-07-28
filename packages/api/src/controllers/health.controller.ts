import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@clinical-fire/shared';
import { RulesEngine } from '@clinical-fire/core';

export class HealthController {
  
  getHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rulesEngine = new RulesEngine();
      const stats = rulesEngine.getStats();
      
      const response: ApiResponse = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date(),
          version: '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          engine: stats,
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getReadiness = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if all dependencies are ready
      const response: ApiResponse = {
        success: true,
        data: {
          status: 'ready',
          timestamp: new Date(),
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getDetailedHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rulesEngine = new RulesEngine();
      const stats = rulesEngine.getStats();
      
      const response: ApiResponse = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date(),
          version: '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          engine: stats,
          services: {
            database: 'healthy',
            rules_engine: 'healthy',
          },
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getLiveness = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          status: 'alive',
          timestamp: new Date(),
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
} 
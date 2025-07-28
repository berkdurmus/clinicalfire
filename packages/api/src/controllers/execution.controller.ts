import { Request, Response, NextFunction } from 'express';
import { RulesEngine } from '@clinical-fire/core';
import { ApiResponse, ExecutionContext, ExecutionResult } from '@clinical-fire/shared';
import { WorkflowService } from '../services/workflow.service';
import { NotFoundError, BadRequestError } from '../middleware/error.handler';

export class ExecutionController {
  private workflowService: WorkflowService;
  private rulesEngine: RulesEngine;

  constructor() {
    this.workflowService = new WorkflowService();
    this.rulesEngine = new RulesEngine();
  }

  executeWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workflowId } = req.params;
      const { data, triggeredBy } = req.body;

      const workflow = await this.workflowService.getWorkflowById(workflowId);
      if (!workflow) {
        throw NotFoundError('Workflow not found');
      }

      if (!workflow.enabled) {
        throw BadRequestError('Workflow is disabled');
      }

      const context: Omit<ExecutionContext, 'workflowId' | 'executionId'> = {
        triggeredBy: triggeredBy || 'manual_trigger',
        timestamp: new Date(),
        data: data || {},
        userId: req.user?.id,
      };

      const result = await this.rulesEngine.executeWorkflow(workflow, context);

      const response: ApiResponse<ExecutionResult> = {
        success: true,
        data: result,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getExecutionHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This would be implemented with a proper execution history database
      const response: ApiResponse = {
        success: true,
        data: [],
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  triggerExecution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workflowId, data, triggeredBy, patientId, userId } = req.body;

      const workflow = await this.workflowService.getWorkflowById(workflowId);
      if (!workflow) {
        throw NotFoundError('Workflow not found');
      }

      if (!workflow.enabled) {
        throw BadRequestError('Workflow is disabled');
      }

      const context: Omit<ExecutionContext, 'workflowId' | 'executionId'> = {
        triggeredBy: triggeredBy || 'manual_trigger',
        timestamp: new Date(),
        data: data || {},
        patientId: patientId,
        userId: userId || req.user?.id,
      };

      const result = await this.rulesEngine.executeWorkflow(workflow, context);

      const response: ApiResponse<ExecutionResult> = {
        success: true,
        data: result,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  listExecutions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This would be implemented with a proper execution database
      const response: ApiResponse = {
        success: true,
        data: [],
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getExecution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // This would be implemented with a proper execution database
      const response: ApiResponse = {
        success: true,
        data: null,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getExecutionLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // This would be implemented with a proper logging system
      const response: ApiResponse = {
        success: true,
        data: [],
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  retryExecution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // This would be implemented with a proper execution system
      const response: ApiResponse = {
        success: true,
        data: null,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getExecutionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This would be implemented with a proper analytics system
      const response: ApiResponse = {
        success: true,
        data: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
} 
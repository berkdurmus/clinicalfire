import { Request, Response, NextFunction } from 'express';
import { RulesEngine, DSLParser } from '@clinical-fire/core';
import { ApiResponse, PaginatedResponse, Workflow } from '@clinical-fire/shared';
import { WorkflowService } from '../services/workflow.service';
import { NotFoundError, BadRequestError } from '../middleware/error.handler';

export class WorkflowController {
  private workflowService: WorkflowService;
  private dslParser: DSLParser;

  constructor() {
    this.workflowService = new WorkflowService();
    this.dslParser = new DSLParser(new (require('@clinical-fire/core').Logger)());
  }

  listWorkflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const enabled = req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : undefined;

      const result = await this.workflowService.listWorkflows({
        page,
        limit,
        search,
        enabled,
      });

      const response: PaginatedResponse<Workflow> = {
        success: true,
        data: result.workflows,
        pagination: result.pagination,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  createWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowData = req.body;
      const workflow = await this.workflowService.createWorkflow(workflowData, req.user!.id);

      const response: ApiResponse<Workflow> = {
        success: true,
        data: workflow,
        timestamp: new Date(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  getWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.getWorkflowById(id);

      if (!workflow) {
        throw NotFoundError('Workflow not found');
      }

      const response: ApiResponse<Workflow> = {
        success: true,
        data: workflow,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  updateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const workflow = await this.workflowService.updateWorkflow(id, updates, req.user!.id);

      const response: ApiResponse<Workflow> = {
        success: true,
        data: workflow,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.workflowService.deleteWorkflow(id);

      const response: ApiResponse = {
        success: true,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  validateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workflow, format = 'json' } = req.body;
      const validation = this.dslParser.validate(JSON.stringify(workflow), format as 'json' | 'yaml');

      const response: ApiResponse = {
        success: validation.valid,
        data: validation,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  parseWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, format } = req.body;

      let workflow: Workflow;
      if (format === 'yaml') {
        workflow = this.dslParser.parseYaml(content);
      } else {
        workflow = this.dslParser.parseJson(content);
      }

      const response: ApiResponse<Workflow> = {
        success: true,
        data: workflow,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  exportWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const format = (req.query.format as string) || 'yaml';

      const workflow = await this.workflowService.getWorkflowById(id);
      if (!workflow) {
        throw NotFoundError('Workflow not found');
      }

      let content: string;
      let contentType: string;
      let filename: string;

      if (format === 'json') {
        content = this.dslParser.toJson(workflow, true);
        contentType = 'application/json';
        filename = `${workflow.name}-${workflow.version}.json`;
      } else {
        content = this.dslParser.toYaml(workflow);
        contentType = 'application/x-yaml';
        filename = `${workflow.name}-${workflow.version}.yaml`;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      next(error);
    }
  };

  duplicateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const workflow = await this.workflowService.duplicateWorkflow(id, name, req.user!.id);

      const response: ApiResponse<Workflow> = {
        success: true,
        data: workflow,
        timestamp: new Date(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  enableWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.setWorkflowEnabled(id, true);

      const response: ApiResponse<Workflow> = {
        success: true,
        data: workflow,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  disableWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.setWorkflowEnabled(id, false);

      const response: ApiResponse<Workflow> = {
        success: true,
        data: workflow,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
} 
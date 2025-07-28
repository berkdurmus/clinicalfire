import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ExecutionController } from '../controllers/execution.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const executionController = new ExecutionController();

// POST /api/executions/trigger - Trigger workflow execution
router.post(
  '/trigger',
  [
    body('workflowId').notEmpty().withMessage('Workflow ID is required'),
    body('data').isObject().withMessage('Data must be an object'),
    body('patientId').optional().isString(),
    body('userId').optional().isString(),
  ],
  validateRequest,
  executionController.triggerExecution
);

// GET /api/executions - List executions with pagination and filtering
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('workflowId').optional().isString(),
    query('status').optional().isIn(['success', 'failed', 'running']),
    query('patientId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validateRequest,
  executionController.listExecutions
);

// GET /api/executions/:id - Get specific execution
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Execution ID is required')],
  validateRequest,
  executionController.getExecution
);

// GET /api/executions/:id/logs - Get execution logs
router.get(
  '/:id/logs',
  [param('id').notEmpty().withMessage('Execution ID is required')],
  validateRequest,
  executionController.getExecutionLogs
);

// POST /api/executions/:id/retry - Retry failed execution
router.post(
  '/:id/retry',
  [param('id').notEmpty().withMessage('Execution ID is required')],
  validateRequest,
  executionController.retryExecution
);

// GET /api/executions/stats/overview - Get execution statistics
router.get(
  '/stats/overview',
  [
    query('workflowId').optional().isString(),
    query('days').optional().isInt({ min: 1, max: 365 }),
  ],
  validateRequest,
  executionController.getExecutionStats
);

export { router as executionRoutes }; 
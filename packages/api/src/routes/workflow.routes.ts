import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { WorkflowController } from '../controllers/workflow.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const workflowController = new WorkflowController();

// GET /api/workflows - List workflows with pagination and filtering
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('enabled').optional().isBoolean(),
  ],
  validateRequest,
  workflowController.listWorkflows
);

// POST /api/workflows - Create new workflow
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('version').notEmpty().withMessage('Version is required'),
    body('triggers').isArray().withMessage('Triggers must be an array'),
    body('actions').isArray().withMessage('Actions must be an array'),
    body('description').optional().isString(),
    body('enabled').optional().isBoolean(),
  ],
  validateRequest,
  workflowController.createWorkflow
);

// GET /api/workflows/:id - Get specific workflow
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Workflow ID is required')],
  validateRequest,
  workflowController.getWorkflow
);

// PUT /api/workflows/:id - Update workflow
router.put(
  '/:id',
  [
    param('id').notEmpty().withMessage('Workflow ID is required'),
    body('name').optional().notEmpty(),
    body('version').optional().notEmpty(),
    body('triggers').optional().isArray(),
    body('actions').optional().isArray(),
    body('description').optional().isString(),
    body('enabled').optional().isBoolean(),
  ],
  validateRequest,
  workflowController.updateWorkflow
);

// DELETE /api/workflows/:id - Delete workflow
router.delete(
  '/:id',
  [param('id').notEmpty().withMessage('Workflow ID is required')],
  validateRequest,
  workflowController.deleteWorkflow
);

// POST /api/workflows/:id/duplicate - Duplicate workflow
router.post(
  '/:id/duplicate',
  [
    param('id').notEmpty().withMessage('Workflow ID is required'),
    body('name').notEmpty().withMessage('New name is required'),
  ],
  validateRequest,
  workflowController.duplicateWorkflow
);

// POST /api/workflows/:id/enable - Enable workflow
router.post(
  '/:id/enable',
  [param('id').notEmpty().withMessage('Workflow ID is required')],
  validateRequest,
  workflowController.enableWorkflow
);

// POST /api/workflows/:id/disable - Disable workflow
router.post(
  '/:id/disable',
  [param('id').notEmpty().withMessage('Workflow ID is required')],
  validateRequest,
  workflowController.disableWorkflow
);

// POST /api/workflows/validate - Validate workflow definition
router.post(
  '/validate',
  [
    body('workflow').notEmpty().withMessage('Workflow definition is required'),
    body('format').optional().isIn(['json', 'yaml']).withMessage('Format must be json or yaml'),
  ],
  validateRequest,
  workflowController.validateWorkflow
);

// POST /api/workflows/parse - Parse workflow from YAML/JSON
router.post(
  '/parse',
  [
    body('content').notEmpty().withMessage('Content is required'),
    body('format').isIn(['json', 'yaml']).withMessage('Format must be json or yaml'),
  ],
  validateRequest,
  workflowController.parseWorkflow
);

// GET /api/workflows/:id/export - Export workflow as YAML/JSON
router.get(
  '/:id/export',
  [
    param('id').notEmpty().withMessage('Workflow ID is required'),
    query('format').optional().isIn(['json', 'yaml']).withMessage('Format must be json or yaml'),
  ],
  validateRequest,
  workflowController.exportWorkflow
);

export { router as workflowRoutes }; 
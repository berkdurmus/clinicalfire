import { Router, Request, Response } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();
const healthController = new HealthController();

// GET /api/health - Basic health check
router.get('/', healthController.getHealth);

// GET /api/health/detailed - Detailed health check with service status
router.get('/detailed', healthController.getDetailedHealth);

// GET /api/health/readiness - Kubernetes readiness probe
router.get('/readiness', healthController.getReadiness);

// GET /api/health/liveness - Kubernetes liveness probe
router.get('/liveness', healthController.getLiveness);

export { router as healthRoutes }; 
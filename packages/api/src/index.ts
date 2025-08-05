import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { Logger } from '@clinical-fire/core';
import { errorHandler } from './middleware/error.handler';
import { requestLogger } from './middleware/request.logger';
import { authMiddleware } from './middleware/auth.middleware';
import { workflowRoutes } from './routes/workflow.routes';
import { executionRoutes } from './routes/execution.routes';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import { DatabaseService } from './services/database.service';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize logger
const logger = new Logger('info', true);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger(logger));

// API Documentation
try {
  const swaggerPath = path.join(__dirname, '../docs/swagger.yaml');
  const swaggerDocument = YAML.load(swaggerPath);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  logger.info('API documentation available at /api/docs');
} catch (error) {
  logger.warn('Swagger documentation not available', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  // Provide a simple fallback documentation endpoint
  app.get('/api/docs', (req, res) => {
    res.json({
      message: 'API Documentation',
      endpoints: {
        health: 'GET /api/health',
        auth: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
        },
        workflows: {
          list: 'GET /api/workflows',
          create: 'POST /api/workflows',
          get: 'GET /api/workflows/:id',
          update: 'PUT /api/workflows/:id',
          delete: 'DELETE /api/workflows/:id',
        },
        executions: {
          trigger: 'POST /api/executions',
          list: 'GET /api/executions',
        },
      },
    });
  });
}

// Health check route (no auth required)
app.use('/api/health', healthRoutes);

// Authentication routes
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/workflows', authMiddleware, workflowRoutes);
app.use('/api/executions', authMiddleware, executionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Clinical FIRE API',
    version: '1.0.0',
    description: 'Fast Interoperable Rules Engine for healthcare workflows',
    documentation: '/api/docs',
    health: '/api/health',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler(logger));

// Initialize database
async function initializeServer() {
  try {
    // Initialize database
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    logger.info('Database initialized successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Clinical FIRE API server started`, {
        port: PORT,
        environment: NODE_ENV,
        documentation: `http://localhost:${PORT}/api/docs`,
      });
    });
  } catch (error) {
    logger.error('Failed to initialize server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
initializeServer();

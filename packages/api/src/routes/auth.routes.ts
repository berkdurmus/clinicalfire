import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const authController = new AuthController();

// POST /api/auth/login - User login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  authController.login
);

// POST /api/auth/refresh - Refresh access token
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validateRequest,
  authController.refreshToken
);

// POST /api/auth/logout - User logout
router.post('/logout', authController.logout);

// POST /api/auth/register - User registration (admin only)
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').isIn(['admin', 'doctor', 'nurse', 'technician', 'viewer']).withMessage('Valid role is required'),
  ],
  validateRequest,
  authController.register
);

export { router as authRoutes }; 
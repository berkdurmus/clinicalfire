import { z } from 'zod';

// Standard API response wrapper
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
};

// Pagination
export const PaginationSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  total: z.number(),
  totalPages: z.number(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  pagination: PaginationSchema,
  error: z.string().optional(),
  timestamp: z.date(),
});

export type PaginatedResponse<T = any> = {
  success: boolean;
  data: T[];
  pagination: Pagination;
  error?: string;
  timestamp: Date;
};

// Query parameters for filtering
export const QueryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: z.record(z.string()).optional(),
});

export type QueryParams = z.infer<typeof QueryParamsSchema>;

// Authentication
export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.string().default('Bearer'),
});

export type AuthToken = z.infer<typeof AuthTokenSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['admin', 'doctor', 'nurse', 'technician', 'viewer']),
  permissions: z.array(z.string()),
  isActive: z.boolean(),
  lastLoginAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Workflow API types
export const CreateWorkflowRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggers: z.array(z.any()),
  actions: z.array(z.any()),
  enabled: z.boolean().default(true),
});

export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;

export const UpdateWorkflowRequestSchema = CreateWorkflowRequestSchema.partial();

export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowRequestSchema>;

// Workflow execution API types
export const TriggerWorkflowRequestSchema = z.object({
  workflowId: z.string(),
  data: z.record(z.any()),
  patientId: z.string().optional(),
  userId: z.string().optional(),
});

export type TriggerWorkflowRequest = z.infer<typeof TriggerWorkflowRequestSchema>;

// Webhook types
export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.any()),
  timestamp: z.date(),
  source: z.string(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// Error types
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.date(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// Health check
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  timestamp: z.date(),
  services: z.record(z.object({
    status: z.enum(['up', 'down']),
    latency: z.number().optional(),
    error: z.string().optional(),
  })),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>; 
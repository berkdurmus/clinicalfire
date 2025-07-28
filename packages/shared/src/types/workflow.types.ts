import { z } from 'zod';

// Base condition operators
export const ConditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'greater_than_or_equal',
  'less_than_or_equal',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'in',
  'not_in',
  'regex',
  'exists',
  'not_exists',
]);

export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

// Condition schema
export const ConditionSchema = z.object({
  field: z.string(),
  operator: ConditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

export type Condition = z.infer<typeof ConditionSchema>;

// Trigger types
export const TriggerTypeSchema = z.enum([
  'lab_result_received',
  'vital_signs_updated',
  'form_submitted',
  'appointment_scheduled',
  'medication_prescribed',
  'patient_admitted',
  'patient_discharged',
  'alert_created',
  'time_based',
  'manual_trigger',
]);

export type TriggerType = z.infer<typeof TriggerTypeSchema>;

// Trigger schema
export const TriggerSchema = z.object({
  type: TriggerTypeSchema,
  conditions: z.array(ConditionSchema).optional(),
  metadata: z.record(z.any()).optional(),
});

export type Trigger = z.infer<typeof TriggerSchema>;

// Action types
export const ActionTypeSchema = z.enum([
  'notify_doctor',
  'notify_nurse',
  'notify_patient',
  'create_care_plan',
  'schedule_appointment',
  'send_email',
  'send_sms',
  'create_task',
  'update_record',
  'log_event',
  'webhook',
  'api_call',
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

// Action schema
export const ActionSchema = z.object({
  type: ActionTypeSchema,
  params: z.record(z.any()),
  conditions: z.array(ConditionSchema).optional(),
  delay: z.number().optional(), // Delay in milliseconds
});

export type Action = z.infer<typeof ActionSchema>;

// Workflow schema
export const WorkflowSchema = z.object({
  id: z.string().optional(), // Add id field for database workflows
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  triggers: z.array(TriggerSchema),
  actions: z.array(ActionSchema),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// Workflow execution context
export const ExecutionContextSchema = z.object({
  workflowId: z.string(),
  executionId: z.string(),
  triggeredBy: z.string(),
  timestamp: z.date(),
  data: z.record(z.any()),
  patientId: z.string().optional(),
  userId: z.string().optional(),
});

export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

// Execution result
export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  actionResults: z.array(
    z.object({
      actionType: ActionTypeSchema,
      success: z.boolean(),
      result: z.any().optional(),
      error: z.string().optional(),
      duration: z.number(), // milliseconds
    })
  ),
  duration: z.number(), // total execution time in milliseconds
  error: z.string().optional(),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

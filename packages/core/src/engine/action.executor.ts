import { Action, ExecutionContext, ActionType } from '@clinical-fire/shared';
import { Logger } from '../utils/logger';
import { NotificationHandler } from '../actions/notification.handler';
import { CarePlanHandler } from '../actions/careplan.handler';
import { TaskHandler } from '../actions/task.handler';
import { WebhookHandler } from '../actions/webhook.handler';
import { EmailHandler } from '../actions/email.handler';
import { LogHandler } from '../actions/log.handler';

export class ActionExecutor {
  private notificationHandler: NotificationHandler;
  private carePlanHandler: CarePlanHandler;
  private taskHandler: TaskHandler;
  private webhookHandler: WebhookHandler;
  private emailHandler: EmailHandler;
  private logHandler: LogHandler;

  constructor(private logger: Logger) {
    this.notificationHandler = new NotificationHandler(logger);
    this.carePlanHandler = new CarePlanHandler(logger);
    this.taskHandler = new TaskHandler(logger);
    this.webhookHandler = new WebhookHandler(logger);
    this.emailHandler = new EmailHandler(logger);
    this.logHandler = new LogHandler(logger);
  }

  /**
   * Executes a single action
   */
  async executeAction(action: Action, context: ExecutionContext): Promise<any> {
    this.logger.debug(`Executing action: ${action.type}`, {
      executionId: context.executionId,
      actionType: action.type,
      params: action.params,
    });

    // Interpolate variables in action parameters
    const interpolatedParams = this.interpolateVariables(action.params, context);

    switch (action.type) {
      case 'notify_doctor':
      case 'notify_nurse':
      case 'notify_patient':
        return await this.notificationHandler.handle(action.type, interpolatedParams, context);

      case 'create_care_plan':
        return await this.carePlanHandler.handle(interpolatedParams, context);

      case 'schedule_appointment':
        return await this.taskHandler.scheduleAppointment(interpolatedParams, context);

      case 'send_email':
        return await this.emailHandler.handle(interpolatedParams, context);

      case 'send_sms':
        return await this.notificationHandler.sendSms(interpolatedParams, context);

      case 'create_task':
        return await this.taskHandler.createTask(interpolatedParams, context);

      case 'update_record':
        return await this.taskHandler.updateRecord(interpolatedParams, context);

      case 'log_event':
        return await this.logHandler.handle(interpolatedParams, context);

      case 'webhook':
        return await this.webhookHandler.handle(interpolatedParams, context);

      case 'api_call':
        return await this.webhookHandler.makeApiCall(interpolatedParams, context);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Interpolates variables in parameters using context data
   */
  private interpolateVariables(params: Record<string, any>, context: ExecutionContext): Record<string, any> {
    const interpolated = { ...params };

    for (const [key, value] of Object.entries(interpolated)) {
      if (typeof value === 'string') {
        interpolated[key] = this.interpolateString(value, context);
      } else if (typeof value === 'object' && value !== null) {
        interpolated[key] = this.interpolateVariables(value, context);
      }
    }

    return interpolated;
  }

  /**
   * Interpolates variables in a string using {{variable}} syntax
   */
  private interpolateString(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const trimmedVar = variable.trim();
      
      // Check context data first
      if (context.data[trimmedVar] !== undefined) {
        return String(context.data[trimmedVar]);
      }

      // Check context metadata
      if (trimmedVar === 'executionId') return context.executionId;
      if (trimmedVar === 'workflowId') return context.workflowId;
      if (trimmedVar === 'timestamp') return context.timestamp.toISOString();
      if (trimmedVar === 'patientId') return context.patientId || '';
      if (trimmedVar === 'userId') return context.userId || '';

      // Support nested property access
      if (trimmedVar.includes('.')) {
        const value = this.getNestedValue(context.data, trimmedVar);
        return value !== undefined ? String(value) : match;
      }

      this.logger.warn(`Variable not found: ${trimmedVar}`);
      return match; // Return original if variable not found
    });
  }

  /**
   * Gets nested value using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validates action parameters
   */
  validateActionParams(actionType: ActionType, params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (actionType) {
      case 'notify_doctor':
      case 'notify_nurse':
      case 'notify_patient':
        if (!params.message) errors.push('message is required');
        break;

      case 'send_email':
        if (!params.to) errors.push('to is required');
        if (!params.subject) errors.push('subject is required');
        if (!params.body) errors.push('body is required');
        break;

      case 'send_sms':
        if (!params.to) errors.push('to is required');
        if (!params.message) errors.push('message is required');
        break;

      case 'webhook':
      case 'api_call':
        if (!params.url) errors.push('url is required');
        break;

      case 'create_care_plan':
        if (!params.title) errors.push('title is required');
        break;

      case 'schedule_appointment':
        if (!params.patientId) errors.push('patientId is required');
        if (!params.providerId) errors.push('providerId is required');
        if (!params.startTime) errors.push('startTime is required');
        break;

      case 'create_task':
        if (!params.title) errors.push('title is required');
        break;

      case 'log_event':
        if (!params.category) errors.push('category is required');
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
} 
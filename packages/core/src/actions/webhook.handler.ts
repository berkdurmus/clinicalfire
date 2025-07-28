import { ExecutionContext } from '@clinical-fire/shared';
import { Logger } from '../utils/logger';

export class WebhookHandler {
  constructor(private logger: Logger) {}

  async handle(params: Record<string, any>, context: ExecutionContext): Promise<any> {
    this.logger.info('Sending webhook', {
      executionId: context.executionId,
      url: params.url,
    });

    return await this.makeHttpRequest(params, context, 'webhook');
  }

  async makeApiCall(params: Record<string, any>, context: ExecutionContext): Promise<any> {
    this.logger.info('Making API call', {
      executionId: context.executionId,
      url: params.url,
      method: params.method,
    });

    return await this.makeHttpRequest(params, context, 'api_call');
  }

  private async makeHttpRequest(params: Record<string, any>, context: ExecutionContext, type: string): Promise<any> {
    // In a real implementation, this would use fetch or axios
    // For simulation, we'll just return a mock response

    const request = {
      url: params.url,
      method: params.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Clinical-FIRE/1.0',
        ...params.headers,
      },
      body: params.body || {
        workflowId: context.workflowId,
        executionId: context.executionId,
        timestamp: context.timestamp,
        data: context.data,
        patientId: context.patientId,
      },
      timeout: params.timeout || 10000,
    };

    // Simulate network delay
    await this.simulateDelay(params.timeout ? Math.min(params.timeout / 2, 1000) : 500);

    // Simulate response
    const response = {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
      },
      data: {
        success: true,
        message: `${type} executed successfully`,
        receivedAt: new Date().toISOString(),
        processingTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
      },
    };

    this.logger.debug(`${type} response`, {
      executionId: context.executionId,
      status: response.status,
      url: params.url,
    });

    return {
      request: {
        url: request.url,
        method: request.method,
        headers: request.headers,
      },
      response,
      type,
      timestamp: new Date(),
    };
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
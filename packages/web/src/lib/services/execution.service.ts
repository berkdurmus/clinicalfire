import { cognitoService } from '@/lib/services/cognito.service';
import { ENV } from '@/lib/aws.config';

const API_BASE_URL = ENV.API_URL;

interface Execution {
  id: string;
  workflowName: string;
  status: string;
  duration: number;
  startTime: string;
  endTime?: string;
  patientId?: string;
  triggeredBy: string;
  actionResults: any[];
}

class ExecutionService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...cognitoService.getAuthorizationHeader(),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Network error',
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
  }

  async listExecutions(params?: {
    page?: number;
    limit?: number;
    workflowId?: string;
    status?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.workflowId) queryParams.append('workflowId', params.workflowId);
    if (params?.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const endpoint = `/executions${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest(endpoint);
  }

  async getExecution(id: string): Promise<any> {
    return this.makeRequest(`/executions/${id}`);
  }

  async triggerWorkflow(params: {
    workflowId: string;
    patientId?: string;
    triggeredBy?: string;
    triggerType?: string;
    data?: Record<string, any>;
  }): Promise<any> {
    return this.makeRequest('/executions', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: params.workflowId,
        patientId: params.patientId,
        triggeredBy: params.triggeredBy,
        triggerType: params.triggerType || 'manual',
        data: params.data || {},
      }),
    });
  }
}

export const executionService = new ExecutionService();

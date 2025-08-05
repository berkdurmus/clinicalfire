import { cognitoService } from '@/lib/services/cognito.service';
import { ENV } from '@/lib/aws.config';

const API_BASE_URL = ENV.API_URL;

interface Workflow {
  id?: string;
  name: string;
  version: string;
  enabled?: boolean;
  triggers: any[];
  actions: any[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

class WorkflowService {
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

  async listWorkflows(params?: {
    page?: number;
    limit?: number;
    search?: string;
    enabled?: boolean;
  }): Promise<any> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.enabled !== undefined)
      queryParams.append('enabled', params.enabled.toString());

    const queryString = queryParams.toString();
    const endpoint = `/workflows${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest(endpoint);
  }

  async getWorkflow(id: string): Promise<any> {
    return this.makeRequest(`/workflows/${id}`);
  }

  async createWorkflow(workflowData: Partial<Workflow>): Promise<any> {
    return this.makeRequest('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflowData),
    });
  }

  async updateWorkflow(
    id: string,
    workflowData: Partial<Workflow>
  ): Promise<any> {
    return this.makeRequest(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflowData),
    });
  }

  async deleteWorkflow(id: string): Promise<any> {
    return this.makeRequest(`/workflows/${id}`, {
      method: 'DELETE',
    });
  }
}

export const workflowService = new WorkflowService();

import axios from 'axios';
import { PaginatedResponse, ApiResponse } from '@clinical-fire/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Execution {
  id: string;
  workflowName: string;
  success: boolean;
  duration: number;
  startedAt: string;
}

export const executionService = {
  async listExecutions(params: {
    page: number;
    limit: number;
    workflowId?: string;
    status?: string;
  }): Promise<PaginatedResponse<Execution>> {
    const { data } = await axios.get(`${API_BASE_URL}/api/executions`, { params });
    return data;
  },

  async getExecution(id: string): Promise<ApiResponse<Execution>> {
    const { data } = await axios.get(`${API_BASE_URL}/api/executions/${id}`);
    return data;
  },

  async triggerWorkflow(params: {
    workflowId: string;
    data: Record<string, any>;
    patientId?: string;
    userId?: string;
  }): Promise<ApiResponse<Execution>> {
    const { data } = await axios.post(`${API_BASE_URL}/api/executions/trigger`, params);
    return data;
  },
}; 
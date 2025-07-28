import axios from 'axios';
import { Workflow, PaginatedResponse, ApiResponse } from '@clinical-fire/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const workflowService = {
  async listWorkflows(params: {
    page: number;
    limit: number;
    search?: string;
    enabled?: boolean;
  }): Promise<PaginatedResponse<Workflow>> {
    const { data } = await axios.get(`${API_BASE_URL}/api/workflows`, { params });
    return data;
  },

  async getWorkflow(id: string): Promise<ApiResponse<Workflow>> {
    const { data } = await axios.get(`${API_BASE_URL}/api/workflows/${id}`);
    return data;
  },

  async createWorkflow(workflow: Partial<Workflow>): Promise<ApiResponse<Workflow>> {
    const { data } = await axios.post(`${API_BASE_URL}/api/workflows`, workflow);
    return data;
  },

  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<ApiResponse<Workflow>> {
    const { data } = await axios.put(`${API_BASE_URL}/api/workflows/${id}`, workflow);
    return data;
  },

  async deleteWorkflow(id: string): Promise<ApiResponse> {
    const { data } = await axios.delete(`${API_BASE_URL}/api/workflows/${id}`);
    return data;
  },
}; 
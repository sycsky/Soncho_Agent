import { AiWorkflow, CreateWorkflowRequest, UpdateWorkflowRequest, LlmModel, WorkflowCategory, LlmProvider, GenerateWorkflowRequest, GeneratedWorkflow } from '../types/workflow';
import api from './api';

export const workflowApi = {
  // Workflow Management
  getAllWorkflows: async (): Promise<AiWorkflow[]> => {
    return api.get<AiWorkflow[]>('/ai-workflows');
  },

  getWorkflowById: async (id: string): Promise<AiWorkflow> => {
    return api.get<AiWorkflow>(`/ai-workflows/${id}`);
  },

  createWorkflow: async (data: CreateWorkflowRequest): Promise<AiWorkflow> => {
    return api.post<AiWorkflow>('/ai-workflows', data);
  },

  copyWorkflow: async (id: string): Promise<AiWorkflow> => {
    return api.post<AiWorkflow>(`/ai-workflows/${id}/copy`, {});
  },

  updateWorkflow: async (id: string, data: UpdateWorkflowRequest): Promise<AiWorkflow> => {
    return api.put<AiWorkflow>(`/ai-workflows/${id}`, data);
  },

  deleteWorkflow: async (id: string): Promise<void> => {
    return api.delete<void>(`/ai-workflows/${id}`);
  },

  toggleWorkflow: async (id: string, enabled: boolean): Promise<void> => {
    return api.request<void>(`/ai-workflows/${id}/toggle?enabled=${enabled}`, {
      method: 'PATCH',
    });
  },

  setDefaultWorkflow: async (id: string): Promise<void> => {
    return api.post<void>(`/ai-workflows/${id}/set-default`, {});
  },

  getExecutionLogByMessageId: async (messageId: string): Promise<any> => {
    return api.get<any>(`/ai-workflows/execution-log?messageId=${messageId}`);
  },

  validateWorkflow: async (data: { nodesJson: string; edgesJson: string }): Promise<{ valid: boolean; errors: string[] }> => {
    return api.post<{ valid: boolean; errors: string[] }>('/ai-workflows/validate', data);
  },

  previewEl: async (data: { nodesJson: string; edgesJson: string }): Promise<{ success: boolean; el: string; error: string | null }> => {
    return api.post<{ success: boolean; el: string; error: string | null }>('/ai-workflows/preview-el', data);
  },

  generateWorkflow: async (data: GenerateWorkflowRequest): Promise<GeneratedWorkflow> => {
    return api.post<GeneratedWorkflow>('/workflow-generator/generate', data);
  },

  // Category Management
  getAvailableCategories: async (): Promise<WorkflowCategory[]> => {
    return api.get<WorkflowCategory[]>('/ai-workflows/available-categories');
  },

  getAvailableCategoriesForWorkflow: async (workflowId: string): Promise<WorkflowCategory[]> => {
    return api.get<WorkflowCategory[]>(`/ai-workflows/${workflowId}/available-categories`);
  },

  getWorkflowCategories: async (workflowId: string): Promise<string[]> => {
    return api.get<string[]>(`/ai-workflows/${workflowId}/categories`);
  },

  updateWorkflowCategories: async (workflowId: string, categoryIds: string[]): Promise<void> => {
    return api.put<void>(`/ai-workflows/${workflowId}/categories`, { categoryIds });
  },

  // LLM Model Management
  getAllModels: async (): Promise<LlmModel[]> => {
    return api.get<LlmModel[]>('/llm-models');
  },

  getEnabledModels: async (): Promise<LlmModel[]> => {
    return api.get<LlmModel[]>('/llm-models/enabled');
  },

  getLlmProviders: async (): Promise<LlmProvider[]> => {
    return api.get<LlmProvider[]>('/llm-models/providers');
  },

  createLlmModel: async (data: Partial<LlmModel>): Promise<LlmModel> => {
    return api.post<LlmModel>('/llm-models', data);
  },

  updateLlmModel: async (id: string, data: Partial<LlmModel>): Promise<LlmModel> => {
    return api.put<LlmModel>(`/llm-models/${id}`, data);
  },

  deleteLlmModel: async (id: string): Promise<void> => {
    return api.delete<void>(`/llm-models/${id}`);
  },

  testLlmModel: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>(`/llm-models/${id}/test`, {});
  },

  enhanceSystemPrompt: async (data: { nodeType: string; toolIds?: string[]; userInput: string }): Promise<{ systemPrompt: string }> => {
    // Note: Backend endpoint has been moved to /api/v1/system-prompt/enhance to support this unified API call
    return api.post<{ systemPrompt: string }>('/system-prompt/enhance', data);
  }
};

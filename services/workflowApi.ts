import { AiWorkflow, CreateWorkflowRequest, UpdateWorkflowRequest, LlmModel, WorkflowCategory, LlmProvider, GenerateWorkflowRequest, GeneratedWorkflow } from '../types/workflow';
import { BASE_URL } from '../config';

const API_BASE = `${BASE_URL}/api/v1`;

const getToken = (): string | null => {
  try {
    return localStorage.getItem('nexus_token');
  } catch (error) {
    console.error("Could not access localStorage:", error);
    return null;
  }
};

const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || `HTTP Error ${response.status}`);
    } catch (e) {
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }
  }

  const json = await response.json();
  
  // Check if the response is wrapped in a standard API response format
  // Expected format: { code: number, message: string, data: T, success: boolean }
  if (json && typeof json === 'object' && 'data' in json && 'code' in json) {
    if (json.success === false) {
      throw new Error(json.message || 'API request failed');
    }
    return json.data as T;
  }

  return json as T;
};

export const workflowApi = {
  // Workflow Management
  getAllWorkflows: async (): Promise<AiWorkflow[]> => {
    const response = await fetch(`${API_BASE}/ai-workflows`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<AiWorkflow[]>(response);
  },

  getWorkflowById: async (id: string): Promise<AiWorkflow> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<AiWorkflow>(response);
  },

  createWorkflow: async (data: CreateWorkflowRequest): Promise<AiWorkflow> => {
    const response = await fetch(`${API_BASE}/ai-workflows`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AiWorkflow>(response);
  },

  copyWorkflow: async (id: string): Promise<AiWorkflow> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${id}/copy`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<AiWorkflow>(response);
  },

  updateWorkflow: async (id: string, data: UpdateWorkflowRequest): Promise<AiWorkflow> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AiWorkflow>(response);
  },

  deleteWorkflow: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  toggleWorkflow: async (id: string, enabled: boolean): Promise<void> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${id}/toggle?enabled=${enabled}`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  setDefaultWorkflow: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${id}/set-default`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getExecutionLogByMessageId: async (messageId: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/ai-workflows/execution-log?messageId=${messageId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<any>(response);
  },

  validateWorkflow: async (data: { nodesJson: string; edgesJson: string }): Promise<{ valid: boolean; errors: string[] }> => {
    const response = await fetch(`${API_BASE}/ai-workflows/validate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ valid: boolean; errors: string[] }>(response);
  },

  previewEl: async (data: { nodesJson: string; edgesJson: string }): Promise<{ success: boolean; el: string; error: string | null }> => {
    const response = await fetch(`${API_BASE}/ai-workflows/preview-el`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; el: string; error: string | null }>(response);
  },

  generateWorkflow: async (data: GenerateWorkflowRequest): Promise<GeneratedWorkflow> => {
    const response = await fetch(`${API_BASE}/workflow-generator/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<GeneratedWorkflow>(response);
  },

  // Category Management
  getAvailableCategories: async (): Promise<WorkflowCategory[]> => {
    const response = await fetch(`${API_BASE}/ai-workflows/available-categories`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<WorkflowCategory[]>(response);
  },

  getAvailableCategoriesForWorkflow: async (workflowId: string): Promise<WorkflowCategory[]> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${workflowId}/available-categories`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<WorkflowCategory[]>(response);
  },

  getWorkflowCategories: async (workflowId: string): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${workflowId}/categories`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<string[]>(response);
  },

  updateWorkflowCategories: async (workflowId: string, categoryIds: string[]): Promise<void> => {
    const response = await fetch(`${API_BASE}/ai-workflows/${workflowId}/categories`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ categoryIds }),
    });
    return handleResponse<void>(response);
  },

  // LLM Model Management
  getAllModels: async (): Promise<LlmModel[]> => {
    const response = await fetch(`${API_BASE}/llm-models`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<LlmModel[]>(response);
  },

  getEnabledModels: async (): Promise<LlmModel[]> => {
    const response = await fetch(`${API_BASE}/llm-models/enabled`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<LlmModel[]>(response);
  },

  getLlmProviders: async (): Promise<LlmProvider[]> => {
    const response = await fetch(`${API_BASE}/llm-models/providers`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<LlmProvider[]>(response);
  },

  createLlmModel: async (data: Partial<LlmModel>): Promise<LlmModel> => {
    const response = await fetch(`${API_BASE}/llm-models`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<LlmModel>(response);
  },

  updateLlmModel: async (id: string, data: Partial<LlmModel>): Promise<LlmModel> => {
    const response = await fetch(`${API_BASE}/llm-models/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<LlmModel>(response);
  },

  deleteLlmModel: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/llm-models/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  testLlmModel: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE}/llm-models/${id}/test`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ success: boolean; message: string }>(response);
  },

  enhanceSystemPrompt: async (data: { nodeType: string; toolIds?: string[]; userInput: string }): Promise<{ systemPrompt: string }> => {
    // The user specified /api/system-prompt/enhance, which might not be under /api/v1
    // We'll try to follow the convention. If BASE_URL ends with /, we remove it or handle it.
    // BASE_URL is likely the host.
    const response = await fetch(`${BASE_URL}/api/system-prompt/enhance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ systemPrompt: string }>(response);
  }
};

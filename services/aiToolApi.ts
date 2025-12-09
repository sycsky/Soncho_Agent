import api from './api';
import { AiTool, CreateAiToolRequest, UpdateAiToolRequest, AiToolExecuteRequest, AiToolExecuteResponse } from '../types/aiTool';

const aiToolApi = {
  // Get all tools
  getTools: (keyword?: string) => {
    const url = keyword ? `/tools?keyword=${encodeURIComponent(keyword)}` : '/tools';
    return api.get<AiTool[]>(url);
  },

  // Get tool by ID
  getTool: (id: string) => {
    return api.get<AiTool>(`/tools/${id}`);
  },

  // Create tool
  createTool: (data: CreateAiToolRequest) => {
    return api.post<AiTool>('/tools', data);
  },

  // Update tool
  updateTool: (id: string, data: UpdateAiToolRequest) => {
    return api.put<AiTool>(`/tools/${id}`, data);
  },

  // Delete tool
  deleteTool: (id: string) => {
    return api.delete<void>(`/tools/${id}`);
  },

  // Execute tool
  executeTool: (id: string, data: AiToolExecuteRequest) => {
    return api.post<AiToolExecuteResponse>(`/tools/${id}/execute`, data);
  },

  // Get tool definitions (for LLM)
  getToolDefinitions: () => {
    return api.get<any>('/tools/definitions');
  },

  // Get OpenAI format definitions
  getOpenAiDefinitions: () => {
    return api.get<any>('/tools/definitions/openai');
  }
};

export default aiToolApi;

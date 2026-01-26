import api from './api';
import { WorkflowTestSessionDto } from '../types/workflowTest';

const BASE_PATH = '/workflow-test/sessions';

const createSession = (workflowId: string, variables?: Record<string, any>): Promise<WorkflowTestSessionDto> => {
  return api.post<WorkflowTestSessionDto>(BASE_PATH, {
    workflowId,
    variables
  });
};

const sendMessage = (testSessionId: string, message: string, workflowId?: string): Promise<WorkflowTestSessionDto> => {
  return api.post<WorkflowTestSessionDto>(`${BASE_PATH}/${testSessionId}/messages`, {
    message,
    workflowId
  });
};

const getSession = (testSessionId: string): Promise<WorkflowTestSessionDto> => {
  return api.get<WorkflowTestSessionDto>(`${BASE_PATH}/${testSessionId}`);
};

const clearHistory = (testSessionId: string): Promise<WorkflowTestSessionDto> => {
  return api.post<WorkflowTestSessionDto>(`${BASE_PATH}/${testSessionId}/clear`, {});
};

const deleteSession = (testSessionId: string): Promise<void> => {
  return api.delete<void>(`${BASE_PATH}/${testSessionId}`);
};

const updateVariables = (testSessionId: string, variables: Record<string, any>): Promise<WorkflowTestSessionDto> => {
  return api.put<WorkflowTestSessionDto>(`${BASE_PATH}/${testSessionId}/variables`, variables);
};

const getAllSessions = (): Promise<WorkflowTestSessionDto[]> => {
  return api.get<WorkflowTestSessionDto[]>(BASE_PATH);
};

export default {
  createSession,
  sendMessage,
  getSession,
  clearHistory,
  deleteSession,
  updateVariables,
  getAllSessions
};

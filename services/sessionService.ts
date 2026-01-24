import api from './api';
import { Agent } from '../types';

const getAvailableAgents = (sessionId: string): Promise<Agent[]> => {
  return api.get<Agent[]>(`/chat/sessions/${sessionId}/available-agents`);
};

const assignSupportAgent = (sessionId: string, agentId: string): Promise<void> => {
  return api.post<void>(`/chat/sessions/${sessionId}/agents/${agentId}`, {});
};

const removeSupportAgent = (sessionId: string, agentId: string): Promise<void> => {
  return api.delete<void>(`/chat/sessions/${sessionId}/agents/${agentId}`);
};

const getMentionableAgents = (sessionId: string): Promise<Agent[]> => {
  return api.get<Agent[]>(`/chat/sessions/${sessionId}/other-agents`);
};

const getTransferableAgents = (sessionId: string): Promise<Agent[]> => {
  return api.get<Agent[]>(`/chat/sessions/${sessionId}/transferable-agents`);
};

const transferSession = (
  sessionId: string,
  targetAgentId: string,
  keepAsSupport: boolean = false
): Promise<void> => {
  return api.post<void>(`/chat/sessions/${sessionId}/transfer`, {
    targetAgentId,
    keepAsSupport,
  });
};


// Types for Session Summary
export interface SessionSummaryPreview {
  success: boolean;
  summary: string;
  errorMessage: string | null;
  messageCount: number;
}

export interface SessionResolveResponse {
  session: any; // Using any for now to match existing loose typing, or import ChatSession
  summaryMessage: any; // Using any for now, or import Message
}

const previewSessionSummary = (sessionId: string, language?: string): Promise<SessionSummaryPreview> => {
  return api.get<SessionSummaryPreview>(`/chat/sessions/${sessionId}/summary/preview${language ? `?language=${language}` : ''}`);
};

const resolveSession = (sessionId: string, language?: string): Promise<SessionResolveResponse> => {
  return api.post<SessionResolveResponse>(`/chat/sessions/${sessionId}/resolve${language ? `?language=${language}` : ''}`, {});
};

export default {
  getAvailableAgents,
  assignSupportAgent,
  removeSupportAgent,
  getMentionableAgents,
  getTransferableAgents,
  transferSession,
  previewSessionSummary,
  resolveSession,
};

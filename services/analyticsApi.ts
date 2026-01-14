import api from './api';

export interface AnalyticsSummary {
  totalConversations: number;
  aiHandledCount: number;
  humanHandledCount: number;
  totalMessages: number;
  aiMessages: number;
  humanMessages: number;
  orderActions: Record<string, number>;
  topTags: Record<string, number>;
  sessionStatusDistribution: Record<string, number>;
}

export interface AnalyticsTrendItem {
  date: string;
  conversations: number;
  aiMessages: number;
  humanMessages: number;
}

export const analyticsApi = {
  getSummary: (start: string, end: string) => {
    return api.get<AnalyticsSummary>(`/analytics/summary?start=${start}&end=${end}`);
  },
  
  getTrend: (start: string, end: string) => {
    return api.get<AnalyticsTrendItem[]>(`/analytics/trend?start=${start}&end=${end}`);
  }
};

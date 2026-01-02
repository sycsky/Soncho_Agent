import api from './api';

export interface DashboardMetrics {
  totalConversations: number;
  activeAgents: number;
  pendingActions: number;
  aiResolutionRate: number;
  avgResponseTime: string;
  customerSatisfaction: number;
}

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  // TODO: Replace with real API call when backend is ready
  // return api.get<DashboardMetrics>('/dashboard/metrics');
  
  // Mock data for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalConversations: 128,
        activeAgents: 3,
        pendingActions: 5,
        aiResolutionRate: 68,
        avgResponseTime: '1.2m',
        customerSatisfaction: 4.8
      });
    }, 800);
  });
};

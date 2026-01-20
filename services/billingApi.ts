import api from './api';

export interface Subscription {
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  aiUsage: number;
  seatUsage: number;
  cancelAtPeriodEnd?: boolean;
  
  // Feature flags
  supportAnalyticsHistory: boolean;
  supportAdvancedAnalytics: boolean;
  supportMagicRewrite: boolean;
  supportSmartSummary: boolean;
  supportAiTags: boolean;
}

export const billingApi = {
  getCurrentSubscription: () => {
    return api.get<Subscription>('/billing/current');
  },
  
  changePlan: (plan: string) => {
    return api.post('/billing/change-plan', { plan });
  }
};

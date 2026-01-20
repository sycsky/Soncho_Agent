import api from './api';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'EVERY_30_DAYS' | 'ANNUAL';
  currency: string;
  features: string[];
  recommended?: boolean;
  trialDaysRemaining?: number;
}

export const SHOPIFY_PLANS: PricingPlan[] = [
  {
    id: 'FREE',
    name: 'Free Starter',
    price: 0,
    interval: 'EVERY_30_DAYS',
    currency: 'USD',
    features: [
      'Up to 50 conversations/month',
      'Basic AI Agent',
      'Email Support',
      'Standard Dashboard'
    ]
  },
  {
    id: 'BASIC',
    name: 'Basic Growth',
    price: 19,
    interval: 'EVERY_30_DAYS',
    currency: 'USD',
    features: [
      '500 conversations/month',
      'Magic Rewrite',
      'Historical Analytics',
      '3 Team Seats'
    ]
  },
  {
    id: 'PRO',
    name: 'Pro Business',
    price: 59,
    interval: 'EVERY_30_DAYS',
    currency: 'USD',
    features: [
      '2000 conversations/month',
      'Advanced Analytics & Sentiment',
      'Smart Summary & AI Tags',
      '10 Team Seats',
      'Priority Support'
    ],
    recommended: true
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise Scale',
    price: 199,
    interval: 'EVERY_30_DAYS',
    currency: 'USD',
    features: [
      'Unlimited conversations',
      'Unlimited Team Seats',
      'Dedicated Account Manager',
      'SLA Guarantee'
    ]
  }
];

export interface SubscriptionStatus {
  active: boolean;
  planId?: string;
  trialDaysRemaining?: number;
}

const API_BASE = '/shopify/billing';

export const checkSubscriptionStatus = async (shop: string): Promise<SubscriptionStatus> => {
  try {
    const data = await api.get<SubscriptionStatus>(`${API_BASE}/current?shop=${encodeURIComponent(shop)}`);
    console.log('[ShopifyBilling] checkSubscriptionStatus response:', data);
    return data;
  } catch (error) {
    console.error('[ShopifyBilling] Failed to check subscription status:', error);
    return { active: false };
  }
};

export const createSubscription = async (shop: string, planId: string): Promise<{ confirmationUrl: string }> => {
  try {
    // Append plan_id to returnUrl so we can detect it when redirected back
    // Use URL object to safely append params
    const returnUrlObj = new URL(window.location.href);
    returnUrlObj.searchParams.set('plan_id', planId);
    const returnUrl = returnUrlObj.toString();
    
    return await api.post<{ confirmationUrl: string }>(`${API_BASE}/subscription?shop=${encodeURIComponent(shop)}`, {
      planId,
      returnUrl
    });
  } catch (error) {
    console.error('Failed to create subscription:', error);
    throw error;
  }
};

export const verifySubscription = async (shop: string, chargeId: string, planId: string): Promise<boolean> => {
  try {
    const response = await api.post<{ success: boolean }>(`${API_BASE}/verify?shop=${encodeURIComponent(shop)}`, {
      chargeId,
      planId
    });
    return response.success;
  } catch (error) {
    console.error('Failed to verify subscription:', error);
    return false;
  }
};

export const cancelSubscription = async (shop: string): Promise<boolean> => {
  try {
    await api.post(`${API_BASE}/cancel?shop=${encodeURIComponent(shop)}`, {});
    return true;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return false;
  }
};

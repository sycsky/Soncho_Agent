
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
    id: 'PLAN_FREE',
    name: 'Free Tier',
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
    id: 'PLAN_PRO',
    name: 'Pro',
    price: 29,
    interval: 'EVERY_30_DAYS',
    currency: 'USD',
    features: [
      'Unlimited conversations',
      'Advanced AI Agent (GPT-4)',
      'Priority Chat Support',
      'Advanced Analytics',
      'Custom Branding'
    ],
    recommended: true
  },
  {
    id: 'PLAN_ENTERPRISE',
    name: 'Enterprise',
    price: 99,
    interval: 'EVERY_30_DAYS',
    currency: 'USD',
    features: [
      'Dedicated Account Manager',
      'Custom AI Training',
      'API Access',
      'SLA Guarantee',
      'Multi-store Support'
    ]
  }
];

export interface SubscriptionStatus {
  active: boolean;
  planId?: string;
  trialDaysRemaining?: number;
}

// Mock storage key
const SUBSCRIPTION_KEY = 'shopify_app_subscription';

export const checkSubscriptionStatus = async (shop: string): Promise<SubscriptionStatus> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const storedSub = localStorage.getItem(`${SUBSCRIPTION_KEY}_${shop}`);
  
  if (storedSub) {
    return JSON.parse(storedSub);
  }

  // Default to inactive for new users
  return { active: false };
};

export const createSubscription = async (shop: string, planId: string): Promise<{ confirmationUrl: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  console.log(`Creating subscription for ${shop} on plan ${planId}`);

  // In a real app, this would call your backend to create a recurring application charge
  // and return the confirmation_url from Shopify.
  
  // For this demo, we'll simulate a successful charge flow by returning a mock URL
  // The App would redirect here, user approves, then Shopify redirects back to your app
  
  return {
    confirmationUrl: `/?shop=${shop}&charge_id=mock_charge_123&plan_id=${planId}&confirm_billing=true`
  };
};

export const verifySubscription = async (shop: string, chargeId: string, planId: string): Promise<boolean> => {
    // Simulate verifying the charge with backend
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Save mock subscription
    const status: SubscriptionStatus = {
        active: true,
        planId: planId,
        trialDaysRemaining: 7
    };
    
    localStorage.setItem(`${SUBSCRIPTION_KEY}_${shop}`, JSON.stringify(status));
    return true;
};

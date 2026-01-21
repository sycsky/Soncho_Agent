import React, { useEffect, useState } from 'react';
import { billingApi, Subscription } from '../../services/billingApi';
import { createSubscription, cancelSubscription } from '../../services/shopifyBillingService';
import { getShopifyLaunchParams } from '../../services/shopifyAuthService';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const BillingSettings: React.FC = () => {
  const { t } = useTranslation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Shopify Integration
  const { shop } = getShopifyLaunchParams();

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const data = await billingApi.getCurrentSubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (plan: string) => {
    if (!shop) {
        toast.error('Shopify shop context missing');
        return;
    }
    
    // For Free plan, we might just update backend directly if desired, 
    // but consistent flow is to redirect via shopifyBillingService 
    // which handles the redirect logic.
    if (confirm(t('billing.switch_confirm', { plan }))) {
        setUpgrading(true);
        try {
            // Use Shopify Billing Flow
            const { confirmationUrl } = await createSubscription(shop, plan);
            
            // Redirect logic:
            // 1. If we are in an embedded iframe, we cannot redirect to admin.shopify.com directly due to X-Frame-Options: deny
            // 2. We must use App Bridge Redirect action or window.top.location if permitted.
            // 3. However, Shopify App Bridge is the standard way.
            
            // Assuming we are using App Bridge via @shopify/app-bridge-react or similar context
            // But here we are in a standard React component.
            // If confirmationUrl is on admin.shopify.com (standard billing), we MUST break out of the iframe.
            
            if (confirmationUrl) {
                // Check if it's a full URL (Shopify) or relative (Mock)
                const isFullUrl = confirmationUrl.startsWith('http');
                
                if (isFullUrl && window.top && window.top !== window.self) {
                    // We are in an iframe, break out!
                    // Using window.open with _top is one way, or setting window.top.location
                    window.top.location.href = confirmationUrl;
                } else {
                    // Standard redirect
                    window.location.href = confirmationUrl;
                }
            }
        } catch (error) {
            console.error('Failed to initiate plan change:', error);
            toast.error(t('billing.switch_failed'));
            setUpgrading(false);
        }
    }
  };

  const handleCancelSubscription = async () => {
    if (!shop) {
        toast.error('Shopify shop context missing');
        return;
    }
    
    if (confirm(t('billing.cancel_confirm', 'Are you sure you want to cancel your subscription? You will retain access until the end of the current billing period.'))) {
        setCancelling(true);
        try {
            const success = await cancelSubscription(shop);
            if (success) {
                toast.success(t('billing.cancel_success', 'Subscription cancelled successfully'));
                fetchSubscription();
            } else {
                toast.error(t('billing.cancel_failed', 'Failed to cancel subscription'));
            }
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            toast.error(t('billing.cancel_failed', 'Failed to cancel subscription'));
        } finally {
            setCancelling(false);
        }
    }
  };

  if (loading) return <div>{t('billing.loading')}</div>;

  const plans = [
    { name: 'FREE', price: '$0', aiLimit: 50, seats: 1, features: ['billing.features.basic_analytics', 'billing.features.order_view'] },
    { name: 'BASIC', price: '$19', aiLimit: 500, seats: 3, features: ['billing.features.magic_rewrite', 'billing.features.email_support'] },
    { name: 'PRO', price: '$59', aiLimit: 2000, seats: 10, features: ['billing.features.advanced_analytics', 'billing.features.smart_summary', 'billing.features.ai_tags', 'billing.features.priority_support'] },
    { name: 'ENTERPRISE', price: '$199', aiLimit: 'Unlimited', seats: 'Unlimited', features: ['billing.features.dedicated_manager', 'billing.features.all_features'] },
  ];

  const getUsagePercentage = (usage: number, limit: number | string) => {
    if (limit === 'Unlimited') return 0;
    return Math.min((usage / (limit as number)) * 100, 100);
  };

  const currentPlan = plans.find(p => p.name === subscription?.plan) || plans[0];
  const isFreePlan = (plan?: string) => !plan || plan.toUpperCase() === 'FREE';

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-xl font-semibold mb-4">{t('billing.current_subscription')}</h2>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="text-sm text-gray-500 uppercase font-bold tracking-wide">{subscription?.plan} {t('billing.plan')}</div>
                        <div className="text-3xl font-bold mt-1">{subscription?.status}</div>
                        <div className="text-sm text-gray-500 mt-1">
                            {!isFreePlan(subscription?.plan) && subscription?.cancelAtPeriodEnd 
                                ? <span className="text-red-500 font-medium">{t('billing.cancels_on')} {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}</span>
                                : <span>{t('billing.renews_on')} {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}</span>
                            }
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${!isFreePlan(subscription?.plan) && subscription?.cancelAtPeriodEnd ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        {!isFreePlan(subscription?.plan) && subscription?.cancelAtPeriodEnd ? t('billing.cancelling') : t('billing.current_tag')}
                    </div>
                </div>

                {!subscription?.cancelAtPeriodEnd && !isFreePlan(subscription?.plan) && (
                    <div className="flex justify-end mb-6">
                        <button 
                            onClick={handleCancelSubscription}
                            disabled={cancelling}
                            className="text-sm text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                        >
                            {cancelling ? <Loader2 className="animate-spin inline mr-1" size={14} /> : null}
                            {t('billing.cancel_subscription', 'Cancel Subscription')}
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>{t('billing.ai_usage')}</span>
                            <span className="font-medium">{subscription?.aiUsage} / {currentPlan.aiLimit}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${getUsagePercentage(subscription?.aiUsage || 0, currentPlan.aiLimit)}%` }}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>{t('billing.seat_usage')}</span>
                            <span className="font-medium">{subscription?.seatUsage} / {currentPlan.seats}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                style={{ width: `${getUsagePercentage(subscription?.seatUsage || 0, currentPlan.seats)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-xl font-semibold mb-4">{t('billing.available_plans')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((plan) => (
                    <div key={plan.name} className={`bg-white p-6 rounded-xl border ${subscription?.plan === plan.name ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'} shadow-sm flex flex-col`}>
                        <div className="mb-4">
                            <h3 className="font-bold text-lg">{plan.name}</h3>
                            <div className="text-2xl font-bold mt-2">{plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></div>
                        </div>
                        <ul className="space-y-2 mb-6 flex-1">
                            <li className="flex items-center text-sm gap-2">
                                <Check size={16} className="text-green-500" />
                                {plan.aiLimit} AI Chats
                            </li>
                            <li className="flex items-center text-sm gap-2">
                                <Check size={16} className="text-green-500" />
                                {plan.seats} Seats
                            </li>
                            {plan.features.map((f, i) => (
                                <li key={i} className="flex items-center text-sm gap-2 text-gray-600">
                                    <Check size={16} className="text-green-500" />
                                    {t(f)}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handlePlanChange(plan.name)}
                            disabled={subscription?.plan === plan.name || upgrading}
                            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                                subscription?.plan === plan.name 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                            }`}
                        >
                            {subscription?.plan === plan.name ? t('billing.current_plan') : upgrading ? <Loader2 className="animate-spin mx-auto" size={16}/> : t('billing.upgrade')}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

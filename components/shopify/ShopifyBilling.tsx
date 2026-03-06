import React, { useState, useEffect } from 'react';
import { Page, Layout, Card, BlockStack, Text, Button, Grid, Box, Badge, Banner, Divider, InlineStack } from '@shopify/polaris';
import { CheckIcon, CalendarIcon } from '@shopify/polaris-icons';
import { useTranslation } from 'react-i18next';
import { SHOPIFY_PLANS, createSubscription, PricingPlan } from '../../services/shopifyBillingService';
import { billingApi, Subscription } from '../../services/billingApi';

interface ShopifyBillingProps {
  shop: string;
}

export const ShopifyBilling: React.FC<ShopifyBillingProps> = ({ shop }) => {
  const { t } = useTranslation();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await billingApi.getCurrentSubscription();
        setSubscription(response.data);
      } catch (err) {
        console.error('Failed to fetch subscription', err);
      } finally {
        setLoadingSubscription(false);
      }
    };

    if (shop) {
      fetchSubscription();
    }
  }, [shop]);

  const handleSelectPlan = async (plan: PricingPlan) => {
    setLoadingPlanId(plan.id);
    setError(null);
    
    try {
      const { confirmationUrl } = await createSubscription(shop, plan.id);
      // In a real app with App Bridge, you might use Redirect action
      // Here we just use window.location for the mock flow
      window.location.href = confirmationUrl;
    } catch (err) {
      setError('Failed to initiate billing. Please try again.');
      setLoadingPlanId(null);
    }
  };

  const renderCurrentSubscription = () => {
    if (!subscription) return null;

    const hasNextPlan = subscription.nextPlan && subscription.nextBillingDate;

    return (
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">{t('subscription.subscription_details', 'Subscription Details')}</Text>
            
            <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                    <BlockStack gap="200">
                        <Text as="h3" variant="headingSm" tone="subdued">{t('subscription.current_plan', 'Current Plan')}</Text>
                        <InlineStack gap="200" blockAlign="center">
                            <Text as="span" variant="headingLg">{subscription.plan}</Text>
                            <Badge tone="success">{t('subscription.active', 'Active')}</Badge>
                        </InlineStack>
                        <Text as="p" tone="subdued">
                            {t('subscription.billing_cycle_ends', 'Billing cycle ends on {{date}}', { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })}
                        </Text>
                    </BlockStack>
                </Grid.Cell>

                {hasNextPlan && (
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                        <BlockStack gap="200">
                            <Text as="h3" variant="headingSm" tone="subdued">{t('subscription.next_billing_cycle', 'Next Billing Cycle')}</Text>
                            <InlineStack gap="200" blockAlign="center">
                                <Text as="span" variant="headingLg">{subscription.nextPlan}</Text>
                                <Badge tone="info">{t('subscription.scheduled', 'Scheduled')}</Badge>
                            </InlineStack>
                            <InlineStack gap="200" blockAlign="center">
                                <Box as="span"><CalendarIcon width={16} /></Box>
                                <Text as="p" tone="subdued">
                                    {t('subscription.starts_on', 'Starts on {{date}}', { date: new Date(subscription.nextBillingDate!).toLocaleDateString() })}
                                </Text>
                            </InlineStack>
                             {subscription.nextPrice !== undefined && (
                                <Text as="p" fontWeight="bold">
                                    {t('subscription.price_per_month', '${{price}}/month', { price: subscription.nextPrice })}
                                </Text>
                             )}
                        </BlockStack>
                    </Grid.Cell>
                )}
            </Grid>
          </BlockStack>
        </Card>
      </Layout.Section>
    );
  };

  return (
    <Page title={t('subscription.select_plan', 'Select a Plan')} subtitle={t('subscription.subtitle', 'Choose the best plan for your business needs')}>
      <Layout>
        {renderCurrentSubscription()}

        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Grid>
            {SHOPIFY_PLANS.map((plan) => (
              <Grid.Cell key={plan.id} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                <div style={{ height: '100%' }}>
                  <Card>
                    <BlockStack gap="400">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text as="h2" variant="headingLg">{plan.name}</Text>
                        {plan.recommended && <Badge tone="success">Recommended</Badge>}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'baseline' }}>
                        <Text as="span" variant="heading3xl">${plan.price}</Text>
                        <Text as="span" tone="subdued">/month</Text>
                      </div>

                      <div style={{ minHeight: '200px' }}>
                        <BlockStack gap="200">
                          {plan.features.map((feature, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{ width: '20px', flexShrink: 0 }}>
                                  <Box as="span" paddingBlockStart="050">
                                    <CheckIcon width={20} className="fill-current text-green-600" />
                                  </Box>
                                </div>
                                <Text as="p" tone="subdued">{feature}</Text>
                            </div>
                          ))}
                        </BlockStack>
                      </div>

                      <Button 
                        variant={plan.recommended ? 'primary' : 'secondary'} 
                        fullWidth 
                        loading={loadingPlanId === plan.id}
                        onClick={() => handleSelectPlan(plan)}
                      >
                        {plan.price === 0 ? 'Select Free Plan' : `Start ${plan.trialDaysRemaining || 7}-day Free Trial`}
                      </Button>
                    </BlockStack>
                  </Card>
                </div>
              </Grid.Cell>
            ))}
          </Grid>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

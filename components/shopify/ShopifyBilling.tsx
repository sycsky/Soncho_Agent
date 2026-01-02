import React, { useState } from 'react';
import { Page, Layout, Card, BlockStack, Text, Button, Grid, List, Box, Badge, Banner } from '@shopify/polaris';
import { CheckIcon } from '@shopify/polaris-icons';
import { SHOPIFY_PLANS, createSubscription, PricingPlan } from '../../services/shopifyBillingService';

interface ShopifyBillingProps {
  shop: string;
}

export const ShopifyBilling: React.FC<ShopifyBillingProps> = ({ shop }) => {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Page title="Select a Plan" subtitle="Choose the best plan for your business needs">
      <Layout>
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

import React, { useEffect } from 'react';
import { Page, Layout, Card, BlockStack, Text, Button, Banner, Spinner } from '@shopify/polaris';
import { initiateShopifyInstall } from '../../services/shopifyAuthService';

interface ShopifyInstallProps {
  shop: string;
}

export const ShopifyInstall: React.FC<ShopifyInstallProps> = ({ shop }) => {
  useEffect(() => {
    // Auto-redirect after a short delay for better UX
    const timer = setTimeout(() => {
      initiateShopifyInstall(shop);
    }, 2000);

    return () => clearTimeout(timer);
  }, [shop]);

  return (
    <Page title="Setup AI Agent">
      <Layout>
        <Layout.Section>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Card>
              <BlockStack gap="500" align="center">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spinner size="large" accessibilityLabel="Loading" />
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h2" variant="headingLg">Connecting to Shopify...</Text>
                  </div>
                  <div style={{ marginTop: '0.5rem', maxWidth: '400px' }}>
                    <Text as="p" tone="subdued">
                      We are redirecting you to Shopify to authorize the AI Agent app. 
                      This will allow us to access your store's data to provide intelligent customer support.
                    </Text>
                  </div>
                  <div style={{ marginTop: '2rem' }}>
                    <Button 
                      variant="primary" 
                      onClick={() => initiateShopifyInstall(shop)}
                    >
                      Click here if not redirected
                    </Button>
                  </div>
                </div>
              </BlockStack>
            </Card>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

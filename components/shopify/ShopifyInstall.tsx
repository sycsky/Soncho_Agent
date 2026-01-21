import React, { useEffect } from 'react';
import { Page, Layout, Card, BlockStack, Text, Button, Banner } from '@shopify/polaris';
import { Loader2 } from 'lucide-react';
import { initiateShopifyInstall } from '../../services/shopifyAuthService';

interface ShopifyInstallProps {
  shop: string;
  error?: string | null;
}

export const ShopifyInstall: React.FC<ShopifyInstallProps> = ({ shop, error }) => {
  useEffect(() => {
    if (!error) {
      // Always attempt to redirect, even in iframe. 
      // Browsers might block it if not user-initiated, but the button is provided as a fallback.
      console.log('ShopifyInstall component mounted. Initiating install immediately...');
      initiateShopifyInstall(shop);
    }
  }, [shop, error]);

  return (
    <Page title="Setup AI Agent">
      <Layout>
        <Layout.Section>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Card>
              <BlockStack gap="500" align="center">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  {error ? (
                    <div style={{ marginBottom: '1rem', color: '#D82C0D', maxWidth: '400px' }}>
                      <Text as="h2" variant="headingMd">Initialization Failed</Text>
                      <p style={{ marginTop: '0.5rem' }}>{error}</p>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                        Please check your configuration or try again.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <Loader2 className="animate-spin" size={48} color="#008060" />
                      </div>
                      <div style={{ marginTop: '1rem' }}>
                        <Text as="h2" variant="headingLg">Connecting to Shopify...</Text>
                      </div>
                    </>
                  )}
                  
                  {!error && (
                    <div style={{ marginTop: '0.5rem', maxWidth: '400px' }}>
                      <Text as="p" tone="subdued">
                        We are redirecting you to Shopify to authorize the AI Agent app. 
                        This will allow us to access your store's data to provide intelligent customer support.
                      </Text>
                    </div>
                  )}

                  <div style={{ marginTop: '2rem' }}>
                    <Button 
                      variant="primary" 
                      onClick={() => initiateShopifyInstall(shop)}
                    >
                      {error ? 'Retry Installation' : 'Click here if not redirected'}
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

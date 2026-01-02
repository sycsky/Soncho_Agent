import React, { useEffect } from 'react';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';

interface ShopifyAppProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  shopOrigin?: string;
  host?: string;
}

/**
 * Wraps the application or specific components with Shopify's Polaris AppProvider.
 * This is required for using Polaris components and for embedding in Shopify Admin.
 */
export const ShopifyAppProvider: React.FC<ShopifyAppProviderProps> = ({ 
  children,
  apiKey,
  shopOrigin,
  host
}) => {
  useEffect(() => {
    if (!apiKey || !host) return;

    const scriptId = 'shopify-app-bridge';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
      script.async = true;
      document.head.appendChild(script);
    }

    const w = window as any;
    w.shopify = w.shopify || {};
    w.shopify.config = w.shopify.config || {};
    w.shopify.config.apiKey = apiKey;
    w.shopify.config.host = host;
    if (shopOrigin) {
      w.shopify.config.shop = shopOrigin;
    }
  }, [apiKey, host, shopOrigin]);

  return (
    <AppProvider i18n={enTranslations}>
      {children}
    </AppProvider>
  );
};

import React from 'react';
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
  return (
    <AppProvider i18n={enTranslations}>
      {children}
    </AppProvider>
  );
};

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  List,
  Button,
  Banner,
  MediaCard,
  VideoThumbnail,
  Grid,
  Icon,
  InlineStack,
  SkeletonBodyText,
  SkeletonDisplayText
} from '@shopify/polaris';
import {
  ChatIcon,
  SettingsIcon,
  DatabaseIcon,
  ExternalIcon
} from '@shopify/polaris-icons';
import { getDashboardMetrics, DashboardMetrics } from '../../services/dashboardService';
import { AppEmbedGuide } from './AppEmbedGuide';
import { getShopifyLaunchParams } from '../../services/shopifyAuthService';

interface ShopifyDashboardProps {
  onOpenChat?: () => void;
  onOpenSettings?: () => void;
  onOpenKnowledge?: () => void;
}

export const ShopifyDashboard: React.FC<ShopifyDashboardProps> = ({
  onOpenChat,
  onOpenSettings,
  onOpenKnowledge
}) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { shop } = getShopifyLaunchParams();

  useEffect(() => {
    console.log('ShopifyDashboard mounted, shop:', shop);
    const fetchMetrics = async () => {
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <Page title={t('shopify_dashboard.title')} primaryAction={<Button variant="primary" onClick={onOpenSettings}>{t('settings')}</Button>}>
      <Layout>
        {shop && (
          <Layout.Section>
            <AppEmbedGuide shop={shop} />
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
};

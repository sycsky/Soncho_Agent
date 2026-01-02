import React, { useState, useEffect } from 'react';
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
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    <Page title="AI Agent Assistant" primaryAction={<Button variant="primary" onClick={onOpenSettings}>Settings</Button>}>
      <Layout>
        <Layout.Section>
          <Banner title="Welcome to your AI Customer Service Agent" onDismiss={() => {}}>
            <p>
              Your AI agent is currently active and handling customer inquiries.
              Check the analytics below for performance details.
            </p>
          </Banner>
        </Layout.Section>

        {/* Core Features Navigation */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">Live Chat</Text>
                    <Icon source={ChatIcon} tone="base" />
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Manage customer conversations and monitor AI responses in real-time.
                  </Text>
                  <Button variant="primary" onClick={onOpenChat} fullWidth>Go to Inbox</Button>
                </BlockStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">Knowledge Base</Text>
                    <Icon source={DatabaseIcon} tone="base" />
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Train your AI with documents, FAQs, and product information.
                  </Text>
                  <Button onClick={onOpenKnowledge} fullWidth>Manage Knowledge</Button>
                </BlockStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">Widget Settings</Text>
                    <Icon source={SettingsIcon} tone="base" />
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Customize the look and feel of your chat widget.
                  </Text>
                  <Button onClick={onOpenSettings} fullWidth>Configure Widget</Button>
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Enable Widget Guide */}
        <Layout.Section>
          <Banner 
            title="Action Required: Enable Chat Widget on Your Store" 
            tone="warning"
          >
             <BlockStack gap="200">
               <Text as="p">
                  To display the AI chat widget on your storefront, you must enable the App Embed in your Shopify Theme Editor.
               </Text>
               <Text as="p" fontWeight="bold">Follow these steps:</Text>
               <List type="number">
                  <List.Item>Click the button below to open your store's <b>Theme Editor</b>.</List.Item>
                  <List.Item>In the left sidebar, click on the <b>App embeds</b> icon (last icon).</List.Item>
                  <List.Item>Find <b>"AI Agent Widget"</b> in the list and toggle it to <b>ON</b>.</List.Item>
                  <List.Item>Click <b>Save</b> in the top right corner.</List.Item>
               </List>
               <InlineStack>
                  <Button 
                    variant="primary" 
                    url={`https://${new URLSearchParams(window.location.search).get('shop')}/admin/themes/current/editor?context=apps`}
                    target="_blank"
                    icon={ExternalIcon}
                  >
                    Open Theme Editor
                  </Button>
               </InlineStack>
             </BlockStack>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Quick Status
              </Text>
              {loading ? (
                <BlockStack gap="200">
                  <SkeletonDisplayText size="small" />
                  <SkeletonBodyText lines={3} />
                </BlockStack>
              ) : metrics ? (
                <List type="bullet">
                  <List.Item>
                    Agent Status: <Text as="span" tone="success">{metrics.activeAgents > 0 ? 'Active' : 'Offline'}</Text>
                  </List.Item>
                  <List.Item>Conversations Today: {metrics.totalConversations}</List.Item>
                  <List.Item>Pending Actions: {metrics.pendingActions}</List.Item>
                  <List.Item>AI Resolution Rate: {metrics.aiResolutionRate}%</List.Item>
                  <List.Item>Avg Response Time: {metrics.avgResponseTime}</List.Item>
                </List>
              ) : (
                <Text as="p" tone="critical">Failed to load metrics.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Card, BlockStack, InlineStack, Text, Button, Banner, Badge, Modal, List } from '@shopify/polaris';
import { useTranslation, Trans } from 'react-i18next';
import api from '../../services/api';

export interface AppEmbedGuideProps {
  shop: string;
  suppressModal?: boolean;
}

export const AppEmbedGuide: React.FC<AppEmbedGuideProps> = ({ shop, suppressModal = false }) => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Extension UUID from environment variables
  const EXTENSION_UUID = import.meta.env.VITE_SHOPIFY_EXTENSION_UUID;
  const APP_EMBED_HANDLE = 'chat_widget';

  const checkStatus = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    try {
        console.log(`Checking App Embed status for shop: ${shop}`);
        const data = await api.get<{ enabled: boolean }>(`/shopify/extension/status?shop=${shop}&handle=${APP_EMBED_HANDLE}`);
        console.log('App Embed status:', data);

        setEnabled(data.enabled);
        if (data.enabled === false) {
            setShowModal(true);
        }
    } catch (e) {
        console.error("Failed to check status", e);
    } finally {
        setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleOpenThemeEditor = () => {
    const url = `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${EXTENSION_UUID}/${APP_EMBED_HANDLE}`;
    window.open(url, '_blank');
  };

  const handleCloseModal = () => {
      setShowModal(false);
  };

  return (
    <>
        <Card>
        <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingMd">{t('shopify_app_embed.title')}</Text>
                    {enabled !== null && (
                        <Badge tone={enabled ? 'success' : undefined}>
                            {enabled ? t('shopify_app_embed.on') : t('shopify_app_embed.off')}
                        </Badge>
                    )}
                </InlineStack>
                <Button onClick={handleOpenThemeEditor} variant="primary">
                    {enabled ? t('shopify_app_embed.manage_chat') : t('shopify_app_embed.enable_chat')}
                </Button>
            </InlineStack>
            <Text as="p" variant="bodyMd">
                {t('shopify_app_embed.description')}
            </Text>
            {enabled === false && (
                <Banner tone="warning" title={t('shopify_app_embed.warning_title')}>
                    <BlockStack gap="200">
                        <Text as="p">
                            {t('shopify_app_embed.warning_desc')}
                        </Text>
                        <Text as="p" fontWeight="bold">{t('shopify_app_embed.follow_steps')}</Text>
                        <List type="number">
                            <List.Item>
                                <span dangerouslySetInnerHTML={{ __html: t('shopify_app_embed.step_1') }} />
                            </List.Item>
                            <List.Item>
                                <span dangerouslySetInnerHTML={{ __html: t('shopify_app_embed.step_2') }} />
                            </List.Item>
                            <List.Item>
                                <span dangerouslySetInnerHTML={{ __html: t('shopify_app_embed.step_3') }} />
                            </List.Item>
                            <List.Item>
                                <span dangerouslySetInnerHTML={{ __html: t('shopify_app_embed.step_4') }} />
                            </List.Item>
                        </List>
                    </BlockStack>
                </Banner>
            )}
        </BlockStack>
        </Card>
        
        <Modal
            open={showModal && !suppressModal}
            onClose={handleCloseModal}
            title={t('shopify_app_embed.modal_title')}
            primaryAction={{
                content: t('shopify_app_embed.enable_chat'),
                onAction: handleOpenThemeEditor,
            }}
            secondaryActions={[
                {
                    content: t('shopify_app_embed.refresh_status'),
                    onAction: checkStatus,
                    loading: loading
                },
                {
                    content: t('close', { defaultValue: 'Close' }),
                    onAction: handleCloseModal,
                }
            ]}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Text as="p">
                        {t('shopify_app_embed.modal_content')}
                    </Text>
                    <List type="number">
                        <List.Item>
                            <span dangerouslySetInnerHTML={{ __html: t('shopify_app_embed.step_1') }} />
                        </List.Item>
                        <List.Item>
                            <span dangerouslySetInnerHTML={{ __html: t('shopify_app_embed.step_2') }} />
                        </List.Item>
                        <List.Item>
                            <span dangerouslySetInnerHTML={{ __html: t('shopify_app_embed.step_3') }} />
                        </List.Item>
                        <List.Item>
                            <span dangerouslySetInnerHTML={{ __html: t('shopify_app_embed.step_4') }} />
                        </List.Item>
                    </List>
                </BlockStack>
            </Modal.Section>
        </Modal>
    </>
  );
};

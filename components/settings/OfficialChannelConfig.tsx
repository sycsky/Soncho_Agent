import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OfficialChannelConfig, ChannelTypeInfo } from '../../types/officialChannel';
import { SessionCategory } from '../../types';
import { officialChannelApi } from '../../services/officialChannelService';
import sessionCategoryService from '../../services/sessionCategoryService';
import { Save, Trash2, Power, Copy, ExternalLink, MessageSquare } from 'lucide-react';

export const OfficialChannelConfigView: React.FC = () => {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<OfficialChannelConfig[]>([]);
  const [channelTypes, setChannelTypes] = useState<ChannelTypeInfo[]>([]);
  const [categories, setCategories] = useState<SessionCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configsData, typesData, categoriesData] = await Promise.all([
        officialChannelApi.getAllConfigs(),
        officialChannelApi.getChannelTypes(),
        sessionCategoryService.getAllCategories()
      ]);
      setConfigs(configsData);
      setChannelTypes(typesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load official channel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (channelType: string, data: any) => {
    try {
      await officialChannelApi.saveConfig({
        channelType,
        configData: data,
        webhookSecret: data.webhookSecret,
        enabled: data.enabled,
        remark: data.remark,
        categoryId: data.categoryId
      });
      await loadData(); // Reload to get updated data
      alert(t('save_success'));
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(t('save_failed'));
    }
  };

  const handleToggle = async (channelType: string, enabled: boolean) => {
    try {
      await officialChannelApi.toggleChannel(channelType, enabled);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle channel:', error);
    }
  };

  const handleDelete = async (channelType: string) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      await officialChannelApi.deleteConfig(channelType);
      await loadData();
    } catch (error) {
      console.error('Failed to delete config:', error);
      alert(t('delete_failed'));
    }
  };

  if (loading && channelTypes.length === 0) {
    return <div className="p-8 text-center text-gray-500">{t('loading_configurations')}</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="text-green-600" /> {t('official_channels')}
        </h2>
      </div>

      <div className="grid gap-6">
        {channelTypes.map(type => {
          const config = configs.find(c => c.channelType === type.value);
          return (
            <ChannelConfigCard
              key={type.value}
              channelType={type}
              config={config}
              categories={categories}
              onSave={handleSave}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          );
        })}
      </div>
    </div>
  );
};

interface ChannelConfigCardProps {
  channelType: ChannelTypeInfo;
  config?: OfficialChannelConfig;
  categories: SessionCategory[];
  onSave: (type: string, data: any) => Promise<void>;
  onToggle: (type: string, enabled: boolean) => Promise<void>;
  onDelete: (type: string) => Promise<void>;
}

const ChannelConfigCard: React.FC<ChannelConfigCardProps> = ({
  channelType,
  config,
  categories,
  onSave,
  onToggle,
  onDelete
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>({});
  const [webhookSecret, setWebhookSecret] = useState('');
  const [remark, setRemark] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (config) {
      try {
        setFormData(JSON.parse(config.configJson));
      } catch {
        setFormData({});
      }
      setWebhookSecret(config.webhookSecret || '');
      setRemark(config.remark || '');
      setCategoryId(config.categoryId || '');
      setIsExpanded(true);
    } else {
      setFormData(getDefaultConfig(channelType.value));
      setWebhookSecret('');
      setRemark('');
      setCategoryId('');
      setIsExpanded(false);
    }
  }, [config, channelType]);

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'WECHAT_OFFICIAL':
        return { appId: '', appSecret: '', token: '', encodingAESKey: '' };
      case 'WECHAT_KF':
        return { appId: '', appSecret: '', token: '', encodingAESKey: '' };
      case 'LINE_OFFICIAL':
        return { channelId: '', channelSecret: '', channelAccessToken: '' };
      case 'WHATSAPP_OFFICIAL':
        return { phoneNumberId: '', accessToken: '', businessAccountId: '', appId: '', appSecret: '' };
      case 'FACEBOOK_MESSENGER':
        return { appId: '', appSecret: '', accessToken: '' };
      case 'TELEGRAM':
        return { botToken: '' };
      case 'INSTAGRAM':
        return { appId: '', appSecret: '', accessToken: '' };
      case 'TWITTER':
        return { consumerKey: '', consumerSecret: '', accessToken: '', accessTokenSecret: '', bearerToken: '' };
      case 'DOUYIN':
        return { clientKey: '', clientSecret: '' };
      case 'RED_BOOK':
        return { appId: '', appSecret: '' };
      case 'WEIBO':
        return { appKey: '', appSecret: '', accessToken: '' };
      case 'SHOPIFY':
        return { shopDomain: '', accessToken: '', apiKey: '', apiSecret: '' };
      case 'EMAIL':
        return { smtpHost: '', smtpPort: 587, username: '', password: '', fromEmail: '', sslEnabled: true };
      default:
        return {};
    }
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    await onSave(channelType.value, {
      ...formData,
      webhookSecret,
      enabled: config?.enabled || false,
      remark,
      categoryId
    });
    setIsSaving(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const getWebhookUrl = () => {
    if (config?.webhookUrl) {
        return `${window.location.origin}${config.webhookUrl}`;
    }
    // Fallback or prediction if not yet saved (though backend usually generates it)
    return `${window.location.origin}/api/v1/official-channels/${channelType.value.toLowerCase()}/webhook`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 flex items-center justify-between bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${config?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
             <MessageSquare size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{channelType.label}</h3>
            <p className="text-sm text-gray-500">{config ? (config.enabled ? t('enabled') : t('disabled')) : t('not_configured')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {config && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-gray-600">{t('status')}:</span>
              <button
                onClick={() => onToggle(channelType.value, !config.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 font-medium text-sm"
          >
            {isExpanded ? t('collapse') : t('configure')}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          <div className="grid gap-6">
            {channelType.value === 'SHOPIFY' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('shop_domain')} *</label>
                  <input
                    type="text"
                    value={formData.shopDomain || ''}
                    onChange={(e) => setFormData({ ...formData, shopDomain: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="my-store.myshopify.com"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {t('shop_domain_hint')}
                  </p>
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('access_token')} *</label>
                  <input
                    type="password"
                    value={formData.accessToken || ''}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {t('access_token_hint')}
                  </p>
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('api_key')}</label>
                  <input
                    type="text"
                    value={formData.apiKey || ''}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('api_secret_key')}</label>
                  <input
                    type="password"
                    value={formData.apiSecret || ''}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'WECHAT_OFFICIAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('appid')} *</label>
                  <input
                    type="text"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="wx..."
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('appsecret')} *</label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('token')} *</label>
                  <input
                    type="text"
                    value={formData.token || ''}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('encoding_aes_key')}</label>
                  <input
                    type="text"
                    value={formData.encodingAESKey || ''}
                    onChange={(e) => setFormData({ ...formData, encodingAESKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'WECHAT_KF' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('corpid')} *</label>
                  <input
                    type="text"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="ww..."
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('secret_wework')} *
                  </label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {t('secret_wework_hint')}
                  </p>
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('token')} *</label>
                  <input
                    type="text"
                    value={formData.token || ''}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('encoding_aes_key')}</label>
                  <input
                    type="text"
                    value={formData.encodingAESKey || ''}
                    onChange={(e) => setFormData({ ...formData, encodingAESKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'LINE_OFFICIAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('channel_id')} *</label>
                  <input
                    type="text"
                    value={formData.channelId || ''}
                    onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('channel_secret')} *</label>
                  <input
                    type="password"
                    value={formData.channelSecret || ''}
                    onChange={(e) => setFormData({ ...formData, channelSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('channel_access_token')} *</label>
                  <input
                    type="password"
                    value={formData.channelAccessToken || ''}
                    onChange={(e) => setFormData({ ...formData, channelAccessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'WHATSAPP_OFFICIAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone_number_id')} *</label>
                  <input
                    type="text"
                    value={formData.phoneNumberId || ''}
                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('access_token')} *</label>
                  <input
                    type="password"
                    value={formData.accessToken || ''}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('business_account_id')}</label>
                  <input
                    type="text"
                    value={formData.businessAccountId || ''}
                    onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('appid')}</label>
                  <input
                    type="text"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('app_secret')}</label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'FACEBOOK_MESSENGER' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('app_id')} *</label>
                  <input
                    type="text"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('app_secret')} *</label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('page_access_token')} *</label>
                  <input
                    type="password"
                    value={formData.accessToken || ''}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'TELEGRAM' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token *</label>
                  <input
                    type="password"
                    value={formData.botToken || ''}
                    onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'INSTAGRAM' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook App ID *</label>
                  <input
                    type="text"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook {t('app_secret')} *</label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('page_access_token')} *</label>
                  <input
                    type="password"
                    value={formData.accessToken || ''}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'TWITTER' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('twitter_consumer_key')} *</label>
                  <input
                    type="text"
                    value={formData.consumerKey || ''}
                    onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('twitter_consumer_secret')} *</label>
                  <input
                    type="password"
                    value={formData.consumerSecret || ''}
                    onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('access_token')} *</label>
                  <input
                    type="password"
                    value={formData.accessToken || ''}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('access_token_secret')} *</label>
                  <input
                    type="password"
                    value={formData.accessTokenSecret || ''}
                    onChange={(e) => setFormData({ ...formData, accessTokenSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('bearer_token')}</label>
                  <input
                    type="password"
                    value={formData.bearerToken || ''}
                    onChange={(e) => setFormData({ ...formData, bearerToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'DOUYIN' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('client_key')} *</label>
                  <input
                    type="text"
                    value={formData.clientKey || ''}
                    onChange={(e) => setFormData({ ...formData, clientKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('client_secret')} *</label>
                  <input
                    type="password"
                    value={formData.clientSecret || ''}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'RED_BOOK' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('app_id')} *</label>
                  <input
                    type="text"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('app_secret')} *</label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'WEIBO' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('app_key')} *</label>
                  <input
                    type="text"
                    value={formData.appKey || ''}
                    onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">App Secret *</label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('access_token')} *</label>
                  <input
                    type="password"
                    value={formData.accessToken || ''}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {channelType.value === 'EMAIL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('smtp_host')} *</label>
                  <input
                    type="text"
                    value={formData.smtpHost || ''}
                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('smtp_port')} *</label>
                  <input
                    type="number"
                    value={formData.smtpPort || ''}
                    onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="587"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('email_username')} *</label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')} *</label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('from_email')} *</label>
                  <input
                    type="text"
                    value={formData.fromEmail || ''}
                    onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sslEnabled ?? true}
                      onChange={(e) => setFormData({ ...formData, sslEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('enable_ssl_tls')}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div className="border-t border-gray-100 pt-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('webhook_secret')}</label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder={t('optional_verification_secret')}
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('default_session_category')}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">{t('no_category')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('remark')}</label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder={t('note_placeholder')}
                  />
                </div>
              </div>
            </div>

            {/* Webhook URL Display */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <label className="block text-xs font-bold text-blue-700 uppercase mb-2">{t('webhook_url_label')}</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-200 text-sm font-mono text-gray-600 break-all">
                  {getWebhookUrl()}
                </code>
                <button
                  onClick={() => copyToClipboard(getWebhookUrl())}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title={t('copy_url')}
                >
                  <Copy size={18} />
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                {t('configure_webhook_hint', { label: channelType.label })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              {config && (
                <button
                  onClick={() => onDelete(channelType.value)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} /> {t('delete_config')}
                </button>
              )}
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? t('saving') : t('save_configuration')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

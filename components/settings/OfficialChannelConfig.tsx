import React, { useState, useEffect } from 'react';
import { OfficialChannelConfig, ChannelTypeInfo } from '../../types/officialChannel';
import { SessionCategory } from '../../types';
import { officialChannelApi } from '../../services/officialChannelService';
import sessionCategoryService from '../../services/sessionCategoryService';
import { Save, Trash2, Power, Copy, ExternalLink, MessageSquare } from 'lucide-react';

export const OfficialChannelConfigView: React.FC = () => {
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
      alert('Configuration saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
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
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    try {
      await officialChannelApi.deleteConfig(channelType);
      await loadData();
    } catch (error) {
      console.error('Failed to delete config:', error);
      alert('Failed to delete configuration');
    }
  };

  if (loading && channelTypes.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading configurations...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="text-green-600" /> Official Channels
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
      case 'LINE_OFFICIAL':
        return { channelId: '', channelSecret: '', channelAccessToken: '' };
      case 'WHATSAPP_OFFICIAL':
        return { phoneNumberId: '', accessToken: '', businessAccountId: '', appId: '', appSecret: '' };
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
            <p className="text-sm text-gray-500">{config ? (config.enabled ? 'Enabled' : 'Disabled') : 'Not Configured'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {config && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-gray-600">Status:</span>
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
            {isExpanded ? 'Collapse' : 'Configure'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          <div className="grid gap-6">
            {/* Platform Specific Fields */}
            {channelType.value === 'WECHAT_OFFICIAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">AppID *</label>
                  <input
                    type="text"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="wx..."
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">AppSecret *</label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Token *</label>
                  <input
                    type="text"
                    value={formData.token || ''}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">EncodingAESKey</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel ID *</label>
                  <input
                    type="text"
                    value={formData.channelId || ''}
                    onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret *</label>
                  <input
                    type="password"
                    value={formData.channelSecret || ''}
                    onChange={(e) => setFormData({ ...formData, channelSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID *</label>
                  <input
                    type="text"
                    value={formData.phoneNumberId || ''}
                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Token *</label>
                  <input
                    type="password"
                    value={formData.accessToken || ''}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Account ID</label>
                  <input
                    type="text"
                    value={formData.businessAccountId || ''}
                    onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
                  <input
                    type="text"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
                  <input
                    type="password"
                    value={formData.appSecret || ''}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div className="border-t border-gray-100 pt-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Optional verification secret"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Session Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">-- No Category --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Note for this configuration"
                  />
                </div>
              </div>
            </div>

            {/* Webhook URL Display */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <label className="block text-xs font-bold text-blue-700 uppercase mb-2">Webhook URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-200 text-sm font-mono text-gray-600 break-all">
                  {getWebhookUrl()}
                </code>
                <button
                  onClick={() => copyToClipboard(getWebhookUrl())}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Copy URL"
                >
                  <Copy size={18} />
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Configure this URL in the {channelType.label} developer console to receive messages.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              {config && (
                <button
                  onClick={() => onDelete(channelType.value)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} /> Delete Config
                </button>
              )}
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import api from './api';
import { OfficialChannelConfig, ChannelTypeInfo } from '../types/officialChannel';

const BASE_PATH = '/official-channels';

export const officialChannelApi = {
  // Get all configs
  getAllConfigs: async (): Promise<OfficialChannelConfig[]> => {
    return api.get<OfficialChannelConfig[]>(`${BASE_PATH}/configs`);
  },

  // Get config by channel type
  getConfigByType: async (channelType: string): Promise<OfficialChannelConfig> => {
    return api.get<OfficialChannelConfig>(`${BASE_PATH}/configs/${channelType}`);
  },

  // Save or update config
  saveConfig: async (data: {
    channelType: string;
    configData: any;
    webhookSecret?: string;
    enabled?: boolean;
    remark?: string;
    categoryId?: string;
  }): Promise<OfficialChannelConfig> => {
    return api.post<OfficialChannelConfig>(`${BASE_PATH}/configs`, data);
  },

  // Toggle channel status
  toggleChannel: async (channelType: string, enabled: boolean): Promise<OfficialChannelConfig> => {
    return api.request<OfficialChannelConfig>(`${BASE_PATH}/configs/${channelType}/toggle?enabled=${enabled}`, {
      method: 'PATCH',
    });
  },

  // Delete config
  deleteConfig: async (channelType: string): Promise<void> => {
    return api.delete<void>(`${BASE_PATH}/configs/${channelType}`);
  },

  // Get all channel types
  getChannelTypes: async (): Promise<ChannelTypeInfo[]> => {
    const types = await api.get<ChannelTypeInfo[]>(`${BASE_PATH}/channel-types`);
    
    // Mocking for frontend support - ensuring all doc-specified channels are available
    const mockTypes = [
      { value: 'WECHAT_KF', label: '微信客服' },
      { value: 'FACEBOOK_MESSENGER', label: 'Facebook Messenger' },
      { value: 'INSTAGRAM', label: 'Instagram Direct' },
      { value: 'TELEGRAM', label: 'Telegram' },
      { value: 'WHATSAPP_OFFICIAL', label: 'WhatsApp Business' }, // Usually from backend, but good to ensure
      { value: 'LINE_OFFICIAL', label: 'Line' }, // Usually from backend
      { value: 'TWITTER', label: 'X (Twitter)' },
      { value: 'DOUYIN', label: '抖音' },
      { value: 'RED_BOOK', label: '小红书' },
      { value: 'WEIBO', label: '微博' },
      { value: 'EMAIL', label: 'Email' }
    ];

    mockTypes.forEach(mockType => {
      if (!types.find(t => t.value === mockType.value)) {
        types.push(mockType);
      }
    });
    
    return types;
  },
};

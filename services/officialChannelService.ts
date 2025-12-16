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
    return api.get<ChannelTypeInfo[]>(`${BASE_PATH}/channel-types`);
  },
};

export interface OfficialChannelConfig {
  id: string;
  channelType: 'WECHAT_OFFICIAL' | 'LINE_OFFICIAL' | 'WHATSAPP_OFFICIAL';
  displayName: string;
  enabled: boolean;
  configJson: string;
  webhookSecret?: string;
  webhookUrl: string;
  remark?: string;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelTypeInfo {
  value: string;
  label: string;
}

export interface WechatOfficialConfig {
  appId: string;
  appSecret: string;
  token: string;
  encodingAESKey?: string;
}

export interface LineOfficialConfig {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
}

export interface WhatsappOfficialConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
  appId?: string;
  appSecret?: string;
}

export type ChannelConfigData = WechatOfficialConfig | LineOfficialConfig | WhatsappOfficialConfig | Record<string, any>;

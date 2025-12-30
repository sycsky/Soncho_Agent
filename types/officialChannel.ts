export interface OfficialChannelConfig {
  id: string;
  channelType: 'WECHAT_OFFICIAL' | 'LINE_OFFICIAL' | 'WHATSAPP_OFFICIAL' | 'WECHAT_KF' | 'FACEBOOK_MESSENGER' | 'TELEGRAM' | 'INSTAGRAM' | 'TWITTER' | 'DOUYIN' | 'RED_BOOK' | 'WEIBO' | 'EMAIL';
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

export interface WechatKfConfig {
  appId: string; // CorpID
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

export interface FacebookMessengerConfig {
  appId?: string;
  appSecret?: string;
  accessToken: string;
}

export interface TelegramConfig {
  botToken: string;
}

export interface InstagramConfig {
  appId?: string;
  appSecret?: string;
  accessToken: string;
}

export interface TwitterConfig {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken?: string;
}

export interface DouyinConfig {
  clientKey: string;
  clientSecret: string;
}

export interface RedBookConfig {
  appId: string;
  appSecret: string;
}

export interface WeiboConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromEmail: string;
  sslEnabled?: boolean;
}

export type ChannelConfigData = WechatOfficialConfig | LineOfficialConfig | WhatsappOfficialConfig | WechatKfConfig | FacebookMessengerConfig | TelegramConfig | InstagramConfig | TwitterConfig | DouyinConfig | RedBookConfig | WeiboConfig | EmailConfig | Record<string, any>;

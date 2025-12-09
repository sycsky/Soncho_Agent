export interface PlatformTypeOption {
  value: string;
  label: string;
}

export interface AuthTypeOption {
  value: string;
  description: string;
}

export interface ExternalPlatform {
  id: string;
  name: string;
  displayName: string | null;
  platformType: string;
  callbackUrl: string | null;
  authType: string;
  authCredential: string | null;
  extraHeaders: string | null;
  webhookSecret: string | null;
  enabled: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlatformRequest {
  name: string;
  displayName?: string;
  platformType: string;
  callbackUrl?: string;
  authType?: string;
  authCredential?: string;
  webhookSecret?: string;
  extraHeaders?: string;
  enabled?: boolean;
  remark?: string;
}

export interface UpdatePlatformRequest {
  displayName?: string;
  callbackUrl?: string;
  authType?: string;
  authCredential?: string;
  webhookSecret?: string;
  extraHeaders?: string;
  enabled?: boolean;
  remark?: string;
}

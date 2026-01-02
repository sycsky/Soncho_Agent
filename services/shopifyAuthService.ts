import { BASE_URL } from '../config';
import { Agent } from '../types';

const SHOPIFY_INSTALLED_KEY_PREFIX = 'shopify_installed:';
const SHOPIFY_INSTALL_STARTED_KEY_PREFIX = 'shopify_install_started:';
const SHOPIFY_TENANT_ID_KEY_PREFIX = 'shopify_tenant_id:';
const SHOPIFY_SHOP_KEY = 'shopify_shop';
const SHOPIFY_HOST_KEY = 'shopify_host';

/**
 * Checks if the user is authenticated for the given shop.
 */
export const checkShopifyAuth = (shop: string): boolean => {
  if (!shop) return false;
  const installed = sessionStorage.getItem(`${SHOPIFY_INSTALLED_KEY_PREFIX}${shop}`) === '1';
  const installStarted = sessionStorage.getItem(`${SHOPIFY_INSTALL_STARTED_KEY_PREFIX}${shop}`) === '1';
  return installed || installStarted;
};

/**
 * Redirects the browser to backend install endpoint, which will start Shopify OAuth.
 * Backend: GET /api/v1/shopify/oauth/install?shop={shop}
 */
export const initiateShopifyInstall = (shop: string) => {
  if (!shop) {
    return;
  }

  sessionStorage.setItem(`${SHOPIFY_INSTALL_STARTED_KEY_PREFIX}${shop}`, '1');

  const host = sessionStorage.getItem(SHOPIFY_HOST_KEY) || undefined;
  const installUrl = new URL('/api/v1/shopify/oauth/install', window.location.origin);
  installUrl.searchParams.set('shop', shop);
  if (host) {
    installUrl.searchParams.set('host', host);
  }

  window.location.assign(installUrl.toString());
};

export const saveShopifyLaunchParams = (params: { shop?: string | null; host?: string | null; tenantId?: string | null }) => {
  const { shop, host, tenantId } = params;

  if (shop) {
    sessionStorage.setItem(SHOPIFY_SHOP_KEY, shop);
  }
  if (host) {
    sessionStorage.setItem(SHOPIFY_HOST_KEY, host);
  }
  if (shop && tenantId) {
    sessionStorage.setItem(`${SHOPIFY_TENANT_ID_KEY_PREFIX}${shop}`, tenantId);
    sessionStorage.setItem(`${SHOPIFY_INSTALLED_KEY_PREFIX}${shop}`, '1');
  }
};

export const getShopifyLaunchParams = (): { shop?: string; host?: string; tenantId?: string } => {
  const urlParams = new URLSearchParams(window.location.search);
  const shop = urlParams.get('shop') || sessionStorage.getItem(SHOPIFY_SHOP_KEY) || undefined;
  const host = urlParams.get('host') || sessionStorage.getItem(SHOPIFY_HOST_KEY) || undefined;
  const tenantId = urlParams.get('tenantId') || urlParams.get('tenant_id') || (shop ? sessionStorage.getItem(`${SHOPIFY_TENANT_ID_KEY_PREFIX}${shop}`) : null) || undefined;

  return { shop, host, tenantId };
};

export const logoutShopify = () => {
  const shop = sessionStorage.getItem(SHOPIFY_SHOP_KEY);
  if (shop) {
    sessionStorage.removeItem(`${SHOPIFY_INSTALLED_KEY_PREFIX}${shop}`);
    sessionStorage.removeItem(`${SHOPIFY_INSTALL_STARTED_KEY_PREFIX}${shop}`);
    sessionStorage.removeItem(`${SHOPIFY_TENANT_ID_KEY_PREFIX}${shop}`);
  }
  sessionStorage.removeItem(SHOPIFY_SHOP_KEY);
  sessionStorage.removeItem(SHOPIFY_HOST_KEY);
};

type ShopifyAuthExchangeResult = {
  success: boolean;
  shop?: string;
  tenantId?: string;
  token?: string;
};

const parseShopifyAuthExchangeResult = async (response: Response): Promise<ShopifyAuthExchangeResult> => {
  const text = await response.text();
  if (!text) {
    throw new Error(`Empty response (HTTP ${response.status})`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON (HTTP ${response.status})`);
  }

  const data = json && typeof json === 'object' && 'data' in json ? json.data : json;
  if (!data || typeof data !== 'object') {
    throw new Error(`Unexpected response (HTTP ${response.status})`);
  }

  return data as ShopifyAuthExchangeResult;
};

export const getIdTokenFromUrl = (): string | undefined => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id_token') || undefined;
};

export const exchangeShopifyAuth = async (params: {
  shop: string;
  host?: string;
  tenantId?: string;
  sessionToken?: string;
  idTokenFromUrl?: string;
}): Promise<ShopifyAuthExchangeResult> => {
  const { shop, host, tenantId, sessionToken, idTokenFromUrl } = params;
  if (!shop) {
    throw new Error('Shop is required');
  }

  const endpoint = `${BASE_URL}/api/v1/shopify/auth/exchange`;

  if (idTokenFromUrl) {
    const url = `${endpoint}?id_token=${encodeURIComponent(idTokenFromUrl)}&shop=${encodeURIComponent(shop)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, host, tenantId }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw new Error(`POST /shopify/auth/exchange (query) -> HTTP ${res.status}`);
    }
    return await parseShopifyAuthExchangeResult(res);
  }

  if (sessionToken) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, host, tenantId }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw new Error(`POST /shopify/auth/exchange (header) -> HTTP ${res.status}`);
    }
    return await parseShopifyAuthExchangeResult(res);
  }

  throw new Error('Missing session token / id_token');
};

export type ShopifyAgentSession = {
  token: string;
  agent: Agent;
  shop: string;
  tenantId?: string;
};

const resolveShopifyApiKey = (): string | undefined => {
  try {
    const env: any = import.meta && (import.meta as any).env;
    return env?.VITE_SHOPIFY_API_KEY || undefined;
  } catch {
    return undefined;
  }
};

const ensureShopifyAppBridgeReady = async (params: { apiKey: string; host: string; shop?: string }): Promise<void> => {
  const { apiKey, host, shop } = params;
  const w = window as any;

  w.shopify = w.shopify || {};
  w.shopify.config = w.shopify.config || {};
  w.shopify.config.apiKey = apiKey;
  w.shopify.config.host = host;
  if (shop) {
    w.shopify.config.shop = shop;
  }

  const scriptId = 'shopify-app-bridge';
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!existing) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
    script.async = true;
    document.head.appendChild(script);
  }

  const start = Date.now();
  while (Date.now() - start < 10_000) {
    const current = (window as any).shopify;
    if (current && (typeof current.idToken === 'function' || typeof current.idToken?.get === 'function')) {
      return;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  throw new Error('Shopify App Bridge is not ready');
};

const getShopifySessionToken = async (): Promise<string> => {
  const current = (window as any).shopify;
  if (current && typeof current.idToken === 'function') {
    return await current.idToken();
  }
  if (current && typeof current.idToken?.get === 'function') {
    return await current.idToken.get();
  }
  throw new Error('Missing Shopify session token');
};

export const exchangeShopifyForAgentSession = async (params: {
  shop: string;
  host?: string;
  tenantId?: string;
  apiKey?: string;
  idTokenFromUrl?: string;
}): Promise<ShopifyAgentSession> => {
  const { shop, host, tenantId } = params;
  if (!shop) {
    throw new Error('Shop is required');
  }

  const idTokenFromUrl = params.idTokenFromUrl || getIdTokenFromUrl();
  const apiKey = params.apiKey || resolveShopifyApiKey();

  const sessionToken = idTokenFromUrl
    ? undefined
    : (apiKey && host ? (await ensureShopifyAppBridgeReady({ apiKey, host, shop }), await getShopifySessionToken()) : undefined);

  const result = await exchangeShopifyAuth({
    shop,
    host,
    tenantId,
    sessionToken,
    idTokenFromUrl
  });

  if (!result.success || !result.token) {
    throw new Error('Token exchange failed');
  }

  const resolvedTenantId = result.tenantId || tenantId;
  saveShopifyLaunchParams({ shop: result.shop || shop, host: host || null, tenantId: resolvedTenantId || null });

  const agent: Agent = {
    id: resolvedTenantId || shop,
    name: `Shopify (${shop})`,
    roleId: 'default',
    avatar: '',
    status: 'ONLINE'
  };

  return {
    token: result.token,
    agent,
    shop: result.shop || shop,
    tenantId: resolvedTenantId
  };
};

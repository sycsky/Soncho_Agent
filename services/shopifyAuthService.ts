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
  return isShopifyInstalled(shop);
};

export const isShopifyInstalled = (shop: string): boolean => {
  if (!shop) return false;
  return localStorage.getItem(`${SHOPIFY_INSTALLED_KEY_PREFIX}${shop}`) === '1';
};

export const hasShopifyInstallStarted = (shop: string): boolean => {
  if (!shop) return false;
  return localStorage.getItem(`${SHOPIFY_INSTALL_STARTED_KEY_PREFIX}${shop}`) === '1';
};

/**
 * Redirects the browser to backend install endpoint, which will start Shopify OAuth.
 * Backend: GET /api/v1/shopify/oauth/install?shop={shop}
 */
export const initiateShopifyInstall = async (shop: string) => {
  if (!shop) {
    return;
  }

  localStorage.setItem(`${SHOPIFY_INSTALL_STARTED_KEY_PREFIX}${shop}`, '1');

  const urlParams = new URLSearchParams(window.location.search);
  const hostFromUrl = urlParams.get('host') || undefined;
  const host = hostFromUrl || localStorage.getItem(SHOPIFY_HOST_KEY) || undefined;
  if (hostFromUrl) {
    localStorage.setItem(SHOPIFY_HOST_KEY, hostFromUrl);
  }

  const installUrl = new URL(`${BASE_URL}/api/v1/shopify/oauth/install`);
  installUrl.searchParams.set('shop', shop);
  if (host) {
    installUrl.searchParams.set('host', host);
  }

  console.log('Redirecting to install:', installUrl.toString());

  // Use _top to break out of iframe if App Bridge is not active,
  // or use App Bridge's patched window.open if it is active.
  window.open(installUrl.toString(), '_top');
};

export const saveShopifyLaunchParams = (params: { shop?: string | null; host?: string | null; tenantId?: string | null }) => {
  const { shop, host, tenantId } = params;

  if (shop) {
    localStorage.setItem(SHOPIFY_SHOP_KEY, shop);
  }
  if (host) {
    localStorage.setItem(SHOPIFY_HOST_KEY, host);
  }
  if (shop && tenantId) {
    localStorage.setItem(`${SHOPIFY_TENANT_ID_KEY_PREFIX}${shop}`, tenantId);
    localStorage.setItem(`${SHOPIFY_INSTALLED_KEY_PREFIX}${shop}`, '1');
    localStorage.removeItem(`${SHOPIFY_INSTALL_STARTED_KEY_PREFIX}${shop}`);
  }
};

export const getShopifyLaunchParams = (): { shop?: string; host?: string; tenantId?: string } => {
  const urlParams = new URLSearchParams(window.location.search);
  const shop = urlParams.get('shop') || localStorage.getItem(SHOPIFY_SHOP_KEY) || undefined;
  const host = urlParams.get('host') || localStorage.getItem(SHOPIFY_HOST_KEY) || undefined;
  const tenantId = urlParams.get('tenantId') || urlParams.get('tenant_id') || (shop ? localStorage.getItem(`${SHOPIFY_TENANT_ID_KEY_PREFIX}${shop}`) : null) || undefined;

  return { shop, host, tenantId };
};

export const logoutShopify = () => {
  const shop = localStorage.getItem(SHOPIFY_SHOP_KEY);
  if (shop) {
    localStorage.removeItem(`${SHOPIFY_INSTALLED_KEY_PREFIX}${shop}`);
    localStorage.removeItem(`${SHOPIFY_INSTALL_STARTED_KEY_PREFIX}${shop}`);
    localStorage.removeItem(`${SHOPIFY_TENANT_ID_KEY_PREFIX}${shop}`);
  }
  localStorage.removeItem(SHOPIFY_SHOP_KEY);
  localStorage.removeItem(SHOPIFY_HOST_KEY);
};

type ShopifyAuthExchangeResult = {
  success: boolean;
  shop?: string;
  tenantId?: string;
  token?: string;
  error?: string;
  httpStatus?: number;
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

export const probeShopifyExchange = async (shop: string): Promise<ShopifyAuthExchangeResult> => {
  if (!shop) {
    throw new Error('Shop is required');
  }
  const endpoint = `${BASE_URL}/api/v1/shopify/auth/exchange`;
  const url = `${endpoint}?shop=${encodeURIComponent(shop)}`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include'
  });
  const status = res.status;
  const text = await res.text();
  if (!text) {
    if (res.ok) {
      return { success: false, httpStatus: status, error: 'Empty response' };
    }
    return { success: false, httpStatus: status, error: `HTTP ${status}` };
  }

  try {
    const json = JSON.parse(text);
    const data = json && typeof json === 'object' && 'data' in json ? (json as any).data : json;
    const result = (data && typeof data === 'object') ? (data as ShopifyAuthExchangeResult) : ({ success: false } as ShopifyAuthExchangeResult);
    return { ...result, httpStatus: status };
  } catch {
    if (res.ok) {
      return { success: false, httpStatus: status, error: 'Invalid JSON' };
    }
    return { success: false, httpStatus: status, error: text };
  }
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
      const errorText = await res.text();
      throw new Error(`POST /shopify/auth/exchange (query) -> HTTP ${res.status}: ${errorText}`);
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
      const errorText = await res.text();
      console.error(`POST /shopify/auth/exchange failed. Status: ${res.status}, Body: ${errorText}`);
      throw new Error(`POST /shopify/auth/exchange (header) -> HTTP ${res.status}: ${errorText}`);
    }
    return await parseShopifyAuthExchangeResult(res);
  }

  console.error('Missing session token / id_token in exchangeShopifyAuth');
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
  
  // Try to configure via window object if possible, but don't crash if read-only
  try {
      w.shopify.config = w.shopify.config || {};
      if (!w.shopify.config.apiKey) w.shopify.config.apiKey = apiKey;
      if (!w.shopify.config.host) w.shopify.config.host = host;
      if (shop && !w.shopify.config.shop) {
        w.shopify.config.shop = shop;
      }
  } catch (e) {
      console.warn('Unable to write to window.shopify.config in ensureShopifyAppBridgeReady:', e);
  }

  const scriptId = 'shopify-app-bridge';
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!existing) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.setAttribute('data-api-key', apiKey);
    script.setAttribute('data-host', host);
    script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
    script.async = false; // Explicitly disable async to satisfy App Bridge requirements
    document.head.prepend(script);
  } else {
    if (!existing.getAttribute('data-api-key')) {
      existing.setAttribute('data-api-key', apiKey);
    }
    if (!existing.getAttribute('data-host')) {
      existing.setAttribute('data-host', host);
    }
  }

  const start = Date.now();
  console.log(`[AppBridge] Waiting for App Bridge ready... (apiKey=${apiKey}, host=${host})`);
  
  while (Date.now() - start < 10_000) {
    const current = (window as any).shopify;
    if (
      current &&
      (typeof current.idToken === 'function' ||
        typeof current.idToken?.get === 'function' ||
        typeof current.sessionToken?.get === 'function')
    ) {
      console.log('[AppBridge] Ready!');
      return;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  console.error('[AppBridge] Timeout waiting for window.shopify.idToken');
  throw new Error('Shopify App Bridge is not ready (Timeout)');
};

export const getShopifySessionToken = async (): Promise<string> => {
  const current = (window as any).shopify;
  if (current && typeof current.idToken === 'function') {
    return await current.idToken();
  }
  if (current && typeof current.idToken?.get === 'function') {
    return await current.idToken.get();
  }
  if (current && typeof current.sessionToken?.get === 'function') {
    return await current.sessionToken.get();
  }
  throw new Error('Missing Shopify session token');
};

export const fetchShopifyAgents = async (params: { shop: string; host?: string }): Promise<Agent[]> => {
  const { shop, host } = params;
  if (!shop) {
    throw new Error('Shop is required');
  }

  const apiKey = resolveShopifyApiKey();
  if (!apiKey || !host) {
    throw new Error('Missing Shopify App Bridge context');
  }

  await ensureShopifyAppBridgeReady({ apiKey: apiKey as string, host: host as string, shop });
  const sessionToken = await getShopifySessionToken();

  const endpoint = `${BASE_URL}/api/v1/shopify/auth/agents?shop=${encodeURIComponent(shop)}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${sessionToken}` }
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  const json = text ? JSON.parse(text) : {};
  const data = json && typeof json === 'object' && 'data' in json ? json.data : json;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to load agents');
  }

  return Array.isArray(data.agents) ? data.agents : [];
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

  let sessionToken: string | undefined;

  const canUseSessionToken = !!apiKey && !!host;
  if (canUseSessionToken) {
    await ensureShopifyAppBridgeReady({ apiKey: apiKey as string, host: host as string, shop });
    sessionToken = await getShopifySessionToken();
  }

  const result = await exchangeShopifyAuth({
    shop,
    host,
    tenantId,
    sessionToken,
    idTokenFromUrl: canUseSessionToken ? undefined : idTokenFromUrl
  });

  if (!result.success || !result.token) {
    throw new Error(result.error || 'Token exchange failed');
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


export const getShopFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop');
  
  // If shop is in URL, save it to sessionStorage for persistence across navigation
  if (shop) {
    try {
      sessionStorage.setItem('current_shop_context', shop);
    } catch (e) {
      console.error('Failed to save shop context', e);
    }
    return shop;
  }
  
  // Fallback to sessionStorage if not in URL
  try {
    return sessionStorage.getItem('current_shop_context');
  } catch (e) {
    return null;
  }
};

const getTokenKey = (): string => {
  const shop = getShopFromUrl();
  return shop ? `nexus_token_${shop}` : 'nexus_token';
};

const getUserKey = (): string => {
  const shop = getShopFromUrl();
  return shop ? `nexus_user_${shop}` : 'nexus_user';
};

export const tokenService = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(getTokenKey());
    } catch (error) {
      console.error("Could not access localStorage:", error);
      return null;
    }
  },

  setToken: (token: string): void => {
    try {
      localStorage.setItem(getTokenKey(), token);
    } catch (error) {
      console.error("Could not write to localStorage:", error);
    }
  },

  removeToken: (): void => {
    try {
      localStorage.removeItem(getTokenKey());
    } catch (error) {
      console.error("Could not remove from localStorage:", error);
    }
  },

  getUser: (): any | null => {
    try {
      const userStr = localStorage.getItem(getUserKey());
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Could not access localStorage user data:", error);
      return null;
    }
  },

  setUser: (user: any): void => {
    try {
      localStorage.setItem(getUserKey(), JSON.stringify(user));
    } catch (error) {
      console.error("Could not write user to localStorage:", error);
    }
  },

  removeUser: (): void => {
    try {
      localStorage.removeItem(getUserKey());
    } catch (error) {
      console.error("Could not remove user from localStorage:", error);
    }
  },

  getLanguage: (): string | null => {
    try {
      const shop = getShopFromUrl();
      const key = shop ? `agent_language_${shop}` : 'agent_language';
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },

  setLanguage: (lang: string): void => {
    try {
      const shop = getShopFromUrl();
      const key = shop ? `agent_language_${shop}` : 'agent_language';
      localStorage.setItem(key, lang);
    } catch (error) {
      console.error("Could not set language:", error);
    }
  },
  
  // Clean up all auth data for current context
  clearAuth: (): void => {
    const tokenKey = getTokenKey();
    const userKey = getUserKey();
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  }
};

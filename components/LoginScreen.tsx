import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ShieldCheck, AlertCircle, ChevronDown, Check, User } from 'lucide-react';
import api from '../services/api';
import { Agent } from '../types';
import { fetchShopifyAgents, getShopifySessionToken } from '../services/shopifyAuthService';

// Type for the successful login response data
interface LoginResponse {
  token: string;
  agent: Agent;
}

interface LoginScreenProps {
  onLoginSuccess: (data: LoginResponse) => void;
  shopifyMode?: boolean;
  shopifyShop?: string;
  shopifyHost?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, shopifyMode, shopifyShop, shopifyHost }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('admin@nexus.com');
  const [password, setPassword] = useState('Admin@123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (shopifyMode) {
      setEmail('');
      setPassword('');
    }
  }, [shopifyMode]);

  useEffect(() => {
    if (!shopifyMode) {
      return;
    }

    const loadAgents = async () => {
      if (!shopifyShop || !shopifyHost) {
        setError(t('shopify_missing_context'));
        return;
      }

      setLoadingAgents(true);
      setError(null);
      try {
        const list = await fetchShopifyAgents({ shop: shopifyShop, host: shopifyHost });
        setAgents(list);
        if (list.length > 0) {
          setSelectedAgentId(list[0].id);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('unknown_error');
        setError(errorMessage);
      } finally {
        setLoadingAgents(false);
      }
    };

    loadAgents();
  }, [shopifyMode, shopifyShop, shopifyHost, t]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (shopifyMode) {
        if (!selectedAgentId) {
          setError(t('shopify_login_missing_agent'));
          setIsLoading(false);
          return;
        }
        const sessionToken = await getShopifySessionToken();
        const response = await api.post<LoginResponse>('/auth/login', {
          agentId: selectedAgentId,
          password,
          shopifySessionToken: sessionToken,
          shop: shopifyShop
        });
        onLoginSuccess(response);
      } else {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });
        onLoginSuccess(response);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('unknown_error');
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f3f4f6] flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.05)] border border-white/50 w-full max-w-md relative z-10 mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-600/20 mb-6 transform rotate-3">
            N
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{t('welcome_back')}</h1>
          <p className="text-sm text-gray-500 mt-2 text-center max-w-[260px]">
            {t('signin_text')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3" role="alert">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{t('login_failed')}</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {shopifyMode ? (
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t('select_agent_label')}</label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => !loadingAgents && agents.length > 0 && setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full bg-gray-50 border ${isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'} text-gray-900 text-sm rounded-xl flex items-center justify-between p-3.5 outline-none transition-all hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed`}
                  disabled={loadingAgents || agents.length === 0}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {loadingAgents ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 size={16} className="animate-spin" />
                        <span>{t('loading')}</span>
                      </div>
                    ) : selectedAgentId ? (
                      (() => {
                        const agent = agents.find(a => a.id === selectedAgentId);
                        if (!agent) return <span>{t('select_agent_label')}</span>;
                        return (
                          <>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {agent.avatar ? (
                                <img src={agent.avatar} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                agent.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col items-start truncate">
                              <span className="font-medium text-gray-900 truncate">{agent.name}</span>
                              {agent.email && <span className="text-xs text-gray-500 truncate">{agent.email}</span>}
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <span className="text-gray-500">{agents.length === 0 ? t('no_other_agents') : t('select_agent_label')}</span>
                    )}
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </button>

                {isDropdownOpen && !loadingAgents && agents.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1 space-y-0.5">
                      {agents.map(agent => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                            selectedAgentId === agent.id 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                            selectedAgentId === agent.id ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {agent.avatar ? (
                              <img src={agent.avatar} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              agent.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex flex-col items-start flex-1 truncate">
                            <span className={`font-medium truncate ${selectedAgentId === agent.id ? 'text-blue-900' : 'text-gray-900'}`}>
                              {agent.name}
                            </span>
                            {agent.email && (
                              <span className={`text-xs truncate ${selectedAgentId === agent.id ? 'text-blue-600/80' : 'text-gray-500'}`}>
                                {agent.email}
                              </span>
                            )}
                          </div>
                          {selectedAgentId === agent.id && (
                            <Check size={16} className="text-blue-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t('work_email')}</label>
              <input 
                type="email" 
                required
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3.5 outline-none transition-all placeholder-gray-400" 
                placeholder="agent@nexushub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t('password')}</label>
            <input 
              type="password" 
              required
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3.5 outline-none transition-all placeholder-gray-400" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>



          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-semibold rounded-xl text-sm px-5 py-4 text-center transition-all shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{t('verifying')}</span>
              </>
            ) : (
              t('sign_in_btn')
            )}
          </button>
        </form>
        
        <div className="mt-10 flex items-center justify-center gap-2 text-gray-400 text-xs border-t border-gray-100 pt-6">
          <ShieldCheck size={14} className="text-green-500" />
          <span>{t('secure_ssl')}</span>
        </div>
      </div>
    </div>
  );
};
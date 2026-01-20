import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent } from '../types';
import { getAgents } from '../services/adminService';
import { Search, User, Check, Loader2, X, ChevronRight } from 'lucide-react';
import api from '../services/api';

interface AgentSwitcherProps {
  currentUser: Agent;
  onSwitchAgent: (agent: Agent, token: string) => void;
  onCancel: () => void;
}

export const AgentSwitcher: React.FC<AgentSwitcherProps> = ({ currentUser, onSwitchAgent, onCancel }) => {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const result = await getAgents(0, 100, 'name,asc');
      setAgents(result.content || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSelect = (agent: Agent) => {
    if (agent.id === currentUser.id) {
      return; // 不能切换到当前用户
    }
    setSelectedAgent(agent);
    setShowPasswordInput(true);
    setPassword('');
    setLoginError(null);
  };

  const handleSwitch = async () => {
    if (!selectedAgent || !password) {
      setLoginError(t('switch_agent_password_required'));
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const response = await api.post<{ token: string; agent: Agent }>('/auth/login', {
        email: selectedAgent.email,
        password: password
      });

      if (response && response.token && response.agent) {
        onSwitchAgent(response.agent, response.token);
      } else {
        setLoginError(t('switch_agent_login_failed'));
      }
    } catch (error: any) {
      console.error('Failed to switch agent:', error);
      setLoginError(error?.response?.data?.message || t('switch_agent_login_failed'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    if (agent.id === currentUser.id) return false; // 排除当前用户
    const query = searchQuery.toLowerCase();
    return agent.name.toLowerCase().includes(query) || 
           (agent.email && agent.email.toLowerCase().includes(query));
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{t('switch_agent_title')}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {!showPasswordInput ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search_agents_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                  <Loader2 size={16} className="animate-spin" /> {t('loading')}
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  {searchQuery ? t('no_agents_found') : t('no_other_agents')}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => handleAgentSelect(agent)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg text-left transition-colors border border-gray-100"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User size={20} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{agent.name}</p>
                        <p className="text-xs text-gray-500 truncate">{agent.email || ''}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{t('switch_agent_selected')}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{selectedAgent?.name}</p>
              <p className="text-xs text-gray-500 mt-1">{selectedAgent?.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enter_password')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSwitch();
                  }
                }}
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{loginError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordInput(false);
                  setSelectedAgent(null);
                  setPassword('');
                  setLoginError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isLoggingIn}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSwitch}
                disabled={!password || isLoggingIn}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('switching')}
                  </>
                ) : (
                  t('switch')
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent, ChatSession, ChatStatus, Message, MessageSender, QuickReply, Attachment, KnowledgeEntry, Role, Notification, ChatGroup, UserProfile, SessionCategory } from './types';
import { generateAIResponse, rewriteMessage, analyzeSentiment, suggestUserTags } from './services/geminiService';
import api from './services/api';
import websocketService, { ServerMessage } from './services/websocketService';
import notificationService from './services/notificationService';
import { transformSessionGroups } from './services/dataTransformer';
import * as adminService from './services/adminService';
import customerServiceAPI from './services/customerService';
import quickReplyServiceAPI from './services/quickReplyService';
import { ChatList } from './components/ChatList';
import { UserProfilePanel } from './components/UserProfilePanel';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { ChatArea } from './components/ChatArea';
import { TeamView } from './components/TeamView';
import { CustomerView } from './components/CustomerView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { WorkflowView } from './components/WorkflowView';
import sessionCategoryService from './services/sessionCategoryService';
import sessionService, { SessionSummaryPreview } from './services/sessionService';
import { billingApi, Subscription } from './services/billingApi';
import TransferDialog from './components/TransferDialog';
import { 
  CheckCircle, Check, AlertCircle, Info, PartyPopper, Zap, Play, Pause, X,
  ClipboardCheck, Loader2, User, ArrowRight, Sparkles, MessageCircle, FileText, Clock
} from 'lucide-react';

import { ShopifyAppProvider } from './components/shopify/ShopifyAppProvider';
import { ShopifyDashboard } from './components/shopify/ShopifyDashboard';
import { ShopifyInstall } from './components/shopify/ShopifyInstall';
import { ShopifyBilling } from './components/shopify/ShopifyBilling';
import { getShopifyLaunchParams, initiateShopifyInstall, probeShopifyExchange, saveShopifyLaunchParams } from './services/shopifyAuthService';
import { tokenService } from './services/tokenService';
import { AgentSwitcher } from './components/AgentSwitcher';
import { checkSubscriptionStatus, verifySubscription } from './services/shopifyBillingService';
import { Button } from '@shopify/polaris';
import { Toaster, toast } from 'sonner';

// Type for the successful login response data
interface LoginResponse {
  token: string;
  agent: Agent;
}

// Type for the bootstrap response data
interface BootstrapResponse {
  sessionGroups: any[];
  agent: Agent; // The current agent's data
  roles: Role[];
  quickReplies: QuickReply[];
  knowledgeBase: KnowledgeEntry[];
}

interface TransferNotification {
  sessionId: string;
  userName: string;
  avatar?: string;
  reason?: string;
  timestamp: number;
}

function App() {
  const { t } = useTranslation();

  const PERMISSION_DEFINITIONS = useMemo(() => [
    { key: 'viewAnalytics', label: t('permission_view_analytics_label'), description: t('permission_view_analytics_desc'), icon: 'BarChart' },
    { key: 'manageKnowledgeBase', label: t('permission_manage_knowledge_base_label'), description: t('permission_manage_knowledge_base_desc'), icon: 'Database' },
    { key: 'manageSystem', label: t('permission_manage_system_label'), description: t('permission_manage_system_desc'), icon: 'Settings' },
    { key: 'manageTeam', label: t('permission_manage_team_label'), description: t('permission_manage_team_desc'), icon: 'Users' },
    { key: 'deleteChats', label: t('permission_delete_chats_label'), description: t('permission_delete_chats_desc'), icon: 'Trash2' },
  ], [t]);
  const [loadingState, setLoadingState] = useState<'INITIALIZING' | 'LOADING' | 'READY' | 'ERROR'>('INITIALIZING');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isShopifyEmbedded, setIsShopifyEmbedded] = useState(false);
  const [isShopifyAuthenticated, setIsShopifyAuthenticated] = useState(false);
  const [shopifyInstalled, setShopifyInstalled] = useState(false);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [currentUser, setCurrentUser] = useState<Agent | null>(null);

  // ✅ 使用 ref 保存最新的 WebSocket 消息处理函数
  const wsMessageHandlerRef = useRef<((message: ServerMessage) => void) | null>(null);
  
  // ✅ 使用 ref 防止重复初始化
  const isInitialized = useRef(false);
  
  // ✅ 使用 ref 追踪正在获取的会话，防止重复调用
  const fetchingSessionsRef = useRef<Set<string>>(new Set());
  
  // ✅ 使用 ref 追踪已经调度的获取任务
  const scheduledFetchesRef = useRef<Set<string>>(new Set());

  // All data states, initialized to empty
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  // const [notifications, setNotifications] = useState<Notification[]>([]); // Deprecated: using sonner
  const [systemQuickReplies, setSystemQuickReplies] = useState<QuickReply[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [categories, setCategories] = useState<SessionCategory[]>([]);
  const [transferNotifications, setTransferNotifications] = useState<TransferNotification[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // UI States
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'INBOX' | 'TEAM' | 'CUSTOMERS' | 'ANALYTICS' | 'SETTINGS' | 'WORKFLOW'>('INBOX');
  const [isZenMode, setIsZenMode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [sentiment, setSentiment] = useState<{score: number, label: string}>({ score: 50, label: 'Neutral' });
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [currentAgentLanguage, setCurrentAgentLanguage] = useState<string>(tokenService.getLanguage() || 'en');
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [showAgentSwitcher, setShowAgentSwitcher] = useState(false);

  useEffect(() => {
    if (currentUser?.language) {
      setCurrentAgentLanguage(currentUser.language);
      tokenService.setLanguage(currentUser.language);
    }
  }, [currentUser]);

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [summaryPreview, setSummaryPreview] = useState<SessionSummaryPreview | null>(null);
  const [isPreparingResolution, setIsPreparingResolution] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setCurrentAgentLanguage(lang);
    tokenService.setLanguage(lang);
    if (currentUser) {
      setCurrentUser({ ...currentUser, language: lang });
    }
  };

  // Derived state for the current user's UI status
  const currentUserStatus = useMemo(() => {
    if (!currentUser) return 'IDLE';
    // Map backend 'OFFLINE' to UI 'IDLE'
    return currentUser.status === 'OFFLINE' ? 'IDLE' : currentUser.status;
  }, [currentUser]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const sortByOwnershipAndLastActive = useCallback((arr: ChatSession[]) => {
    return arr.sort((a, b) => {
      // Prioritize time first (Newest messages at top)
      return b.lastActive - a.lastActive;
    });
  }, []);
  const canManageSessionAgents = true;

  // 权限检查函数
  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (!currentUser || !currentUser.roleId || !roles.length) {
      return false;
    }
    const userRole = roles.find(r => r.id === currentUser.roleId);
    if (!userRole || !userRole.permissions) {
      return false;
    }
    return userRole.permissions[permissionKey] === true;
  }, [currentUser, roles]);

  const showToast = (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => {
    switch (type) {
      case 'SUCCESS':
        toast.success(message);
        break;
      case 'ERROR':
        toast.error(message);
        break;
      case 'INFO':
      default:
        toast.info(message);
        break;
    }
  };

  // Connect notification service to showToast on mount - DEPRECATED
  // NotificationService now uses sonner directly, but we keep this for compatibility if needed
  // or just remove it. Since we modified NotificationService to ignore setListener, we can remove this.
  // useEffect(() => {
  //   notificationService.setListener(showToast);
  // }, []);

  const handleWebSocketMessage = useCallback((message: ServerMessage) => {
    const messageId = Math.random().toString(36).substring(7);
    console.log(`📨 [${messageId}] Received WS Message:`, message);
    
    // ✅ 处理后端返回的 event 字段格式
    const eventType = message.type || (message as any).event;
    const payload = message.payload;
    
    switch (eventType) {
      case 'newMessage': {
        const { sessionId, message: backendMessage } = payload as { 
          sessionId: string; 
          message: {
            id: string;
            sessionId: string;
            senderType: string;
            agentId?: string;
            text: string;
            internal: boolean;
            messageType?: string; // Add messageType
            translationData?: any;
            mentions: string[];
            attachments: Attachment[];
            createdAt: string;
          } 
        };
        
        // ✅ 转换后端消息格式为前端 Message 格式
        const newMessage: Message = {
          id: backendMessage.id,
          text: backendMessage.text,
          sender: backendMessage.senderType === 'AGENT' ? MessageSender.AGENT : 
                  backendMessage.senderType === 'AI' ? MessageSender.AI : 
                  backendMessage.senderType === 'SYSTEM' ? MessageSender.SYSTEM : MessageSender.USER,
          timestamp: new Date(backendMessage.createdAt).getTime(),
          isInternal: backendMessage.internal,
          messageType: backendMessage.messageType, // Map messageType
          attachments: backendMessage.attachments,
          mentions: backendMessage.mentions,
          translation: backendMessage.translationData,
          translationData: backendMessage.translationData
        };
        
        // ✅ 使用函数式更新检查会话是否存在
        setSessions(prev => {
          const sessionExists = prev.some(s => s.id === sessionId);
          
          if (sessionExists) {
            const mapped = prev.map(s => {
              if (s.id === sessionId) {
                const isNewUnread = s.id !== activeSessionId;
                const isOwned = s.primaryAgentId === (currentUser?.id || '');
                const isMentioned = Array.isArray(newMessage.mentions) && (currentUser?.id ? newMessage.mentions.includes(currentUser.id) : false);
                const isUserMessage = newMessage.sender === MessageSender.USER;
                
                const shouldIncrement = (isUserMessage && isOwned) || isMentioned;
                const nextUnread = isNewUnread ? (shouldIncrement ? s.unreadCount + 1 : s.unreadCount) : 0;
                const nextLastActive = newMessage.timestamp;
                return {
                  ...s,
                  messages: s.messages ? [...s.messages, newMessage] : [newMessage],
                  lastMessage: newMessage,
                  lastActive: nextLastActive,
                  unreadCount: nextUnread,
                };
              }
              return s;
            });
            return sortByOwnershipAndLastActive(mapped);
          } else {
            // ✅ 检查是否已经调度过
            if (scheduledFetchesRef.current.has(sessionId)) {
              console.log(`⏭️ 会话 ${sessionId} 获取已调度，跳过`);
              return prev;
            }
            
            // ✅ 检查是否正在获取中
            if (fetchingSessionsRef.current.has(sessionId)) {
              console.log(`⏭️ 会话 ${sessionId} 正在获取中，跳过重复触发`);
              return prev;
            }
            
            // ✅ 标记为已调度和正在获取
            scheduledFetchesRef.current.add(sessionId);
            fetchingSessionsRef.current.add(sessionId);
            
            // ✅ 会话不存在且未在获取中，触发异步获取
            console.log(`🔍 [${messageId}] 会话 ${sessionId} 不存在，正在获取会话信息...`);
            // 在 setSessions 外部调用，避免闭包问题
            setTimeout(() => fetchAndAddNewSession(sessionId, newMessage), 0);
            return prev;
          }
        });
        if (sessionId === activeSessionId) {
          (async () => {
            try {
              await api.post(`/read-records/sessions/${sessionId}/mark-read`, {});
            } catch (error) {
              console.error('Failed to mark current session as read:', error);
            }
          })();
        }
        break;
      }
      case 'sessionUpdated': {
        // Fix: Handle nested session object in payload if present
        const sessionData = (payload as any).session || payload;

        // Check for Transfer to Human (Current Agent)
        if (sessionData.status === 'HUMAN_HANDLING' && 
            sessionData.primaryAgentId === currentUser?.id) {
            setTransferNotifications(prev => {
                if (prev.some(n => n.sessionId === sessionData.id)) return prev;
                return [...prev, {
                    sessionId: sessionData.id,
                    userName: sessionData.customer?.name || 'Unknown User',
                    avatar: sessionData.customer?.avatarUrl,
                    reason: sessionData.lastMessage?.text || 'Transfer Request',
                    timestamp: Date.now()
                }];
            });
        }
        
        setSessions(prev => {
          const mapped = prev.map(s => {
            if (s.id === sessionData.id) {
              // Merge updates to preserve existing fields (like messages/user) if they are missing in the update
              const updated = { ...s, ...sessionData };
              // ✅ Ensure lastActive does not regress (go backwards in time)
              // If the update has an older lastActive (or none), keep the current one
              if (s.lastActive > (updated.lastActive || 0)) {
                updated.lastActive = s.lastActive;
              }
              return updated;
            }
            return s;
          });
          return sortByOwnershipAndLastActive(mapped);
        });
        
        if (sessionData.status === ChatStatus.RESOLVED) {
          setShowConfetti(true);
        }
        break;
      }
      case 'userProfileUpdated': {
          const updatedUser = payload as UserProfile;
          setSessions(prev => prev.map(s => {
              if (s.userId === updatedUser.id) {
                  return { ...s, user: updatedUser };
              }
              return s;
          }));
          break;
      }
      case 'agentStatusChanged': {
        const { agentId, status } = payload as { agentId: string; status: Agent['status'] };
        setAgents(prev => prev.map(a => (a.id === agentId ? { ...a, status } : a)));

        // If the update is for the current user, update their state object as well
        if (currentUser && agentId === currentUser.id) {
          setCurrentUser(prevUser => ({ ...prevUser!, status }));
        }
        break;
      }
      case 'notification': {
        const { type, message: notifMessage } = payload as { type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string };
        showToast(type, notifMessage);
        break;
      }
      default:
        console.warn('Unhandled WebSocket message event:', eventType);
    }
  }, [activeSessionId, currentUser]);

  // ✅ 更新 ref 以保存最新的处理函数
  useEffect(() => {
    wsMessageHandlerRef.current = handleWebSocketMessage;
  }, [handleWebSocketMessage]);


  const fetchBootstrapData = useCallback(async (loggedInUser: Agent, token: string) => {
    setLoadingState('LOADING');
    try {
      console.log('📡 调用 Bootstrap API');
      const data = await api.get<BootstrapResponse>('/bootstrap');
      
      // ✅ 转换后端返回的 sessionGroups 数据
      const { groups, sessions } = transformSessionGroups(data.sessionGroups || []);
      
      const ownerId = data.agent?.id || loggedInUser.id;
      const normalized = sessions.map(s => ({
        ...s,
        unreadCount: s.primaryAgentId === ownerId ? s.unreadCount : 0,
      }));
      const sortedNormalized = [...normalized].sort((a,b) => b.lastActive - a.lastActive);
      const defaultSessionId = sortedNormalized.length > 0 ? sortedNormalized[0].id : undefined;
      if (defaultSessionId) {
        setActiveSessionId(defaultSessionId);
      }
      setSessions(sortByOwnershipAndLastActive(sortedNormalized.map(s => (defaultSessionId && s.id === defaultSessionId) ? { ...s, unreadCount: 0 } : s)));
      setChatGroups(groups);  // ✅ 使用转换后的 groups
      setRoles(data.roles || []);
      setSystemQuickReplies(data.quickReplies || []);
      setKnowledgeBase(data.knowledgeBase || []);
      try {
        const cats = await sessionCategoryService.getEnabledCategories();
        setCategories(cats);
      } catch (e) {}

      // The bootstrap response now provides the current agent object directly.
      if (data.agent) {
        setCurrentUser(data.agent);
      } else {
        // Fallback to localStorage user if bootstrap doesn't provide one.
        setCurrentUser(loggedInUser);
      }

      // Fetch subscription data
      try {
        const subData = await billingApi.getCurrentSubscription();
        setSubscription(subData);
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }

      // The full agent list for Team View will be loaded on demand.
      setAgents([]);

      if (defaultSessionId) {
        try {
          await api.post(`/read-records/sessions/${defaultSessionId}/mark-read`, {});
        } catch (error) {
          console.error('Failed to mark default session messages as read:', error);
        }
      }
      
      // ✅ 只在首次加载时连接 WebSocket，避免重复连接
      if (!websocketService.isConnected()) {
        websocketService.connect(token, (msg) => {
          // 使用 ref 调用最新的处理函数，避免闭包问题
          wsMessageHandlerRef.current?.(msg);
        });
      }
      setLoadingState('READY');
    } catch (error) {
      console.error("Failed to fetch bootstrap data:", error);
      showToast('ERROR', t('error_load_workspace'));
      setLoadingState('ERROR');
      handleLogout();
    }
  }, []); // ✅ 移除依赖，使用 ref 或在函数内部处理

  useEffect(() => {
    // ✅ 防止 Strict Mode 导致的重复调用
    if (isInitialized.current) {
      // console.log('⏭️ 跳过重复初始化 (Strict Mode)');
      // return;
    }
    isInitialized.current = true;
    
    const urlParams = new URLSearchParams(window.location.search);
    const launchParams = getShopifyLaunchParams();
    const shop = launchParams.shop;
    const host = launchParams.host;
    const tenantId = launchParams.tenantId;

    if (shop) {
      setIsShopifyEmbedded(true);
      saveShopifyLaunchParams({ shop, host, tenantId });
      
      const confirmBilling = urlParams.get('confirm_billing');
      const planId = urlParams.get('plan_id');
      const chargeId = urlParams.get('charge_id');

      // Check for billing callback in top frame without session (likely due to storage partitioning)
      // We must redirect back to Shopify Admin to regain access to the embedded session.
      const isTopFrame = window.top === window.self;
      const hasToken = !!localStorage.getItem('nexus_token');
      
      if (confirmBilling && isTopFrame && !hasToken) {
         const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY;
         if (apiKey) {
            // Extract shop name from domain (e.g. store.myshopify.com -> store)
            const shopName = shop.replace('.myshopify.com', '');
            const adminUrl = `https://admin.shopify.com/store/${shopName}/apps/${apiKey}${window.location.search}`;
            console.log('Redirecting back to Shopify Admin to restore session:', adminUrl);
            window.location.href = adminUrl;
            return;
         }
      }

      const ensureBackendAgentSession = async (): Promise<boolean> => {
        const existingToken = tokenService.getToken();
        const existingUser = tokenService.getUser();

        if (existingToken && existingUser) {
          try {
            const loggedInUser: Agent = existingUser;
            setIsAuthenticated(true);
            setCurrentUser(loggedInUser);
            fetchBootstrapData(loggedInUser, existingToken);
            return true;
          } catch (e) {
            tokenService.removeToken();
            tokenService.removeUser();
          }
        }

        try {
          const probe = await probeShopifyExchange(shop);
          if (!probe.success) {
            if (probe.error === 'Shop not installed') {
              console.warn('Shopify probe: Shop not installed. Redirecting to install.');
              setShopifyInstalled(false);
              return false;
            }

            // Installed but no agent session yet, show login screen
            console.log('Shopify probe: Shop installed, waiting for login.');
            setShopifyInstalled(true);
            saveShopifyLaunchParams({ shop: shop, host: host || null, tenantId: probe.tenantId || tenantId || null });
            return false;
          }

          // If probe success but no local token, do not auto-login
          setShopifyInstalled(true);
          saveShopifyLaunchParams({ shop: probe.shop || shop, host: host || null, tenantId: probe.tenantId || tenantId || null });
          return false;
        } catch (e: any) {
          console.error('Failed to establish agent session for Shopify store:', e);
          const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : String(e);
          const normalized = msg || 'Unknown authentication error';
          const likelyNeedsInstall =
            /Missing Shopify session token/i.test(normalized) ||
            /Token exchange failed/i.test(normalized) ||
            /HTTP\s*(401|403|404)\b/i.test(normalized);
          setAuthError(likelyNeedsInstall ? null : normalized);
          return false;
        }
      };

      const finalizeStartup = async () => {
        setCheckingSubscription(true);

        const hasAgentSession = await ensureBackendAgentSession();
        if (!hasAgentSession) {
          setIsShopifyAuthenticated(false);
          setCheckingSubscription(false);
          setLoadingState('READY'); // Ensure we show the UI (ShopifyInstall)
          return;
        }

        setIsShopifyAuthenticated(true);

        try {
          const subStatus = await checkSubscriptionStatus(shop);
          console.log('[App] Subscription status check:', subStatus);
          setIsSubscriptionActive(subStatus.active);
        } catch (e) {
          console.error('[App] Failed to check subscription', e);
          setIsSubscriptionActive(false);
        } finally {
          setCheckingSubscription(false);
          setActiveView('INBOX');
        }
      };

      if (confirmBilling && chargeId && planId) {
          // Verify billing then start
          verifySubscription(shop, chargeId, planId).then(success => {
             if (success) {
                 toast.success(t('billing.payment_success'));
                 window.history.replaceState({}, document.title, `/?shop=${shop}&is_embedded=1`);
                 finalizeStartup();
             } else {
                 toast.error(t('billing.payment_failed'));
                 setCheckingSubscription(false);
                 setIsShopifyAuthenticated(true); // Still auth'd, just failed billing
             }
          });
      } else if (planId === 'FREE') { // Handle Free Plan Redirect
           // Assuming Free plan doesn't have a chargeId, but we redirected with plan_id=FREE
           // Let's verify/activate free plan directly
           // Backend's verifySubscription might need chargeId, but for free plan we might not have one or use dummy
           
           // Actually, if we look at ShopifyBillingService.java, for FREE plan it returns returnUrl immediately.
           // So the URL would look like /?shop=...&planId=FREE (we need to make sure frontend passes this param if it's not standard)
           // Wait, my frontend code in createSubscription sends returnUrl. 
           // If backend returns returnUrl immediately for Free plan, it's just a redirect back.
           // But verifySubscription requires chargeId.
           
           // Let's check how I implemented backend createSubscription for FREE plan:
           // It updates local DB and returns returnUrl.
           // So when we come back, we are already "subscribed" in DB.
           // We just need to reload/check status.
           
           // So if we have plan_id=FREE but no charge_id, we should just proceed to finalizeStartup
           // which calls checkSubscriptionStatus.
           
           window.history.replaceState({}, document.title, `/?shop=${shop}&is_embedded=1`);
           finalizeStartup();
           
      } else {
        if (tenantId) {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.delete('tenantId');
          nextUrl.searchParams.delete('tenant_id');
          nextUrl.searchParams.set('shop', shop);
          if (host) {
            nextUrl.searchParams.set('host', host);
          }
          nextUrl.searchParams.set('is_embedded', '1');
          window.history.replaceState({}, document.title, `${nextUrl.pathname}${nextUrl.search}`);
        }
        finalizeStartup();
      }

      return;
    }

    const token = tokenService.getToken();
    const loggedInUser = tokenService.getUser();
    if (token && loggedInUser) {
      try {
        setIsAuthenticated(true);
        setCurrentUser(loggedInUser);
        fetchBootstrapData(loggedInUser, token);
        isInitialized.current = true; // ✅ 标记已初始化
      } catch (e) {
        handleLogout();
        setLoadingState('READY');
      }
    } else {
      setLoadingState('READY');
    }
  }, []); // ✅ 只在组件挂载时执行一次

  const loadTeamData = async () => {
    try {
      const teamAgents = await adminService.getAgents(0, 1000, 'name');
      setAgents(teamAgents.content);
    } catch (error) {
      console.error("Failed to load team data:", error);
      showToast('ERROR', t('failed_load_team'));
    }
  };

  useEffect(() => {
    if (activeView === 'TEAM' && agents.length === 0) {
      loadTeamData();
    }
  }, [activeView, agents.length]);

  const handleLoginSuccess = (data: LoginResponse) => {
    tokenService.setToken(data.token);
    tokenService.setUser(data.agent);
    setIsAuthenticated(true);
    setCurrentUser(data.agent);
    fetchBootstrapData(data.agent, data.token);

    if (isShopifyEmbedded) {
      setIsShopifyAuthenticated(true);
      setShopifyInstalled(true);
      const { shop } = getShopifyLaunchParams();
      if (shop) {
        setCheckingSubscription(true);
        checkSubscriptionStatus(shop)
          .then(subStatus => {
            setIsSubscriptionActive(subStatus.active);
          })
          .catch(err => {
            console.error('[App] Failed to check subscription after login', err);
            setIsSubscriptionActive(false);
          })
          .finally(() => {
            setCheckingSubscription(false);
            setActiveView('INBOX');
          });
      }
    }
  };

  const handleLogout = () => {
    websocketService.disconnect();
    tokenService.removeToken();
    tokenService.removeUser();
    setIsAuthenticated(false);
    setIsShopifyAuthenticated(false); // Reset Shopify authentication state
    setCurrentUser(null);
    setSessions([]);
    setAgents([]);
    setChatGroups([]);
    setRoles([]);
    setSystemQuickReplies([]);
    setKnowledgeBase([]);
    setActiveSessionId(null);
    showToast('INFO', t('logout_success'));
  };

  const handleSwitchAgent = async (agent: Agent, token: string) => {
    try {
      // 保存新的 token 和用户信息
      tokenService.setToken(token);
      tokenService.setUser(agent);
      
      // 断开旧的 WebSocket 连接
      websocketService.disconnect();
      
      // 更新当前用户
      setCurrentUser(agent);
      setIsAuthenticated(true);
      
      // 重新获取数据
      await fetchBootstrapData(agent, token);
      
      // 关闭切换对话框
      setShowAgentSwitcher(false);
      
      showToast('SUCCESS', t('switch_agent_success'));
    } catch (error) {
      console.error('Failed to switch agent:', error);
      showToast('ERROR', t('switch_agent_failed'));
    }
  };

  /**
   * 处理会话选择，设置 activeSessionId 并将未读消息数清零
   */
  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    
    // 将选中会话的未读消息数清零
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, unreadCount: 0 } : s
    ));
    
    try {
      // 调用后端 API 标记消息为已读
      await api.post(`/read-records/sessions/${sessionId}/mark-read`, {});
      
      // 如果会话的 user.notes 为空，从后端获取会话备注
      const session = sessions.find(s => s.id === sessionId);
      if (session && session.user && !session.user.notes) {
        const note = await customerServiceAPI.getSessionNote(sessionId);
        if (note) {
          setSessions(prev => prev.map(s => {
            if (s.id === sessionId && s.user) {
              return {
                ...s,
                user: {
                  ...s.user,
                  notes: note
                }
              };
            }
            return s;
          }));
        }
      }
      
      // 每次加载会话窗口时调用快捷回复列表
      const quickReplies = await quickReplyServiceAPI.getAllQuickReplies(currentUser?.id);
      setSystemQuickReplies(quickReplies);
    } catch (error) {
      console.error('Failed to handle session selection:', error);
    }
  };

  // ==================== 分组管理功能 ====================
  
  /**
   * 创建新分组
   */
  const handleCreateGroup = async (name: string): Promise<ChatGroup> => {
    if (!name.trim()) {
      showToast('ERROR', 'Group name cannot be empty');
      return;
    }

    try {
      const newGroup = await api.post<ChatGroup>('/session-groups', {
        name: name.trim(),
        icon: 'folder',
        color: '#2196F3'
      });

      setChatGroups(prev => [...prev, newGroup]);
      showToast('SUCCESS', `Group "${name}" created`);
      return newGroup;
    } catch (error) {
      console.error('Failed to create group:', error);
      showToast('ERROR', 'Failed to create group');
      throw error;
    }
  };

  /**
   * 删除分组
   */
  const handleDeleteGroup = async (groupId: string) => {
    const group = chatGroups.find(g => g.id === groupId);
    
    if (!group) {
      showToast('ERROR', 'Group not found');
      return;
    }

    if (group.isSystem) {
      showToast('ERROR', 'Cannot delete system groups');
      return;
    }

    try {
      const response = await api.delete<{ defaultGroupId: string }>(`/session-groups/${groupId}`);
      
      // 从 API 响应中获取默认分组 ID
      const defaultGroupId = response.defaultGroupId;
      
      setChatGroups(prev => prev.filter(g => g.id !== groupId));
      
      // 将该分组下的所有会话转移到默认分组
      setSessions(prev => prev.map(s => 
        s.groupId === groupId ? { ...s, groupId: defaultGroupId } : s
      ));
      
      showToast('SUCCESS', `Group "${group.name}" deleted, sessions moved to default group`);
    } catch (error) {
      console.error('Failed to delete group:', error);
      showToast('ERROR', 'Failed to delete group');
    }
  };

  /**
   * 重命名分组
   */
  const handleRenameGroup = async (groupId: string, newName: string): Promise<void> => {
    if (!newName.trim()) {
      showToast('ERROR', 'Group name cannot be empty');
      return;
    }

    const group = chatGroups.find(g => g.id === groupId);
    
    if (!group) {
      showToast('ERROR', 'Group not found');
      return;
    }

    if (group.isSystem) {
      showToast('ERROR', 'Cannot rename system groups');
      return;
    }

    try {
      const updatedGroup = await api.put<ChatGroup>(`/session-groups/${groupId}`, {
        name: newName.trim()
      });

      setChatGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, name: updatedGroup.name } : g
      ));
      
      showToast('SUCCESS', `Group renamed to "${newName}"`);
    } catch (error) {
      console.error('Failed to rename group:', error);
      showToast('ERROR', 'Failed to rename group');
      throw error;
    }
  };

  /**
   * 移动会话到指定分组
   */
  const handleMoveSession = async (sessionId: string, targetGroupId: string) => {
    try {
      await api.post(`/session-groups/${targetGroupId}/sessions/${sessionId}`, {});
      
      // 更新本地状态
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, groupId: targetGroupId } : s
      ));
      
      const targetGroup = chatGroups.find(g => g.id === targetGroupId);
      showToast('SUCCESS', `Moved to "${targetGroup?.name || 'group'}"`);
    } catch (error) {
      console.error('Failed to move session:', error);
      showToast('ERROR', 'Failed to move session');
    }
  };

  // ==================== End 分组管理功能 ====================


  useEffect(() => {
    if (activeSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, unreadCount: 0 } : s
      ));
      
      loadSessionDetail(activeSessionId);

      // ✅ 加载会话消息（如果还未加载）
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession && !activeSession.messages) {
        loadSessionMessages(activeSessionId);
      }
    }
  }, [activeSessionId]);
  
  // ✅ 加载会话消息的函数
  const loadSessionMessages = async (sessionId: string) => {
    try {
      // 后端返回分页对象，消息列表在 content 中
      const response = await api.get<{ content: any[] }>(`/chat/sessions/${sessionId}/messages`);
      
      // 转换后端消息格式为前端格式
      const messages: Message[] = (response.content || []).map(backendMsg => ({
        id: backendMsg.id,
        text: backendMsg.text,
        sender: backendMsg.senderType === 'AGENT' ? MessageSender.AGENT : 
                backendMsg.senderType === 'USER' ? MessageSender.USER : 
                backendMsg.senderType === 'AI' ? MessageSender.AI : MessageSender.SYSTEM,
        timestamp: new Date(backendMsg.createdAt).getTime(),
        isInternal: backendMsg.internal || false,
        messageType: backendMsg.messageType, // Map messageType
        attachments: backendMsg.attachments || [],
        mentions: backendMsg.mentionAgentIds || [],
        translationData: backendMsg.translationData
      })).reverse();
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, messages } : s
      ));
    } catch (error) {
      console.error('Failed to load session messages:', error);
      showToast('ERROR', 'Failed to load messages');
      // 如果加载失败，至少设置为空数组避免重复请求
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, messages: [] } : s
      ));
    }
  };

  const loadSessionDetail = async (sessionId: string) => {
    try {
      const detail = await api.get<any>(`/chat/sessions/${sessionId}`);
      setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        const userUpdate = detail.user ? {
          name: detail.user.name ?? s.user.name,
          email: detail.user.email ?? s.user.email,
          phone: detail.user.phone ?? s.user.phone,
          tags: Array.isArray(detail.user.tags) ? detail.user.tags : s.user.tags,
          aiTags: Array.isArray(detail.user.aiTags) ? detail.user.aiTags : s.user.aiTags,
          notes: (detail.note ?? s.user.notes)
        } : s.user;
        return {
          ...s,
          status: (detail.status ?? s.status),
          lastActive: (detail.lastActive ?? s.lastActive),
          unreadCount: (sessionId === activeSessionId ? 0 : (detail.unreadCount ?? s.unreadCount)),
          groupId: (detail.groupId ?? s.groupId),
          primaryAgentId: (detail.primaryAgentId ?? s.primaryAgentId),
          supportAgentIds: Array.isArray(detail.supportAgentIds) ? detail.supportAgentIds : s.supportAgentIds,
          agents: Array.isArray(detail.agents) ? detail.agents.map((a: any) => ({ id: a.id, name: a.name, avatar: a.avatar, isPrimary: !!a.isPrimary })) : s.agents,
          categoryId: (detail.categoryId ?? detail.category?.id ?? s.categoryId),
          category: (detail.category ?? s.category),
          lastMessage: (detail.lastMessage ?? s.lastMessage),
          user: { ...s.user, ...userUpdate }
        };
      }));
    } catch (error) {
      console.error('Failed to load session detail:', error);
    }
  };

  const addSupportAgent = async (agentId: string) => {
    if (!activeSessionId) return;
    try {
      showToast('INFO', 'Assigning support agent...');
      await sessionService.assignSupportAgent(activeSessionId, agentId);
      showToast('SUCCESS', 'Support agent assigned');
      await loadSessionDetail(activeSessionId);
    } catch (error) {
      console.error('Failed to assign support agent:', error);
      showToast('ERROR', 'Failed to assign support agent');
    }
  };

  const removeSupportAgent = async (agentId: string) => {
    if (!activeSessionId) return;
    const sess = sessions.find(s => s.id === activeSessionId);
    const target = sess?.agents?.find(a => a.id === agentId);
    if (target?.isPrimary) {
      showToast('ERROR', 'Primary agent cannot be removed');
      return;
    }
    try {
      showToast('INFO', 'Removing support agent...');
      await sessionService.removeSupportAgent(activeSessionId, agentId);
      showToast('SUCCESS', 'Support agent removed');
      await loadSessionDetail(activeSessionId);
    } catch (error) {
      console.error('Failed to remove support agent:', error);
      showToast('ERROR', 'Failed to remove support agent');
    }
  };
  
  // ✅ 获取新会话并添加到列表
  const fetchAndAddNewSession = async (sessionId: string, firstMessage: Message) => {
    try {
      console.log(`📡 正在获取会话信息: ${sessionId}`);
      const sessionData = await api.get<any>(`/chat/sessions/${sessionId}`);
      
      // ✅ 后端返回的是 user 而不是 customer
      const userData = sessionData.user;
      
      if (!userData) {
        console.error('❌ 会话数据中没有 user 字段:', sessionData);
        showToast('ERROR', 'Invalid session data');
        return;
      }
      
      // ✅ Find default group ID from existing groups if not provided
      const defaultGroupId = chatGroups.find(g => g.isSystem)?.id || (chatGroups.length > 0 ? chatGroups[0].id : 'inbox');
      const targetGroupId = sessionData.sessionGroupId || sessionData.groupId || defaultGroupId;
      
      const messageTimestamp = firstMessage.timestamp && !isNaN(firstMessage.timestamp) ? firstMessage.timestamp : Date.now();

      // 转换后端会话数据为前端格式
      const newSession: ChatSession = {
        id: sessionData.id,
        userId: userData.id,
        user: {
          id: userData.id,
          name: userData.name || 'Unknown User',
          avatar: userData.avatar,
          source: userData.source || 'WEB',
          tags: userData.tags || [],
          aiTags: userData.aiTags || [],
          email: userData.email,
          phone: userData.phone,
          location: userData.location,
          notes: userData.notes || ''
        },
        messages: [firstMessage], // 包含第一条消息
        lastMessage: firstMessage,
        status: sessionData.status,
        lastActive: messageTimestamp,
        unreadCount: 1, // 新会话有1条未读消息
        groupId: targetGroupId,
        primaryAgentId: sessionData.primaryAgent?.id || '',
        supportAgentIds: sessionData.supportAgentIds || []
      };
      
      // 添加到会话列表顶部（检查是否已存在）
      setSessions(prev => {
        console.log('💾 setSessions 被调用');
        console.log('  当前会话列表长度:', prev.length);
        console.log('  当前会话列表 ID:', prev.map(s => s.id));
        console.log('  要添加的会话 ID:', sessionId);
        
        // ✅ 再次检查会话是否已存在（可能在异步期间被其他地方添加了）
        const alreadyExists = prev.some(s => s.id === sessionId);
        if (alreadyExists) {
          console.log('⚠️ 会话已存在，跳过添加');
          return prev;
        }
        
        const newList = [newSession, ...prev];
        console.log('  新会话列表长度:', newList.length);
        console.log('  新列表第一个会话ID:', newList[0].id);
        console.log('  返回新列表 (Sorted)');
        
        // ✅ 验证：确保新会话在列表中
        const verifyExists = newList.some(s => s.id === sessionId);
        console.log('  验证新会话是否在列表中:', verifyExists);
        
        return sortByOwnershipAndLastActive(newList);
      });
      
      // ✅ 验证状态是否真的更新了（延迟检查）
      setTimeout(() => {
        console.log('🔍 [延迟检查] 当前 chatGroups:', chatGroups.map(g => ({ id: g.id, name: g.name })));
        console.log('🔍 [延迟检查] 新会话的 sessionGroupId:', sessionData.sessionGroupId);
        console.log('🔍 [延迟检查] 新会话的 groupId:', sessionData.groupId);
      }, 3000);
      
      console.log(`✅ 新会话已添加: ${userData.name}`);
      showToast('INFO', `New conversation from ${userData.name}`);
    } catch (error) {
      console.error('❌ 获取会话信息失败:', error);
      showToast('ERROR', 'Failed to load new conversation');
    } finally {
      // ✅ 无论成功或失败，都移除标记
      fetchingSessionsRef.current.delete(sessionId);
      scheduledFetchesRef.current.delete(sessionId);
    }
  };
  
  const handleSendMessage = (text: string, attachments: Attachment[], isInternal: boolean, isTranslationEnabled: boolean, mentions: string[]) => {
    if (!activeSessionId || !currentUser) return;
    
    // Parse messageType for optimistic UI update
    let messageType = 'TEXT';
    let displayContent = text;
    
    if (text.startsWith('card#')) {
        const parts = text.split('#', 3);
        if (parts.length >= 3) {
            messageType = parts[1];
            displayContent = parts[2];
        }
    }

    // ✅ 立即在本地聊天框中插入消息
    const newMessage: Message = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // 临时ID
      text: displayContent,
      sender: MessageSender.AGENT,
      timestamp: Date.now(),
      isInternal,
      messageType, // Set parsed messageType
      attachments,
      mentions
    };
    
    // ✅ 立即更新 UI
    setSessions(prev => {
      const mapped = prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: s.messages ? [...s.messages, newMessage] : [newMessage],
            lastMessage: newMessage,
            lastActive: newMessage.timestamp,
          };
        }
        return s;
      });
      return sortByOwnershipAndLastActive(mapped);
    });
    
    // ✅ 发送到服务器
    websocketService.sendEvent('sendMessage', {
      sessionId: activeSessionId,
      text: text, // 传递包含 card# 前缀的原始文本，后端会自动解析 MessageType
      isInternal,
      attachments: attachments.map(att => ({
        type: att.type,
        url: att.url,
        name: att.name,
        sizeKb: att.size ? parseFloat(att.size.replace(' KB', '')) : 0
      })),
      mentions
    });
  };
  
  // Load summary preview when resolve modal opens
  useEffect(() => {
    if (showResolveModal && activeSessionId) {
      const loadPreview = async () => {
        setIsGeneratingSummary(true);
        setSummaryPreview(null);
        try {
          const preview = await sessionService.previewSessionSummary(activeSessionId);
          setSummaryPreview(preview);
        } catch (error) {
          console.error('Failed to load summary preview:', error);
          showToast('ERROR', 'Failed to load summary preview');
        } finally {
          setIsGeneratingSummary(false);
        }
      };
      loadPreview();
    }
  }, [showResolveModal, activeSessionId]);

  const confirmResolution = async () => {
    if (!activeSessionId) return;
    setIsPreparingResolution(true);
    try {
      const response = await sessionService.resolveSession(activeSessionId);
      
      // Update local session state immediately
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          // Merge the updated session data
          return { ...s, ...response.session };
        }
        return s;
      }));
      
      setShowResolveModal(false);
      setShowConfetti(true);
      showToast('SUCCESS', t('session_resolved_success'));
    } catch (error) {
      console.error('Failed to resolve session:', error);
      showToast('ERROR', t('failed_resolve_session'));
    } finally {
      setIsPreparingResolution(false);
    }
  };

  const toggleSessionStatus = () => {
    if (!activeSessionId || !activeSession) return;
    
    const newAction = activeSession.status === ChatStatus.AI_HANDLING 
      ? 'HUMAN_HANDLING' 
      : 'AI_HANDLING';

    websocketService.sendEvent('updateSessionStatus', {
      sessionId: activeSessionId,
      action: newAction
    });
  };

  const handleTransferChat = (newOwnerId: string) => {
    if (!activeSessionId) return;
    websocketService.sendEvent('updateSessionStatus', {
      sessionId: activeSessionId,
      action: 'TRANSFER',
      payload: { newOwnerAgentId: newOwnerId }
    });
    setShowTransferModal(false);
  };

  const handleUpdateTags = async (userId: string, tags: string[], isAiTag = false) => {
    try {
      const session = sessions.find(s => s.userId === userId && s.user);
      if (!session || !session.user) return;
      
      const currentTags = isAiTag ? session.user.aiTags || [] : session.user.tags;
      
      // 找出需要添加的标签
      const tagsToAdd = tags.filter(tag => !currentTags.includes(tag));
      // 找出需要删除的标签
      const tagsToRemove = currentTags.filter(tag => !tags.includes(tag));
      
      // 对于AI标签
      if (isAiTag) {
        // 先删除不需要的AI标签
        for (const tag of tagsToRemove) {
          await customerServiceAPI.removeCustomerAiTag(userId, tag);
        }
        
        // 注意：根据API文档，AI标签只能由AI系统添加，所以这里不添加新的AI标签
        // 如果需要添加AI标签，应该通过AI系统的API
      } else {
        // 对于手动标签，先删除不需要的标签
        for (const tag of tagsToRemove) {
          await customerServiceAPI.removeCustomerManualTag(userId, tag);
        }
        
        // 再添加新标签
        for (const tag of tagsToAdd) {
          await customerServiceAPI.addCustomerManualTag(userId, tag);
        }
      }
      
      // 更新本地状态
      setSessions(prev => prev.map(s => {
        if (s.userId === userId && s.user) {
          return {
            ...s,
            user: {
              ...s.user,
              [isAiTag ? 'aiTags' : 'tags']: tags
            }
          };
        }
        return s;
      }));
    } catch (error) {
      console.error('Failed to update tags:', error);
      showToast('ERROR', t('failed_update_tags'));
    }
  };

  const handleUpdateNotes = async (sessionId: string, notes: string) => {
    try {
      // 更新会话备注
      await customerServiceAPI.updateSessionNote(sessionId, notes);
      
      // 更新本地状态
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId && s.user) {
          return {
            ...s,
            user: {
              ...s.user,
              notes
            }
          };
        }
        return s;
      }));
    } catch (error) {
      console.error('Failed to update notes:', error);
      showToast('ERROR', t('failed_update_notes'));
    }
  };
  
  const handleStatusChange = (status: 'ONLINE' | 'BUSY' | 'IDLE') => {
    if (!currentUser) return;
    const backendStatus = status === 'IDLE' ? 'OFFLINE' : status;
    // Send the event to the server, the UI will update via WebSocket
    websocketService.sendEvent('changeAgentStatus', {
      status: backendStatus
    });
    setShowProfileMenu(false);
  };
  
  // Handlers for other views (Team, Settings) would also be refactored to use API/WebSockets.
  // For now, these are placeholder functions.
  const handleAddAgent = (name: string, roleId: string) => showToast('INFO', `TODO: Add agent ${name} with role ${roleId}`);
  const handleUpdateAgent = (agent: Agent) => showToast('INFO', `TODO: Update agent ${agent.name}`);
  const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Unknown';
  const handleAddSystemReply = async (label: string, text: string, category: string) => {
    try {
      if (!currentUser?.id) {
        showToast('ERROR', t('user_not_authenticated'));
        return;
      }
      
      const newReply = await quickReplyServiceAPI.createSystemQuickReply({
        label,
        text,
        category
      }, currentUser.id);
      setSystemQuickReplies(prev => [...prev, newReply]);
      showToast('SUCCESS', t('system_reply_added'));
    } catch (error) {
      console.error('Failed to add system reply:', error);
      showToast('ERROR', t('failed_add_system_reply'));
    }
  };

  const onDeleteSystemReply = async (id: string) => {
    try {
      if (!currentUser?.id) {
        showToast('ERROR', t('user_not_authenticated'));
        return;
      }
      
      await quickReplyServiceAPI.deleteQuickReply(id, currentUser.id);
      setSystemQuickReplies(prev => prev.filter(reply => reply.id !== id));
      showToast('SUCCESS', t('system_reply_deleted'));
    } catch (error) {
      console.error('Failed to delete system reply:', error);
      showToast('ERROR', t('failed_delete_system_reply'));
    }
  };

  const onAddKnowledge = (title: string, content: string) => showToast('INFO', 'TODO: Add KB article');
  const onDeleteKnowledge = (id: string) => showToast('INFO', 'TODO: Delete KB article');
  const onAddRole = (name: string) => showToast('INFO', 'TODO: Add role');
  const onDeleteRole = (id: string) => showToast('INFO', 'TODO: Delete role');
  const onUpdateRole = (role: Role) => showToast('INFO', 'TODO: Update role');

  const handleMagicRewrite = async (text: string) => {
    return await rewriteMessage(text, activeSessionId || undefined);
  };

  const handleGenerateAiTags = async (userId: string) => {
    if (!activeSessionId) return;
    setIsGeneratingTags(true);
    try {
      const tags = await suggestUserTags([], "", activeSessionId);
      
      // Update local state
      setSessions(prev => prev.map(s => {
        if (s.userId === userId && s.user) {
          return {
            ...s,
            user: {
              ...s.user,
              aiTags: tags
            }
          };
        }
        return s;
      }));
      
      showToast('SUCCESS', t('ai_tags_generated'));
    } catch (error) {
      console.error('Failed to generate AI tags:', error);
      showToast('ERROR', t('failed_generate_ai_tags'));
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeSession) return;
    setIsGeneratingSummary(true);
    setShowSummaryModal(true);
    try {
      const result = await sessionService.previewSessionSummary(activeSession.id);
      if (result.success) {
        setSummaryText(result.summary);
      } else {
        setSummaryText(result.errorMessage || t('failed_generate_summary'));
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setSummaryText(t('failed_generate_summary'));
    } finally {
      setIsGeneratingSummary(false);
    }
  };
  
  if (loadingState === 'INITIALIZING') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('initializing_workspace')}</p>
        </div>
      </div>
    );
  }

  // Shopify Embedded App View
  if (isShopifyEmbedded) {
    const { shop, host } = getShopifyLaunchParams();
    const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY; 
    
    if (!apiKey) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50 text-red-600">
          Error: Shopify API Key is missing in environment variables (VITE_SHOPIFY_API_KEY).
        </div>
      );
    }

    return (
      <ShopifyAppProvider apiKey={apiKey} shopOrigin={shop || undefined} host={host || undefined}>
        <Toaster position="top-center" richColors expand closeButton duration={3000} style={{ zIndex: 99999 }} />
        {!isShopifyAuthenticated ? (
          shopifyInstalled ? (
            <LoginScreen onLoginSuccess={handleLoginSuccess} shopifyMode shopifyShop={shop || ''} shopifyHost={host || ''} />
          ) : (
            <ShopifyInstall shop={shop || ''} error={authError} />
          )
        ) : checkingSubscription ? (
          <div className="h-screen w-full flex items-center justify-center bg-gray-50">
             <div className="text-center">
               <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
               <p className="text-gray-500">{t('verifying_subscription')}</p>
             </div>
          </div>
        ) : !isSubscriptionActive ? (
          <ShopifyBilling shop={shop || ''} />
        ) : (
          <div className="h-screen bg-gray-50 overflow-hidden font-sans text-gray-900 p-4">
            <div className="flex h-full w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Sidebar */}
              <div className="hidden lg:block h-full shrink-0 border-r border-gray-200">
                <Sidebar 
                  activeView={activeView} 
                  setActiveView={setActiveView}
                  currentUser={currentUser}
                  currentUserStatus={currentUserStatus}
                  showProfileMenu={showProfileMenu}
                  setShowProfileMenu={setShowProfileMenu}
                  handleStatusChange={handleStatusChange}
                  handleLogout={handleLogout}
                  onLanguageChange={handleLanguageChange}
                  hasPermission={hasPermission}
                  isShopifyEmbedded={isShopifyEmbedded}
                  onSwitchAgent={() => setShowAgentSwitcher(true)}
                />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 h-full overflow-hidden relative">
                  {activeView === 'DASHBOARD' && (
                    <div className="h-full overflow-auto">
                      <ShopifyDashboard 
                        onOpenChat={() => setActiveView('INBOX')}
                        onOpenSettings={() => setActiveView('SETTINGS')}
                        onOpenKnowledge={() => setActiveView('WORKFLOW')}
                      />
                    </div>
                  )}
                  
                  {activeView === 'INBOX' && (
                     <div className="flex flex-col h-full">
                       <div className="flex-1 flex overflow-hidden">
                         <div className="w-full lg:w-80 lg:shrink-0 h-full overflow-hidden border-r border-gray-200 bg-white">
                           <ChatList 
                             sessions={sessions}
                             activeSessionId={activeSessionId}
                             onSelectSession={handleSelectSession}
                             groups={chatGroups}
                             onCreateGroup={handleCreateGroup}
                             onDeleteGroup={handleDeleteGroup}
                             onMoveSession={handleMoveSession}
                             onRenameGroup={handleRenameGroup}
                             currentUserId={currentUser?.id || ''}
                           />
                         </div>

                         {activeSession ? (
                           <div className="flex-1 h-full overflow-hidden bg-white">
                             <ChatArea 
                               session={activeSession}
                               agents={agents}
                               systemQuickReplies={systemQuickReplies}
                               isZenMode={isZenMode}
                               setIsZenMode={setIsZenMode}
                               isAiTyping={isAiTyping}
                               onSendMessage={handleSendMessage}
                               onResolve={() => setShowResolveModal(true)}
                               onTransfer={() => setShowTransferModal(true)}
                               onSummary={handleGenerateSummary}
                               onToggleStatus={toggleSessionStatus}
                               onMagicRewrite={handleMagicRewrite}
                               sentiment={sentiment}
                               isAnalyzingSentiment={isAnalyzingSentiment}
                               currentAgentLanguage={currentAgentLanguage}
                               onBack={() => setActiveSessionId(null)}
                              onShowProfile={() => setShowMobileProfile(true)}
                              subscription={subscription}
                            />
                           </div>
                         ) : (
                           <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-gray-50 text-gray-400">
                             <MessageCircle size={48} className="mb-4 opacity-50" />
                             <h2 className="text-xl font-semibold">{t('no_conversation_selected')}</h2>
                             <p className="text-sm mt-2">{t('choose_conversation_hint')}</p>
                           </div>
                         )}

                         {activeSession && !isZenMode && (
                           <div className="hidden lg:block w-80 shrink-0 h-full overflow-hidden border-l border-gray-200 bg-white">
                             <UserProfilePanel
                               user={activeSession.user}
                               currentSession={activeSession}
                               agents={agents}
                               allQuickReplies={systemQuickReplies}
                               agentId={currentUser?.id || ''}
                               onUpdateTags={handleUpdateTags}
                               onUpdateNotes={handleUpdateNotes}
                               onQuickReply={(text) => handleSendMessage(text, [], false, false, [])}
                               onAddSupportAgent={(agentId) => addSupportAgent(agentId)}
                               onRemoveSupportAgent={(agentId) => removeSupportAgent(agentId)}
                               onTransferChat={(agentId) => handleTransferChat(agentId)}
                               canManageSessionAgents={canManageSessionAgents}
                               subscription={subscription}
                               onGenerateAiTags={handleGenerateAiTags}
                               isGeneratingTags={isGeneratingTags}
                             />
                           </div>
                         )}
                       </div>
                     </div>
                  )}
          
                  {activeView === 'SETTINGS' && (
                     <SettingsView  
                         systemQuickReplies={systemQuickReplies} 
                         knowledgeBase={knowledgeBase} 
                         onAddSystemReply={handleAddSystemReply}
                         onDeleteSystemReply={onDeleteSystemReply}
                         onAddKnowledge={onAddKnowledge}
                         onDeleteKnowledge={onDeleteKnowledge}
                         hasPermission={hasPermission}
                     />
                   )}
           
                   {activeView === 'WORKFLOW' && (
                     <WorkflowView />
                   )}

                   {activeView === 'TEAM' && (
                     <div className="h-full overflow-auto">
                        <div className="p-4">
                           <TeamView />
                        </div>
                     </div>
                   )}

                   {activeView === 'CUSTOMERS' && (
                     <div className="h-full overflow-auto">
                        <div className="p-4">
                           <CustomerView />
                        </div>
                     </div>
                   )}

                   {activeView === 'ANALYTICS' && (
                     <div className="h-full overflow-auto">
                        <div className="p-4">
                           <AnalyticsView subscription={subscription} />
                        </div>
                     </div>
                   )}
              </div>
            </div>
          </div>
        )}
        {/* Global Modals - Copied for Shopify Embedded View */}
        {showResolveModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ClipboardCheck className="text-green-600"/>{t('confirm_resolution')}</h3>
                    <button onClick={() => setShowResolveModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                     {isGeneratingSummary ? (
                         <div className="flex flex-col items-center justify-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 mb-4">
                             <Loader2 size={24} className="animate-spin mb-2" />
                             <span className="text-sm">{t('generating_summary_preview')}</span>
                         </div>
                     ) : summaryPreview ? (
                         <div className="mb-6">
                             <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-purple-600" />
                                <span className="text-sm font-bold text-gray-700">{t('ai_summary_preview')}</span>
                                <span className="text-xs text-gray-400">({summaryPreview.messageCount} {t('messages_count')})</span>
                            </div>
                            
                            {summaryPreview.success ? (
                                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                    {summaryPreview.summary}
                                </div>
                            ) : (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-600 flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {summaryPreview.errorMessage || t('failed_generate_summary')}
                                </div>
                            )}
                         </div>
                     ) : null}

                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('resolution_note_label')}</label>
                     <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder={t('resolution_note_placeholder')} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none h-24 resize-none"></textarea>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                     <button onClick={() => setShowResolveModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">{t('cancel')}</button>
                     <button 
                       onClick={confirmResolution} 
                       disabled={isPreparingResolution}
                       className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                     >
                       {isPreparingResolution ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                       {t('confirm_and_resolve')}
                     </button>
                  </div>
               </div>
          </div>
        )}
        {showSummaryModal && (
           <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Sparkles className="text-purple-600"/>{t('ai_smart_summary')}</h3>
                    <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                      {isGeneratingSummary ? (
                          <div className="flex flex-col items-center justify-center text-gray-500 py-12"><Loader2 size={24} className="animate-spin mb-4" /><span>{t('analyzing_conversation')}</span></div>
                      ) : (
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{summaryText}</div>
                      )}
                  </div>
               </div>
            </div>
        )}
        {showTransferModal && activeSession && (
           <TransferDialog 
             sessionId={activeSession.id}
             isOpen={showTransferModal}
             currentUserId={currentUser?.id || ''}
             currentPrimaryAgentId={activeSession.primaryAgentId}
             onClose={() => setShowTransferModal(false)}
             onTransferred={async () => {
                 await loadSessionDetail(activeSession.id);
                 showToast('SUCCESS', t('session_transferred_success'));
               }}
           />
        )}
        {/* Agent Switcher Modal - Only in Shopify environment */}
        {isShopifyEmbedded && showAgentSwitcher && currentUser && (
          <AgentSwitcher
            currentUser={currentUser}
            onSwitchAgent={handleSwitchAgent}
            onCancel={() => setShowAgentSwitcher(false)}
          />
        )}
      </ShopifyAppProvider>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-gray-900">
      <Toaster position="top-center" richColors expand closeButton duration={3000} style={{ zIndex: 2147483647 }} />
      {/* Sidebar (Desktop) */}
      <div className="hidden lg:block h-full shrink-0">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView}
          currentUser={currentUser}
          currentUserStatus={currentUserStatus}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          handleStatusChange={handleStatusChange}
          handleLogout={handleLogout}
          onLanguageChange={handleLanguageChange}
          hasPermission={hasPermission}
        />
      </div>
      
      {activeView === 'INBOX' ? (
        <>
          <div className={`${activeSessionId ? 'hidden lg:block' : 'w-full'} lg:w-80 lg:shrink-0 h-full overflow-hidden border-r border-gray-200 bg-white`}>
            <ChatList 
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              groups={chatGroups}
              onCreateGroup={handleCreateGroup}
              onDeleteGroup={handleDeleteGroup}
              onMoveSession={handleMoveSession}
              onRenameGroup={handleRenameGroup}
              currentUserId={currentUser?.id || ''}
            />
          </div>
          {activeSession ? (
            <div className={`fixed inset-0 z-50 lg:static lg:z-auto flex-1 flex bg-white transition-all duration-300 ${isZenMode ? 'mr-0' : 'mr-0 min-[1550px]:mr-80'}`}>
              <ChatArea 
                session={activeSession}
                agents={agents}
                systemQuickReplies={systemQuickReplies}
                isZenMode={isZenMode}
                setIsZenMode={setIsZenMode}
                isAiTyping={isAiTyping}
                onSendMessage={handleSendMessage}
                onResolve={() => setShowResolveModal(true)}
                onTransfer={() => setShowTransferModal(true)}
                onSummary={handleGenerateSummary}
                onToggleStatus={toggleSessionStatus}
                onMagicRewrite={handleMagicRewrite}
                sentiment={sentiment}
                isAnalyzingSentiment={isAnalyzingSentiment}
                currentAgentLanguage={currentAgentLanguage}
                onBack={() => setActiveSessionId(null)}
               onShowProfile={() => setShowMobileProfile(true)}
               subscription={subscription}
             />
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-gray-50 text-gray-400">
                <MessageCircle size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-semibold">No Conversation Selected</h2>
                <p className="text-sm mt-2">Please choose a conversation from the list.</p>
            </div>
          )}
          {activeSession && !isZenMode && (
            <div className="fixed right-0 top-0 h-full w-80 transition-transform duration-300 translate-x-0 hidden min-[1550px]:block">
              <UserProfilePanel
                  user={activeSession.user}
                  currentSession={activeSession}
                  agents={agents}
                  allQuickReplies={systemQuickReplies}
                  agentId={currentUser?.id || ''}
                  onUpdateTags={handleUpdateTags}
                  onUpdateNotes={handleUpdateNotes}
                  onQuickReply={(text) => handleSendMessage(text, [], false, false, [])}
                  onAddSupportAgent={(agentId) => addSupportAgent(agentId)}
                  onRemoveSupportAgent={(agentId) => removeSupportAgent(agentId)}
                  onTransferChat={(agentId) => handleTransferChat(agentId)}
                  canManageSessionAgents={canManageSessionAgents}
                />
            </div>
          )}

          {/* Mobile Profile Modal */}
          {showMobileProfile && activeSession && (
            <div className="fixed inset-0 z-[60] min-[1550px]:hidden bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                  <button 
                    onClick={() => setShowMobileProfile(false)}
                    className="absolute top-2 right-2 z-10 p-2 bg-white/80 rounded-full hover:bg-gray-100 shadow-sm border border-gray-100"
                  >
                    <X size={20} />
                  </button>
                  <UserProfilePanel
                      user={activeSession.user}
                      currentSession={activeSession}
                      agents={agents}
                      allQuickReplies={systemQuickReplies}
                      agentId={currentUser?.id || ''}
                      onUpdateTags={handleUpdateTags}
                      onUpdateNotes={handleUpdateNotes}
                      onQuickReply={(text) => {
                        handleSendMessage(text, [], false, false, []);
                        setShowMobileProfile(false);
                      }}
                      onAddSupportAgent={(agentId) => addSupportAgent(agentId)}
                      onRemoveSupportAgent={(agentId) => removeSupportAgent(agentId)}
                      onTransferChat={(agentId) => {
                        handleTransferChat(agentId);
                        setShowMobileProfile(false);
                      }}
                      canManageSessionAgents={canManageSessionAgents}
                      subscription={subscription}
                    />
               </div>
            </div>
          )}
        </>
      ) : (
        <div className={`flex-1 w-full ${(activeView === 'WORKFLOW' || activeView === 'SETTINGS') ? 'h-full overflow-hidden' : 'overflow-auto pb-20 lg:pb-0'}`}>
          {activeView === 'TEAM' ? (
            <TeamView />
          ) : activeView === 'CUSTOMERS' ? (
            <CustomerView />
          ) : activeView === 'WORKFLOW' ? (
            <WorkflowView />
          ) : activeView === 'ANALYTICS' ? (
            <AnalyticsView subscription={subscription} />
          ) : (
            <SettingsView  
                systemQuickReplies={systemQuickReplies} 
                knowledgeBase={knowledgeBase} 
                onAddSystemReply={handleAddSystemReply}
                onDeleteSystemReply={onDeleteSystemReply}
                onAddKnowledge={onAddKnowledge}
                onDeleteKnowledge={onDeleteKnowledge}
                hasPermission={hasPermission}
            />
          )}
        </div>
      )}

      {/* Mobile Navigation */}
      <MobileNav 
        activeView={activeView} 
        setActiveView={setActiveView}
        currentUser={currentUser}
        currentUserStatus={currentUserStatus}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        handleStatusChange={handleStatusChange}
        handleLogout={handleLogout}
        onLanguageChange={handleLanguageChange}
        hasPermission={hasPermission}
      />

      {/* Transfer Notifications */}
      <div className="fixed top-20 right-4 z-[90] w-80 space-y-3 pointer-events-none">
        {transferNotifications.map(n => (
          <div key={n.sessionId} 
               className="bg-white p-4 rounded-xl shadow-xl border-l-4 border-indigo-500 animate-in slide-in-from-right duration-300 flex flex-col gap-2 cursor-pointer hover:bg-indigo-50 transition-colors group relative pointer-events-auto"
               onClick={() => {
                 handleSelectSession(n.sessionId);
                 setTransferNotifications(prev => prev.filter(item => item.sessionId !== n.sessionId));
               }}
          >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 overflow-hidden">
                            {n.avatar ? <img src={n.avatar} className="w-full h-full object-cover"/> : (n.userName[0] || 'U')}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">{n.userName}</h4>
                            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">{t('transfer_request')}</span>
                        </div>
                    </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setTransferNotifications(prev => prev.filter(item => item.sessionId !== n.sessionId));
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                >
                    <X size={16}/>
                </button>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 pl-12">
                {n.reason}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-400 pl-12">
                <Clock size={12}/>
                <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Global Notifications - Deprecated: using sonner */}
      {/* <div className="fixed top-4 right-4 z-[9999] w-80 space-y-3">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border animate-in slide-in-from-top-4 duration-300 ${
              n.type === 'SUCCESS' ? 'bg-green-50 border-green-200 text-green-800' :
              n.type === 'ERROR' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="mt-0.5">
              {n.type === 'SUCCESS' ? <CheckCircle size={16} /> : n.type === 'ERROR' ? <AlertCircle size={16} /> : <Info size={16} />}
            </div>
            <p className="text-sm font-medium">{n.message}</p>
            <button onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))} className="ml-auto opacity-70 hover:opacity-100"><X size={14}/></button>
          </div>
        ))}
      </div> */}
      
      {/* Confetti */}
      {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center">
              <div className="text-6xl animate-out fade-out zoom-out-50 duration-1000 delay-3000">🎉</div>
              <div className="text-4xl animate-out fade-out zoom-out-50 duration-1000 delay-3000 absolute top-1/4 left-1/4">🎊</div>
              <div className="text-5xl animate-out fade-out zoom-out-50 duration-1000 delay-3000 absolute bottom-1/3 right-1/4">🥳</div>
          </div>
      )}

      {/* Global Modals */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ClipboardCheck className="text-green-600"/>{t('confirm_resolution')}</h3>
                  <button onClick={() => setShowResolveModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                   {isGeneratingSummary ? (
                       <div className="flex flex-col items-center justify-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 mb-4">
                           <Loader2 size={24} className="animate-spin mb-2" />
                           <span className="text-sm">{t('generating_summary_preview')}</span>
                       </div>
                   ) : summaryPreview ? (
                       <div className="mb-6">
                           <div className="flex items-center gap-2 mb-2">
                               <Sparkles size={16} className="text-purple-600" />
                               <span className="text-sm font-bold text-gray-700">{t('ai_summary_preview')}</span>
                               <span className="text-xs text-gray-400">({summaryPreview.messageCount} {t('messages_count')})</span>
                           </div>
                           
                           {summaryPreview.success ? (
                               <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                   {summaryPreview.summary}
                               </div>
                           ) : (
                               <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-600 flex items-center gap-2">
                                   <AlertCircle size={16} />
                                   {summaryPreview.errorMessage || t('failed_generate_summary')}
                               </div>
                           )}
                       </div>
                   ) : null}

                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('resolution_note_label')}</label>
                   <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder={t('resolution_note_placeholder')} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none h-24 resize-none"></textarea>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                   <button onClick={() => setShowResolveModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">{t('cancel')}</button>
                   <button 
                     onClick={confirmResolution} 
                     disabled={isPreparingResolution}
                     className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                   >
                     {isPreparingResolution ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                     {t('confirm_and_resolve')}
                   </button>
                </div>
             </div>
        </div>
      )}
      {showSummaryModal && (
         <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Sparkles className="text-purple-600"/>{t('ai_smart_summary')}</h3>
                  <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {isGeneratingSummary ? (
                        <div className="flex flex-col items-center justify-center text-gray-500 py-12"><Loader2 size={24} className="animate-spin mb-4" /><span>{t('analyzing_conversation')}</span></div>
                    ) : (
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap">{summaryText}</div>
                    )}
                </div>
             </div>
          </div>
      )}
      {showTransferModal && activeSession && (
         <TransferDialog 
           sessionId={activeSession.id}
           isOpen={showTransferModal}
           currentUserId={currentUser?.id || ''}
           currentPrimaryAgentId={activeSession.primaryAgentId}
           onClose={() => setShowTransferModal(false)}
           onTransferred={async () => {
             await loadSessionDetail(activeSession.id);
             showToast('SUCCESS', t('session_transferred_success'));
           }}
         />
      )}
    </div>
  );
}

export default App;

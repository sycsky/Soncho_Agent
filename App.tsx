import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Agent, ChatSession, ChatStatus, Message, MessageSender, QuickReply, Attachment, KnowledgeEntry, Role, Notification, ChatGroup, UserProfile, SessionCategory } from './types';
import { generateAIResponse, generateChatSummary, rewriteMessage, analyzeSentiment, suggestUserTags } from './services/geminiService';
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
import { ChatArea } from './components/ChatArea';
import { TeamView } from './components/TeamView';
import { CustomerView } from './components/CustomerView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { WorkflowView } from './components/WorkflowView';
import sessionCategoryService from './services/sessionCategoryService';
import sessionService, { SessionSummaryPreview } from './services/sessionService';
import TransferDialog from './components/TransferDialog';
import { 
  CheckCircle, Check, AlertCircle, Info, PartyPopper, Zap, Play, Pause, X,
  ClipboardCheck, Loader2, User, ArrowRight, Sparkles, MessageCircle, FileText
} from 'lucide-react';

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

const PERMISSION_DEFINITIONS = [
    { key: 'viewAnalytics', label: 'View Analytics Dashboard', description: 'Allow access to system performance metrics and reports.', icon: 'BarChart' },
    { key: 'manageKnowledgeBase', label: 'Manage Knowledge Base', description: 'Allow creating, editing, and deleting knowledge base entries.', icon: 'Database' },
    { key: 'manageSystem', label: 'Manage System Settings', description: 'Allow configuration of global quick replies and system preferences.', icon: 'Settings' },
    { key: 'manageTeam', label: 'Manage Team Members', description: 'Allow adding, editing, or removing agent accounts.', icon: 'Users' },
    { key: 'deleteChats', label: 'Delete Chat History', description: 'Allow permanent deletion of customer chat logs.', icon: 'Trash2' },
];

function App() {
  const [loadingState, setLoadingState] = useState<'INITIALIZING' | 'LOADING' | 'READY' | 'ERROR'>('INITIALIZING');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemQuickReplies, setSystemQuickReplies] = useState<QuickReply[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [categories, setCategories] = useState<SessionCategory[]>([]);

  // UI States
  const [activeView, setActiveView] = useState<'INBOX' | 'TEAM' | 'CUSTOMERS' | 'ANALYTICS' | 'SETTINGS' | 'WORKFLOW'>('INBOX');
  const [isZenMode, setIsZenMode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [sentiment, setSentiment] = useState<{score: number, label: string}>({ score: 50, label: 'Neutral' });
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [currentAgentLanguage, setCurrentAgentLanguage] = useState<string>(localStorage.getItem('agent_language') || 'en');

  useEffect(() => {
    if (currentUser?.language) {
      setCurrentAgentLanguage(currentUser.language);
      localStorage.setItem('agent_language', currentUser.language);
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
    localStorage.setItem('agent_language', lang);
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

  const showToast = (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Connect notification service to showToast on mount
  useEffect(() => {
    notificationService.setListener(showToast);
  }, []);

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
          attachments: backendMessage.attachments,
          mentions: backendMessage.mentions,
          translation: backendMessage.translationData,
          translationData: backendMessage.translationData
        };
        
        // ✅ 使用函数式更新检查会话是否存在
        setSessions(prev => {
          const sessionExists = prev.some(s => s.id === sessionId);
          
          if (sessionExists) {
            // 会话已存在，更新消息
            return prev.map(s => {
              if (s.id === sessionId) {
                const isNewUnread = s.id !== activeSessionId;
                const isOwned = s.primaryAgentId === (currentUser?.id || '');
                const isMentioned = Array.isArray(newMessage.mentions) && (currentUser?.id ? newMessage.mentions.includes(currentUser.id) : false);
                const isUserMessage = newMessage.sender === MessageSender.USER;
                
                // Only increment unread count if:
                // 1. It's a user message AND the current agent owns the session
                // 2. OR the current agent is explicitly mentioned in the message
                const shouldIncrement = (isUserMessage && isOwned) || isMentioned;
                
                // If not active session:
                // - If should increment -> count + 1
                // - If should NOT increment -> keep existing count (DO NOT RESET TO 0)
                const nextUnread = isNewUnread ? (shouldIncrement ? s.unreadCount + 1 : s.unreadCount) : 0;
                
                // Always update lastActive to ensure correct sorting within groups (Owned/Unowned)
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
            // ✅ Sort the list after updating to ensure correct order
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
              await api.post(`/read-records/sessions/${sessionId}/mark-read`);
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
  }, [activeSessionId]);

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

      // The full agent list for Team View will be loaded on demand.
      setAgents([]);

      if (defaultSessionId) {
        try {
          await api.post(`/read-records/sessions/${defaultSessionId}/mark-read`);
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
      showToast('ERROR', 'Could not load workspace data. Please try again.');
      setLoadingState('ERROR');
      handleLogout();
    }
  }, []); // ✅ 移除依赖，使用 ref 或在函数内部处理

  useEffect(() => {
    // ✅ 防止 Strict Mode 导致的重复调用
    if (isInitialized.current) {
      console.log('⏭️ 跳过重复初始化 (Strict Mode)');
      return;
    }
    
    const token = localStorage.getItem('nexus_token');
    const userJson = localStorage.getItem('nexus_user');
    if (token && userJson) {
      try {
        const loggedInUser: Agent = JSON.parse(userJson);
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
      showToast('ERROR', 'Could not load team members.');
    }
  };

  useEffect(() => {
    if (activeView === 'TEAM' && agents.length === 0) {
      loadTeamData();
    }
  }, [activeView, agents.length]);

  const handleLoginSuccess = (data: LoginResponse) => {
    localStorage.setItem('nexus_token', data.token);
    localStorage.setItem('nexus_user', JSON.stringify(data.agent));
    setIsAuthenticated(true);
    setCurrentUser(data.agent);
    fetchBootstrapData(data.agent, data.token);
  };

  const handleLogout = () => {
    websocketService.disconnect();
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSessions([]);
    setAgents([]);
    setChatGroups([]);
    setRoles([]);
    setSystemQuickReplies([]);
    setKnowledgeBase([]);
    setActiveSessionId(null);
    showToast('INFO', 'You have been logged out.');
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
      await api.post(`/read-records/sessions/${sessionId}/mark-read`);
      
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
      await api.post(`/session-groups/${targetGroupId}/sessions/${sessionId}`);
      
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
        attachments: backendMsg.attachments || [],
        mentions: backendMsg.mentionAgentIds || [],
        translationData: backendMsg.translationData
      }));
      
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
          unreadCount: (detail.unreadCount ?? s.unreadCount),
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
    
    // ✅ 立即在本地聊天框中插入消息
    const newMessage: Message = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // 临时ID
      text,
      sender: MessageSender.AGENT,
      timestamp: Date.now(),
      isInternal,
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
      text,
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
      showToast('SUCCESS', 'Session resolved successfully');
    } catch (error) {
      console.error('Failed to resolve session:', error);
      showToast('ERROR', 'Failed to resolve session');
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
      showToast('ERROR', 'Failed to update tags');
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
      showToast('ERROR', 'Failed to update notes');
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
        showToast('ERROR', 'User not authenticated');
        return;
      }
      
      const newReply = await quickReplyServiceAPI.createSystemQuickReply({
        label,
        text,
        category
      }, currentUser.id);
      setSystemQuickReplies(prev => [...prev, newReply]);
      showToast('SUCCESS', 'System reply added successfully');
    } catch (error) {
      console.error('Failed to add system reply:', error);
      showToast('ERROR', 'Failed to add system reply');
    }
  };

  const onDeleteSystemReply = async (id: string) => {
    try {
      if (!currentUser?.id) {
        showToast('ERROR', 'User not authenticated');
        return;
      }
      
      await quickReplyServiceAPI.deleteQuickReply(id, currentUser.id);
      setSystemQuickReplies(prev => prev.filter(reply => reply.id !== id));
      showToast('SUCCESS', 'System reply deleted successfully');
    } catch (error) {
      console.error('Failed to delete system reply:', error);
      showToast('ERROR', 'Failed to delete system reply');
    }
  };

  const onAddKnowledge = (title: string, content: string) => showToast('INFO', 'TODO: Add KB article');
  const onDeleteKnowledge = (id: string) => showToast('INFO', 'TODO: Delete KB article');
  const onAddRole = (name: string) => showToast('INFO', 'TODO: Add role');
  const onDeleteRole = (id: string) => showToast('INFO', 'TODO: Delete role');
  const onUpdateRole = (role: Role) => showToast('INFO', 'TODO: Update role');

  const handleMagicRewrite = async (text: string) => {
    return await rewriteMessage(text);
  };

  const handleGenerateSummary = async () => {
    if (!activeSession) return;
    setIsGeneratingSummary(true);
    setShowSummaryModal(true);
    const history = (activeSession.messages || []).map(m => ({
        role: m.sender.toLowerCase(),
        content: m.text
    }));
    const summary = await generateChatSummary(history);
    setSummaryText(summary);
    setIsGeneratingSummary(false);
  };
  
  if (loadingState === 'INITIALIZING' || loadingState === 'LOADING') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 font-semibold">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-4">N</div>
        <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading Workspace...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || loadingState === 'ERROR') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }
  
  return (
    <div className="h-screen w-full flex bg-gray-100 font-sans text-gray-900 overflow-hidden">
      {/* Sidebar */}
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
      />
      
      {activeView === 'INBOX' ? (
        <>
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
          {activeSession ? (
            <div className={`flex-1 flex transition-all duration-300 ${isZenMode ? 'mr-0' : 'mr-0 lg:mr-80'}`}>
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
                onSummary={() => setShowSummaryModal(true)}
                onToggleStatus={toggleSessionStatus}
                onMagicRewrite={handleMagicRewrite}
                sentiment={sentiment}
                isAnalyzingSentiment={isAnalyzingSentiment}
                currentAgentLanguage={currentAgentLanguage}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <MessageCircle size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-semibold">No Conversation Selected</h2>
                <p className="text-sm mt-2">Please choose a conversation from the list.</p>
            </div>
          )}
          {activeSession && !isZenMode && (
            <div className="fixed right-0 top-0 h-full w-80 transition-transform duration-300 translate-x-0 hidden lg:block">
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
                  categories={categories}
                  canManageSessionAgents={canManageSessionAgents}
                />
            </div>
          )}
        </>
      ) : activeView === 'TEAM' ? (
        <TeamView agents={agents} roles={roles} onAddAgent={handleAddAgent} onUpdateAgent={handleUpdateAgent} getRoleName={getRoleName} />
      ) : activeView === 'CUSTOMERS' ? (
        <CustomerView />
      ) : activeView === 'WORKFLOW' ? (
        <WorkflowView />
      ) : activeView === 'ANALYTICS' ? (
        <AnalyticsView />
      ) : (
        <SettingsView  
            systemQuickReplies={systemQuickReplies} 
            knowledgeBase={knowledgeBase} 
            onAddSystemReply={handleAddSystemReply}
            onDeleteSystemReply={onDeleteSystemReply}
            onAddKnowledge={onAddKnowledge}
            onDeleteKnowledge={onDeleteKnowledge}
        />
      )}

      {/* Global Notifications */}
      <div className="fixed top-4 right-4 z-[100] w-80 space-y-3">
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
      </div>
      
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
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ClipboardCheck className="text-green-600"/>Confirm Resolution</h3>
                  <button onClick={() => setShowResolveModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                   {isGeneratingSummary ? (
                       <div className="flex flex-col items-center justify-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 mb-4">
                           <Loader2 size={24} className="animate-spin mb-2" />
                           <span className="text-sm">Generating AI summary preview...</span>
                       </div>
                   ) : summaryPreview ? (
                       <div className="mb-6">
                           <div className="flex items-center gap-2 mb-2">
                               <Sparkles size={16} className="text-purple-600" />
                               <span className="text-sm font-bold text-gray-700">AI Summary Preview</span>
                               <span className="text-xs text-gray-400">({summaryPreview.messageCount} messages)</span>
                           </div>
                           
                           {summaryPreview.success ? (
                               <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                   {summaryPreview.summary}
                               </div>
                           ) : (
                               <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-600 flex items-center gap-2">
                                   <AlertCircle size={16} />
                                   {summaryPreview.errorMessage || "Failed to generate summary"}
                               </div>
                           )}
                       </div>
                   ) : null}

                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Additional Resolution Note (Optional)</label>
                   <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder="e.g., User issue was resolved by clearing browser cache." className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none h-24 resize-none"></textarea>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                   <button onClick={() => setShowResolveModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                   <button 
                     onClick={confirmResolution} 
                     disabled={isPreparingResolution}
                     className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                   >
                     {isPreparingResolution ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                     Confirm & Resolve
                   </button>
                </div>
             </div>
        </div>
      )}
      {showSummaryModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Sparkles className="text-purple-600"/>AI Smart Summary</h3>
                  <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {isGeneratingSummary ? (
                        <div className="flex flex-col items-center justify-center text-gray-500 py-12"><Loader2 size={24} className="animate-spin mb-4" /><span>Analyzing conversation...</span></div>
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
             showToast('SUCCESS', '会话已转移，已刷新客服团队');
           }}
         />
      )}
    </div>
  );
}

export default App;

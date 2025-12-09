import { ChatSession, ChatGroup, SessionGroup, UserSource, ChatStatus, UserProfile, Message, SessionCategory } from '../types';

/**
 * API 返回的 User 格式
 */
interface ApiUser {
  id: string;
  name: string;
  primaryChannel: string;
  email: string | null;
  phone: string | null;
  metadata: Record<string, any>;
  active: boolean;
  createdAt: string;
  tags: string[];  // ✅ 后端返回的手动标签
  aiTags: string[];  // ✅ 后端返回的 AI 标签
}

/**
 * API 返回的 Session 格式（新版本 - 只包含 lastMessage，不包含完整 messages 数组）
 */
interface ApiChatSession {
  id: string;
  userId: string;
  user: ApiUser;  // ✅ 后端现在直接返回 user 对象
  status: string;
  lastActive: number;  // ✅ 已经是时间戳
  lastMessage?: any;  // ✅ 只返回最后一条消息（用于列表预览）
  unreadCount: number;  // ✅ 后端返回 unreadCount
  groupId: string;
  sessionGroupIds: Record<string, string>;
  primaryAgentId: string;
  supportAgentIds: string[];
  note?: string;  // ✅ 会话备注字段
}

/**
 * API 返回的 SessionGroup 格式（新结构）
 */
interface ApiSessionGroup {
  id: string;
  name: string;
  system: boolean;
  agentId: string;
  icon: string;
  color: string;
  sortOrder: number;
  sessions: ApiChatSession[];
  createdAt: string;
  updatedAt: string;
  categories?: { id: string; name: string; icon?: string; color?: string }[];
}

/**
 * 转换 API User 为前端 UserProfile
 */
function transformUser(apiUser: ApiUser): UserProfile {
  return {
    id: apiUser.id,
    name: apiUser.name,
    avatar: undefined,  // 使用默认头像
    source: (apiUser.primaryChannel === 'WECHAT' ? UserSource.WECHAT : UserSource.WEB),
    tags: apiUser.tags || [],  // ✅ 使用后端返回的手动标签
    aiTags: apiUser.aiTags || [],  // ✅ 使用后端返回的 AI 标签
    email: apiUser.email || undefined,
    phone: apiUser.phone || undefined,
    location: undefined,
    notes: ''
  };
}

/**
 * 转换 Bootstrap API 返回的 Session 数据为前端格式
 * 
 * @param apiSession - 后端返回的 session 数据（包含 user 和 lastMessage，不包含完整 messages）
 * @param sessionGroupId - 当前 SessionGroup 的 ID（用于正确设置 groupId）
 * @returns 转换后的 ChatSession 对象
 */
export function transformBootstrapSession(apiSession: ApiChatSession, sessionGroupId: string): ChatSession {
  const user = transformUser(apiSession.user);
  
  // 如果 API 返回了 session 的 note 字段，将其设置到 user.notes 中
  if (apiSession.note) {
    user.notes = apiSession.note;
  }
  
  return {
    id: apiSession.id,
    userId: apiSession.userId,
    user,
    messages: undefined,  // ✅ 不包含完整消息列表，会在打开会话时单独加载
    lastMessage: apiSession.lastMessage || undefined,  // ✅ 只包含最后一条消息用于预览
    status: apiSession.status as ChatStatus,
    lastActive: apiSession.lastActive,  // ✅ 已经是时间戳，直接使用
    unreadCount: apiSession.unreadCount || 0,  // ✅ 使用后端返回的 unreadCount
    groupId: sessionGroupId,  // ✅ 使用 SessionGroup 的 ID，而不是 session.groupId
    primaryAgentId: apiSession.primaryAgentId,
    supportAgentIds: apiSession.supportAgentIds || []
  };
}

/**
 * 转换 Bootstrap API 返回的 SessionGroup 数据
 * 
 * @param apiSessionGroups - 后端返回的 sessionGroups 数据
 * @returns { groups: ChatGroup[], sessions: ChatSession[] }
 */
export function transformSessionGroups(apiSessionGroups: ApiSessionGroup[]): {
  groups: ChatGroup[];
  sessions: ChatSession[];
} {
  const groups: ChatGroup[] = [];
  const sessions: ChatSession[] = [];
  
  apiSessionGroups.forEach(apiGroup => {
    // 转换 Group
    groups.push({
      id: apiGroup.id,
      name: apiGroup.name,
      isSystem: apiGroup.system,  // ✅ 字段名转换: system → isSystem
      categories: (apiGroup.categories || []).map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        enabled: true,
      })) as SessionCategory[]
    });
    
    // 转换该组内的所有 Sessions
    apiGroup.sessions.forEach(apiSession => {
      // ✅ 传入 sessionGroupId，确保 session.groupId 与 group.id 匹配
      sessions.push(transformBootstrapSession(apiSession, apiGroup.id));
    });
  });
  
  return { groups, sessions };
}

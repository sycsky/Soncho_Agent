
export enum UserSource {
  WEB = 'WEB',
  WECHAT = 'WECHAT'
}

export enum MessageSender {
  USER = 'USER',
  AGENT = 'AGENT', // Human
  AI = 'AI',
  SYSTEM = 'SYSTEM' // New type for resolution markers/dividers
}

export enum ChatStatus {
  AI_HANDLING = 'AI_HANDLING',
  HUMAN_HANDLING = 'HUMAN_HANDLING',
  RESOLVED = 'RESOLVED'
}

export interface Attachment {
  id: string;
  type: 'IMAGE' | 'FILE';
  url: string;
  name: string;
  size?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: number;
  isInternal?: boolean; // For notes
  attachments?: Attachment[];
  mentions?: string[]; // Array of mentioned agent IDs
  translation?: {
    isTranslated: boolean;
    targetLanguage: string;
    originalText?: string;
  };
  translationData?: {
    originalText: string;
    sourceLanguage: string;
    [key: string]: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string; // Made optional - will use DEFAULT_AVATAR if not provided
  source: UserSource;
  tags: string[];
  aiTags?: string[]; // AI-generated tags, visually distinct
  email?: string;
  phone?: string;
  location?: string;
  notes?: string; // Made optional - can be empty string or undefined
}

export interface ChatSession {
  id: string;
  userId: string;
  user: UserProfile;
  messages?: Message[]; // Made optional - loaded separately when session is opened
  lastMessage?: Message; // Last message for preview in chat list
  status: ChatStatus;
  lastActive: number;
  unreadCount: number;
  groupId: string; // References ChatGroup.id
  primaryAgentId: string; // The main owner of the chat
  supportAgentIds: string[]; // Other agents in the group
  categoryId?: string;
  category?: SessionCategory;
}

export interface ChatGroup {
  id: string;
  name: string;
  isSystem: boolean; // 'Inbox' and 'Resolved' are system groups
  categories?: SessionCategory[];
}

/**
 * SessionGroup - Bootstrap API 返回的分组数据（包含该组的 sessions）
 */
export interface SessionGroup extends ChatGroup {
  sessions: ChatSession[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean; // Cannot be deleted if true
  permissions: Record<string, boolean>;
}

export interface Agent {
  id: string;
  name: string;
  roleId: string; // Role ID
  avatar: string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  email?: string;
  roleName?: string;
  language?: string;
}

export interface QuickReply {
  id: string;
  label: string;
  text: string;
  category: string;
}

// Deprecated: Use KnowledgeBase and KnowledgeDocument instead
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

// New Knowledge Base Types
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  indexName: string;
  embeddingModelId?: string;
  vectorDimension: number;
  documentCount: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type DocumentType = 'TEXT' | 'MARKDOWN' | 'HTML' | 'PDF' | 'URL';

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  docType: DocumentType;
  sourceUrl?: string;
  chunkSize: number;
  chunkOverlap: number;
  chunkCount: number;
  status: DocumentStatus;
  errorMessage?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  content: string;
  score: number;
  documentId: string;
  title: string;
}

export interface Notification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO';
  message: string;
}

export interface SessionCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  enabled?: boolean;
}

export interface SessionAgent {
  id: string;
  name: string;
  avatar?: string;
  isPrimary: boolean;
}

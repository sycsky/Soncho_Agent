# Bootstrap API 响应与前端类型不匹配分析

## 🔴 核心问题

Bootstrap API 返回的数据结构与前端期望的类型严重不匹配,导致应用崩溃。

## 📊 问题对比

### 1. Session 数据问题

#### 后端返回的 Session 数据
```json
{
  "id": "0c8644cf-0bec-4c40-9961-5c0e5a010919",
  "status": "HUMAN_HANDLING",
  "lastActiveAt": "2025-11-25T09:55:24Z",  // ❌ 字段名错误
  "userId": null,                           // ❌ 缺少 user 对象
  "groupId": "e0843dbe-db32-48a5-b749-a602c76b1153",
  "primaryAgentId": "22222222-2222-2222-2222-222222222222",
  "supportAgentIds": []
  // ❌ 缺少 messages 数组
  // ❌ 缺少 unreadCount
}
```

#### 前端期望的 ChatSession 类型
```typescript
export interface ChatSession {
  id: string;
  userId: string;
  user: UserProfile;              // ✅ 需要完整的 user 对象
  messages?: Message[];           // ✅ 需要 messages 数组
  status: ChatStatus;
  lastActive: number;             // ✅ 需要 lastActive (timestamp)
  unreadCount: number;            // ✅ 需要 unreadCount
  groupId: string;
  primaryAgentId: string;
  supportAgentIds: string[];
}
```

### 2. Group 数据问题

#### 后端返回的 Group 数据
```json
{
  "id": "10955bfc-ac06-400e-a769-b4b8f01b3f82",
  "name": "访客_033522 的咨询",
  "system": false  // ❌ 字段名错误
}
```

#### 前端期望的 ChatGroup 类型
```typescript
export interface ChatGroup {
  id: string;
  name: string;
  isSystem: boolean;  // ✅ 应该是 isSystem,不是 system
}
```

## 🚨 具体问题列表

### Session 数据问题

#### 1. **字段名不匹配**
| 后端字段 | 前端期望 | 问题 |
|---------|---------|------|
| `lastActiveAt` | `lastActive` | 字段名不同 |
| 无 | `lastActive` | 后端返回的是 ISO 字符串,前端期望的是时间戳(number) |

#### 2. **缺少关键字段**
| 字段 | 类型 | 问题 |
|-----|------|------|
| `user` | `UserProfile` | ❌ 完全缺失,只有 `userId` (且为 null) |
| `messages` | `Message[]?` | ❌ 完全缺失 |
| `unreadCount` | `number` | ❌ 完全缺失 |

#### 3. **数据类型问题**
- `lastActiveAt` 是 ISO 时间字符串 `"2025-11-25T09:55:24Z"`
- 前端期望 `lastActive` 是时间戳数字 (如 `1732530924000`)

#### 4. **userId 为 null**
所有 session 的 `userId` 都是 `null`,这会导致:
- 无法关联用户信息
- 无法显示用户名、头像等
- 前面修复的所有 `session.user` 检查都会触发

### Group 数据问题

#### 5. **字段名不匹配**
| 后端字段 | 前端期望 | 问题 |
|---------|---------|------|
| `system` | `isSystem` | ❌ 字段名不同 (布尔值命名规范) |

## 💥 导致的崩溃场景

### 场景 1: 访问 user 对象
```typescript
// App.tsx:157
setSessions(data.sessions.sort((a,b) => b.lastActive - a.lastActive));
//                                        ^^^^^^^^^^^
// ❌ TypeError: Cannot read properties of undefined (reading 'lastActive')
// 因为后端返回的是 lastActiveAt,不是 lastActive
```

### 场景 2: ChatList 渲染
```typescript
// ChatList.tsx
{session.user.name}  // ❌ Cannot read properties of undefined (reading 'name')
// 因为 session.user 不存在
```

### 场景 3: 消息显示
```typescript
// ChatArea.tsx
{session.messages.map(...)}  // ❌ Cannot read properties of undefined (reading 'map')
// 因为 session.messages 不存在
```

## ✅ 解决方案

### 方案 1: 后端修改 (推荐)

修改 Bootstrap API 返回完整的 Session 数据:

```json
{
  "id": "0c8644cf-0bec-4c40-9961-5c0e5a010919",
  "status": "HUMAN_HANDLING",
  "lastActive": 1732530924000,     // ✅ 使用时间戳
  "userId": "user-123",            // ✅ 不应该是 null
  "user": {                        // ✅ 返回完整的 user 对象
    "id": "user-123",
    "name": "访客_033521",
    "avatar": "https://...",
    "source": "WEB",
    "tags": [],
    "email": null,
    "phone": null,
    "location": null,
    "notes": ""
  },
  "messages": [],                  // ✅ 至少返回空数组
  "unreadCount": 0,                // ✅ 返回未读数
  "groupId": "e0843dbe-db32-48a5-b749-a602c76b1153",
  "primaryAgentId": "22222222-2222-2222-2222-222222222222",
  "supportAgentIds": []
}
```

### 方案 2: 前端适配 (临时方案)

在前端添加数据转换层:

```typescript
// 创建 API 响应类型
interface ApiChatSession {
  id: string;
  status: string;
  lastActiveAt: string;  // ISO 时间字符串
  userId: string | null;
  groupId: string;
  primaryAgentId: string;
  supportAgentIds: string[];
}

// 转换函数
function transformSession(apiSession: ApiChatSession, groups: ChatGroup[]): ChatSession {
  // 从 groupId 获取用户信息
  const group = groups.find(g => g.id === apiSession.groupId);
  const guestName = group?.name || '未知用户';
  
  return {
    id: apiSession.id,
    userId: apiSession.userId || 'unknown',
    user: {
      id: apiSession.userId || 'unknown',
      name: guestName,
      avatar: undefined,  // 使用默认头像
      source: 'WEB' as UserSource,
      tags: [],
      notes: ''
    },
    messages: [],  // 空数组
    status: apiSession.status as ChatStatus,
    lastActive: new Date(apiSession.lastActiveAt).getTime(),  // 转换为时间戳
    unreadCount: 0,  // 默认为 0
    groupId: apiSession.groupId,
    primaryAgentId: apiSession.primaryAgentId,
    supportAgentIds: apiSession.supportAgentIds
  };
}

// 在 fetchBootstrapData 中使用
const data = await api.get<BootstrapResponse>('/bootstrap');
const transformedSessions = data.sessions.map(s => transformSession(s, data.groups));
setSessions(transformedSessions.sort((a,b) => b.lastActive - a.lastActive));
```

### 方案 3: 混合方案

1. **短期**: 前端添加转换层,确保应用不崩溃
2. **中期**: 后端逐步完善数据返回
3. **长期**: 统一前后端数据契约,使用 TypeScript 共享类型

## 🔧 前端临时修复实现

创建 `services/dataTransformer.ts`:

```typescript
import { ChatSession, ChatGroup, UserSource, ChatStatus } from '../types';

interface ApiChatSession {
  id: string;
  status: string;
  lastActiveAt: string;
  userId: string | null;
  groupId: string;
  primaryAgentId: string;
  supportAgentIds: string[];
}

export function transformBootstrapSession(
  apiSession: ApiChatSession, 
  groups: ChatGroup[]
): ChatSession {
  // 尝试从 group 名称提取用户信息
  const group = groups.find(g => g.id === apiSession.groupId);
  const groupName = group?.name || '未知访客';
  
  // 从 "访客_033521 的咨询" 提取 "访客_033521"
  const userName = groupName.replace(/ 的咨询$/, '') || groupName;
  
  return {
    id: apiSession.id,
    userId: apiSession.userId || `guest-${apiSession.id.slice(0, 8)}`,
    user: {
      id: apiSession.userId || `guest-${apiSession.id.slice(0, 8)}`,
      name: userName,
      avatar: undefined,  // 将使用 DEFAULT_AVATAR
      source: UserSource.WEB,
      tags: [],
      aiTags: [],
      email: undefined,
      phone: undefined,
      location: undefined,
      notes: ''
    },
    messages: [],  // 空消息数组
    status: apiSession.status as ChatStatus,
    lastActive: new Date(apiSession.lastActiveAt).getTime(),  // ISO 字符串转时间戳
    unreadCount: 0,  // 默认未读数
    groupId: apiSession.groupId,
    primaryAgentId: apiSession.primaryAgentId,
    supportAgentIds: apiSession.supportAgentIds
  };
}
```

在 `App.tsx` 中使用:

```typescript
import { transformBootstrapSession } from './services/dataTransformer';

const fetchBootstrapData = useCallback(async (loggedInUser: Agent, token: string) => {
  setLoadingState('LOADING');
  try {
    const data = await api.get<any>('/bootstrap');  // 使用 any 接收后端数据
    
    // ✅ 转换 sessions 数据
    const transformedSessions = data.sessions.map((s: any) => 
      transformBootstrapSession(s, data.groups)
    );
    
    setSessions(transformedSessions.sort((a,b) => b.lastActive - a.lastActive));
    setAgents(data.agents);
    setChatGroups(data.groups);
    setRoles(data.roles);
    setSystemQuickReplies(data.quickReplies);
    setKnowledgeBase(data.knowledgeBase);
    
    // ... 其余代码
  } catch (error) {
    // ... 错误处理
  }
}, [handleWebSocketMessage]);
```

## 📋 后端修改建议

### 1. 补充完整的用户信息

在 Bootstrap API 中关联并返回用户对象:

```sql
-- 假设的后端查询
SELECT 
  s.*,
  c.id as customer_id,
  c.name as customer_name,
  c.avatar_url as customer_avatar,
  c.email as customer_email,
  c.phone as customer_phone,
  c.source as customer_source
FROM sessions s
LEFT JOIN customers c ON s.customer_id = c.id
WHERE s.agent_id = ?
```

### 2. 添加消息数组

至少返回最近的几条消息,或者空数组:

```json
"messages": [
  {
    "id": "msg-1",
    "text": "你好",
    "sender": "USER",
    "timestamp": 1732530924000
  }
]
```

### 3. 添加未读计数

```json
"unreadCount": 3  // 该会话有 3 条未读消息
```

### 4. 统一时间格式

使用时间戳而不是 ISO 字符串:

```json
"lastActive": 1732530924000  // Unix timestamp in milliseconds
```

## 🎯 优先级建议

### 🔥 高优先级 (立即修复)
1. **添加 user 对象** - 必需,否则应用无法运行
2. **修正字段名** - `lastActiveAt` → `lastActive` 且改为时间戳
3. **添加空 messages 数组** - 防止崩溃

### ⚠️ 中优先级 (短期修复)
4. **添加 unreadCount** - 影响用户体验
5. **修正 userId 为 null** - 应该有实际的用户 ID

### 💡 低优先级 (长期优化)
6. **返回最近消息** - 提升加载速度
7. **统一 API 契约** - 使用共享的 TypeScript 类型

## 🔍 检查清单

在部署前端适配方案前,确认:

- [ ] 创建 `dataTransformer.ts` 文件
- [ ] 实现 `transformBootstrapSession` 函数
- [ ] 修改 `fetchBootstrapData` 使用转换函数
- [ ] 测试空会话列表
- [ ] 测试单个会话
- [ ] 测试多个会话
- [ ] 测试排序功能
- [ ] 测试搜索功能
- [ ] 验证用户名从 group 名称正确提取

## 📞 后端沟通要点

与后端开发者沟通时,强调:

1. **前端期望的完整数据结构** (提供 ChatSession 类型定义)
2. **当前数据缺失的字段** (user, messages, unreadCount)
3. **字段命名不一致** (lastActiveAt vs lastActive)
4. **数据类型不匹配** (ISO 字符串 vs 时间戳)
5. **提供本文档作为参考**

## 相关文档

- `types.ts` - 前端类型定义
- `BUGFIX_MESSAGES_UNDEFINED.md` - messages 字段修复
- `BUGFIX_AVATAR_UNDEFINED.md` - avatar 字段修复
- `BUGFIX_USER_NOTES_UNDEFINED.md` - user 对象修复

这些修复文档都是因为后端数据不完整而产生的防御性编程措施。

# Bootstrap API 结构调整 - SessionGroups

## 📋 改动说明

将 Bootstrap API 从分离的 `groups` + `sessions` 结构改为嵌套的 `sessionGroups` 结构，使数据组织更清晰。

---

## 🔄 API 数据结构变化

### ❌ 旧结构
```json
{
  "groups": [
    { "id": "g1", "name": "访客_033521 的咨询", "system": false },
    { "id": "g2", "name": "Inbox", "system": true }
  ],
  "sessions": [
    { "id": "s1", "groupId": "g1", ... },
    { "id": "s2", "groupId": "g1", ... },
    { "id": "s3", "groupId": "g2", ... }
  ],
  "agents": [...],
  "roles": [...]
}
```

### ✅ 新结构
```json
{
  "sessionGroups": [
    {
      "id": "g1",
      "name": "访客_033521 的咨询",
      "system": false,
      "sessions": [
        { "id": "s1", "groupId": "g1", ... },
        { "id": "s2", "groupId": "g1", ... }
      ]
    },
    {
      "id": "g2",
      "name": "Inbox",
      "system": true,
      "sessions": [
        { "id": "s3", "groupId": "g2", ... }
      ]
    }
  ],
  "agents": [...],
  "roles": [...]
}
```

---

## 📁 修改的文件

### 1. `types.ts` - 新增 SessionGroup 接口

```typescript
/**
 * SessionGroup - Bootstrap API 返回的分组数据（包含该组的 sessions）
 */
export interface SessionGroup extends ChatGroup {
  sessions: ChatSession[];
}
```

**改动**:
- 新增 `SessionGroup` 接口，继承自 `ChatGroup`
- 包含 `sessions: ChatSession[]` 字段

---

### 2. `services/dataTransformer.ts` - 转换逻辑重构

#### 新增接口定义
```typescript
/**
 * API 返回的 SessionGroup 格式（新结构）
 */
interface ApiSessionGroup {
  id: string;
  name: string;
  system: boolean;  // 后端使用 system,前端期望 isSystem
  sessions: ApiChatSession[];  // 每个组内包含该组的 sessions
}
```

#### 新增转换函数
```typescript
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
      isSystem: apiGroup.system  // ✅ 字段名转换: system → isSystem
    });
    
    // 转换该组内的所有 Sessions
    apiGroup.sessions.forEach(apiSession => {
      sessions.push(transformBootstrapSession(apiSession, apiGroup.name));
    });
  });
  
  return { groups, sessions };
}
```

#### 修改的函数
```typescript
// ❌ 删除
export function transformChatGroup(apiGroup: ApiChatGroup): ChatGroup
export function transformChatGroups(apiGroups: ApiChatGroup[]): ChatGroup[]
export function transformBootstrapSessions(apiSessions: ApiChatSession[], groups: ChatGroup[]): ChatSession[]

// ✅ 修改
export function transformBootstrapSession(
  apiSession: ApiChatSession, 
  groupName: string  // 从 groups: ChatGroup[] 改为 groupName: string
): ChatSession
```

---

### 3. `App.tsx` - 使用新转换函数

#### 修改 import
```typescript
// ❌ 旧
import { transformBootstrapSessions, transformChatGroups } from './services/dataTransformer';

// ✅ 新
import { transformSessionGroups } from './services/dataTransformer';
```

#### 修改 BootstrapResponse 接口
```typescript
interface BootstrapResponse {
  sessionGroups: any[];  // ✅ 新字段（替代 groups + sessions）
  agents: Agent[];
  roles: Role[];
  quickReplies: QuickReply[];
  knowledgeBase: KnowledgeEntry[];
}
```

#### 修改 fetchBootstrapData 函数
```typescript
const fetchBootstrapData = useCallback(async (loggedInUser: Agent, token: string) => {
  setLoadingState('LOADING');
  try {
    const data = await api.get<any>('/bootstrap');
    
    // ✅ 一次性转换 sessionGroups，同时得到 groups 和 sessions
    const { groups, sessions } = transformSessionGroups(data.sessionGroups || []);
    
    setSessions(sessions.sort((a,b) => b.lastActive - a.lastActive));
    setChatGroups(groups);
    // ... 其他逻辑
  }
}, [handleWebSocketMessage]);
```

---

## ✅ 改动优势

### 1. **数据结构更清晰**
- Session 直接嵌套在所属的 Group 内
- 避免了通过 `groupId` 手动关联

### 2. **减少数据冗余**
- 不需要在每个 Session 中重复存储 `groupId`（虽然仍保留用于兼容性）
- Group 信息直接包含在父级

### 3. **查询效率更高**
- 后端一次查询即可带出分组及其所有 Session
- 前端不需要二次关联处理

### 4. **代码更简洁**
- 转换逻辑集中在一个函数 `transformSessionGroups`
- 不需要先转 groups 再转 sessions

---

## 🔍 转换逻辑详解

### 输入（后端 API）
```json
{
  "sessionGroups": [
    {
      "id": "g1",
      "name": "访客_033521 的咨询",
      "system": false,
      "sessions": [
        {
          "id": "s1",
          "status": "AI_HANDLING",
          "lastActiveAt": "2025-11-25T10:30:00Z",
          "userId": null,
          "groupId": "g1",
          "primaryAgentId": "agent1",
          "supportAgentIds": []
        }
      ]
    }
  ]
}
```

### 输出（前端使用）
```typescript
{
  groups: [
    { id: "g1", name: "访客_033521 的咨询", isSystem: false }
  ],
  sessions: [
    {
      id: "s1",
      userId: "guest-s1",
      user: {
        id: "guest-s1",
        name: "访客_033521",
        avatar: undefined,
        source: "WEB",
        tags: [],
        notes: ""
      },
      messages: [],
      status: "AI_HANDLING",
      lastActive: 1732531800000,
      unreadCount: 0,
      groupId: "g1",
      primaryAgentId: "agent1",
      supportAgentIds: []
    }
  ]
}
```

### 关键转换点
1. **字段名**: `system` → `isSystem`
2. **时间格式**: ISO 字符串 → 时间戳数字
3. **用户提取**: 从 `group.name` 提取用户名
4. **默认值**: 添加 `messages`, `unreadCount`, `user` 等缺失字段

---

## 🎯 后续建议

### 后端 API 规范
```typescript
interface SessionGroupResponse {
  id: string;
  name: string;
  system: boolean;  // 建议改为 isSystem
  sessions: SessionResponse[];
}

interface SessionResponse {
  id: string;
  status: "AI_HANDLING" | "HUMAN_HANDLING" | "RESOLVED";
  lastActiveAt: string;  // ISO 8601
  userId: string | null;
  groupId: string;
  primaryAgentId: string;
  supportAgentIds: string[];
}
```

### 可选优化
1. **考虑直接返回 `isSystem`**: 避免前端字段名转换
2. **提供 user 对象**: 减少前端从 group.name 提取用户信息的逻辑
3. **返回消息数**: 可选返回 `messageCount` 或最新消息预览

---

## 📝 测试检查清单

- [x] 类型定义无错误
- [x] 数据转换逻辑正确
- [x] Bootstrap API 调用成功
- [ ] Sessions 正确显示在对应分组
- [ ] 系统分组（Inbox/Resolved）正常工作
- [ ] WebSocket 消息更新不影响分组结构
- [ ] 切换 Session 不出现崩溃

---

## 📅 更新日期
2025-11-25

## 👤 相关人员
- 后端开发: 需更新 Bootstrap API 返回格式
- 前端开发: 已完成数据转换逻辑适配

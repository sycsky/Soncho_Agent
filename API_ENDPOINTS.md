# 📡 API 接口文档

## 后端 API 端点汇总

---

## 🔐 认证相关

### 登录
```http
POST /api/v1/auth/login
Content-Type: application/json

Request:
{
  "email": "agent@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "agent": {
    "id": "agent-id",
    "name": "Agent Name",
    "email": "agent@example.com",
    "roleId": "role-id",
    "avatar": "https://...",
    "status": "ONLINE"
  }
}
```

---

## 🚀 Bootstrap（初始化数据）

### 获取工作区数据
```http
GET /api/v1/bootstrap
Authorization: Bearer {token}

Response:
{
  "sessionGroups": [
    {
      "id": "group-id",
      "name": "Open",
      "system": true,
      "agentId": "agent-id",
      "icon": "📥",
      "color": "#3B82F6",
      "sortOrder": 0,
      "sessions": [
        {
          "id": "session-id",
          "userId": "user-id",
          "user": {
            "id": "user-id",
            "name": "访客_978583",
            "primaryChannel": "WEB",
            "email": null,
            "phone": null,
            "metadata": {},
            "active": true,
            "createdAt": "2025-11-25T11:26:18.651416Z"
          },
          "status": "HUMAN_HANDLING",
          "lastActive": 1764069979000,
          "lastMessage": {
            "id": "msg-id",
            "text": "Hello",
            "sender": "USER",
            "timestamp": 1764069979000,
            "isInternal": false,
            "attachments": [],
            "mentions": []
          },
          "unreadCount": 0,
          "groupId": "...",
          "sessionGroupIds": { "agent-id": "group-id" },
          "primaryAgentId": "agent-id",
          "supportAgentIds": []
        }
      ],
      "createdAt": "2025-11-25T11:04:23Z",
      "updatedAt": "2025-11-25T11:04:23Z"
    }
  ],
  "agents": [
    {
      "id": "agent-id",
      "name": "Agent Name",
      "roleId": "role-id",
      "avatar": "https://...",
      "status": "ONLINE",
      "email": "agent@example.com"
    }
  ],
  "roles": [
    {
      "id": "role-id",
      "name": "Customer Support",
      "description": "Handle customer inquiries",
      "isSystem": false,
      "permissions": {
        "viewAnalytics": true,
        "manageKnowledgeBase": false,
        "manageSystem": false,
        "manageTeam": false,
        "deleteChats": false
      }
    }
  ],
  "quickReplies": [
    {
      "id": "qr-id",
      "label": "Greeting",
      "text": "Hello! How can I help you today?",
      "category": "General"
    }
  ],
  "knowledgeBase": [
    {
      "id": "kb-id",
      "title": "How to reset password",
      "content": "To reset your password...",
      "updatedAt": 1764069979000
    }
  ]
}
```

**说明**:
- ✅ 返回 `sessionGroups`（嵌套结构）
- ✅ 每个 session 包含 `lastMessage`（最后一条消息预览）
- ❌ **不返回** 完整的 `messages` 数组（通过独立接口加载）

---

## 💬 会话消息

### 获取会话历史消息
```http
GET /api/v1/chat/sessions/{sessionId}/messages
Authorization: Bearer {token}

Response:
[
  {
    "id": "msg-1",
    "text": "Hello, I need help",
    "sender": "USER",
    "timestamp": 1764069970000,
    "isInternal": false,
    "attachments": [],
    "mentions": []
  },
  {
    "id": "msg-2",
    "text": "Hi! How can I assist you?",
    "sender": "AGENT",
    "timestamp": 1764069975000,
    "isInternal": false,
    "attachments": [],
    "mentions": []
  }
]
```

**前端调用**:
```typescript
// 注意：api.ts 已经包含 /api/v1 前缀，所以 endpoint 不需要重复
const messages = await api.get(`/chat/sessions/${sessionId}/messages`);
// 实际请求: GET /api/v1/chat/sessions/{sessionId}/messages
```

**说明**:
- 按时间升序排列（最早的消息在前）
- 只在用户打开会话时调用
- 建议限制返回最近 500 条消息

---

## 🔌 WebSocket 实时通信

### 连接
```
ws://your-domain/ws?token={jwt-token}
```

### 消息格式

#### 1. 发送消息
```json
{
  "type": "sendMessage",
  "payload": {
    "sessionId": "session-id",
    "text": "Hello",
    "attachments": [],
    "isInternal": false,
    "mentions": [],
    "translation": {
      "isTranslated": true,
      "targetLanguage": "Spanish",
      "originalText": "Hello"
    }
  }
}
```

#### 2. 接收新消息
```json
{
  "type": "newMessage",
  "payload": {
    "sessionId": "session-id",
    "message": {
      "id": "msg-id",
      "text": "Hello",
      "sender": "USER",
      "timestamp": 1764069979000,
      "isInternal": false,
      "attachments": [],
      "mentions": []
    }
  }
}
```

#### 3. 更新会话状态
```json
{
  "type": "updateSessionStatus",
  "payload": {
    "sessionId": "session-id",
    "action": "RESOLVE",
    "payload": {
      "note": "Issue resolved"
    }
  }
}
```

可用的 actions:
- `RESOLVE` - 标记为已解决
- `TOGGLE_AI` - 切换 AI/人工处理
- `TRANSFER` - 转移会话

#### 4. 会话更新通知
```json
{
  "type": "sessionUpdated",
  "payload": {
    "id": "session-id",
    "status": "RESOLVED",
    "user": { ... },
    "lastActive": 1764069979000,
    ...
  }
}
```

#### 5. 用户资料更新
```json
{
  "type": "updateUserProfile",
  "payload": {
    "userId": "user-id",
    "updates": {
      "tags": ["VIP", "Premium"],
      "notes": "Important customer"
    }
  }
}
```

#### 6. 客服状态变化
```json
{
  "type": "agentStatusChanged",
  "payload": {
    "agentId": "agent-id",
    "status": "BUSY"
  }
}
```

#### 7. 通知
```json
{
  "type": "notification",
  "payload": {
    "type": "SUCCESS",
    "message": "Session transferred successfully"
  }
}
```

---

## 📊 其他接口（待实现）

### 团队管理
```http
POST /api/v1/agents
PUT /api/v1/agents/{agentId}
DELETE /api/v1/agents/{agentId}
```

### 分组管理
```http
POST /api/v1/session-groups
PUT /api/v1/session-groups/{groupId}
DELETE /api/v1/session-groups/{groupId}
POST /api/v1/sessions/{sessionId}/move
```

### 知识库
```http
GET /api/v1/knowledge-base
POST /api/v1/knowledge-base
PUT /api/v1/knowledge-base/{id}
DELETE /api/v1/knowledge-base/{id}
```

### 快捷回复
```http
GET /api/v1/quick-replies
POST /api/v1/quick-replies
DELETE /api/v1/quick-replies/{id}
```

### 角色权限
```http
GET /api/v1/roles
POST /api/v1/roles
PUT /api/v1/roles/{roleId}
DELETE /api/v1/roles/{roleId}
```

---

## 🔒 认证说明

所有 API 请求（除了登录）都需要在 Header 中携带 JWT Token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token 过期时间：24 小时

---

## ⚠️ 错误处理

### 错误响应格式
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 常见错误码
- `400` - Bad Request（参数错误）
- `401` - Unauthorized（未认证或 Token 过期）
- `403` - Forbidden（无权限）
- `404` - Not Found（资源不存在）
- `500` - Internal Server Error（服务器错误）

---

## 🎯 关键设计原则

### 1. 懒加载策略
- Bootstrap API 只返回必要数据（会话列表 + 最后一条消息）
- 完整消息历史通过独立接口按需加载
- 性能提升：响应大小减少 99%

### 2. 实时更新
- 使用 WebSocket 推送实时消息
- 避免轮询，减少服务器负载
- 保证多端同步

### 3. 数据嵌套
- `sessionGroups` 包含 `sessions`
- 减少客户端关联逻辑
- 提升查询效率

---

## 📝 版本信息

- **API 版本**: v1
- **最后更新**: 2025-11-25
- **兼容性**: 支持 Bootstrap API v2.0（sessionGroups 结构）

---

## 🔗 相关文档

- `API_CHANGES_SUMMARY.md` - API 改动汇总
- `FEATURE_LAZY_LOAD_MESSAGES.md` - 消息懒加载详解
- `WEBSOCKET_INTEGRATION_EXAMPLE.md` - WebSocket 使用示例

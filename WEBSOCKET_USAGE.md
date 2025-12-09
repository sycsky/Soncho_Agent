# WebSocket 使用说明

本文档说明如何在前端应用中使用 WebSocket 服务。

## 已实现的功能

### 1. 连接 WebSocket

```typescript
import websocketService from './services/websocketService';

// 在 App.tsx 中已实现
const token = localStorage.getItem('nexus_token');
websocketService.connect(token, handleWebSocketMessage);
```

### 2. 消息处理

WebSocket 服务已支持两种消息格式的自动转换：

#### 格式 1: 事件响应
服务端返回：
```json
{
  "type": "subscription_confirmed",
  "data": {
    "sessionId": "session-uuid-123",
    "status": "subscribed"
  }
}
```

转换为统一格式：
```typescript
{
  type: "subscription_confirmed",
  payload: {
    "sessionId": "session-uuid-123",
    "status": "subscribed"
  }
}
```

#### 格式 2: 聊天消息
服务端返回：
```json
{
  "channel": "WEB",
  "conversationId": "session-123",
  "senderId": "user-456",
  "content": "Hello!",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

转换为统一格式：
```typescript
{
  type: "chatMessage",
  payload: {
    "channel": "WEB",
    "conversationId": "session-123",
    "senderId": "user-456",
    "content": "Hello!",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 3. 发送消息的三种方式

#### 方式 1: 使用原有格式（保持兼容）
```typescript
websocketService.send({
  type: 'sendMessage',
  payload: {
    sessionId: activeSessionId,
    text: 'Hello',
    attachments: []
  }
});
```

#### 方式 2: 发送事件消息（新增）
```typescript
// 订阅会话
websocketService.sendEvent('subscribe', {
  sessionId: 'session-uuid-123'
});

// 取消订阅
websocketService.sendEvent('unsubscribe', {
  sessionId: 'session-uuid-123'
});

// 发送正在输入状态
websocketService.sendEvent('typing', {
  sessionId: 'session-uuid-123'
});

// 更改坐席状态
websocketService.sendEvent('status_change', {
  status: 'ONLINE'
});
```

#### 方式 3: 发送聊天消息（新增）
```typescript
websocketService.sendChatMessage(
  'conversation-id',    // conversationId
  'current-user-id',    // senderId
  'Hello, how can I help?',  // content
  { attachments: [] }   // metadata (可选)
);
```

### 4. 在组件中使用示例

#### 发送聊天消息
```typescript
const handleSendMessage = (text: string, attachments: Attachment[]) => {
  if (!activeSessionId) return;
  
  // 方式 1: 使用原有格式
  websocketService.send({
    type: 'sendMessage',
    payload: {
      sessionId: activeSessionId,
      text,
      attachments
    }
  });
  
  // 或者 方式 2: 使用新的聊天消息格式
  websocketService.sendChatMessage(
    activeSessionId,
    currentUser.id,
    text,
    { attachments }
  );
};
```

#### 订阅会话更新
```typescript
const subscribeToSession = (sessionId: string) => {
  websocketService.sendEvent('subscribe', { sessionId });
};
```

#### 更改坐席状态
```typescript
const changeStatus = (status: 'ONLINE' | 'BUSY' | 'OFFLINE') => {
  websocketService.sendEvent('status_change', { status });
};
```

#### 发送正在输入状态
```typescript
const sendTypingStatus = (sessionId: string) => {
  websocketService.sendEvent('typing', { sessionId });
};
```

## API 参考

### `websocketService.connect(token, onMessage)`
连接 WebSocket 服务。

**参数**:
- `token`: string - 认证 Token
- `onMessage`: (message: ServerMessage) => void - 消息处理回调

**示例**:
```typescript
websocketService.connect(token, (message) => {
  console.log('收到消息:', message);
});
```

### `websocketService.send(message)`
发送消息（原有格式）。

**参数**:
- `message`: { type: string, payload: any }

**示例**:
```typescript
websocketService.send({
  type: 'sendMessage',
  payload: { text: 'Hello' }
});
```

### `websocketService.sendEvent(event, payload)`
发送事件消息（新增）。

**参数**:
- `event`: string - 事件名称
- `payload`: any - 事件数据

**支持的事件**:
- `subscribe` - 订阅会话
- `unsubscribe` - 取消订阅
- `typing` - 正在输入
- `status_change` - 状态变更

**示例**:
```typescript
websocketService.sendEvent('subscribe', {
  sessionId: 'session-123'
});
```

### `websocketService.sendChatMessage(conversationId, senderId, content, metadata?)`
发送聊天消息（新增）。

**参数**:
- `conversationId`: string - 会话 ID
- `senderId`: string - 发送者 ID
- `content`: string - 消息内容
- `metadata?`: Record<string, any> - 元数据（可选）

**示例**:
```typescript
websocketService.sendChatMessage(
  'conv-123',
  'user-456',
  'Hello!',
  { attachments: [] }
);
```

### `websocketService.disconnect()`
断开 WebSocket 连接。

**示例**:
```typescript
websocketService.disconnect();
```

## 消息处理示例

### 在 App.tsx 中处理不同类型的消息

```typescript
const handleWebSocketMessage = useCallback((message: ServerMessage) => {
  console.log("Received WS Message:", message);
  
  switch (message.type) {
    case 'chatMessage':
      // 处理聊天消息
      const chatMsg = message.payload;
      console.log(`${chatMsg.senderId}: ${chatMsg.content}`);
      break;
      
    case 'subscription_confirmed':
      // 订阅确认
      console.log('订阅成功:', message.payload);
      break;
      
    case 'newMessage':
      // 新消息通知
      const { sessionId, message: newMessage } = message.payload;
      updateSessionMessages(sessionId, newMessage);
      break;
      
    case 'sessionUpdated':
      // 会话更新
      const updatedSession = message.payload;
      updateSession(updatedSession);
      break;
      
    default:
      console.warn('未处理的消息类型:', message.type);
  }
}, []);
```

## 调试技巧

### 1. 查看 WebSocket 连接状态
打开浏览器开发者工具 → Network → WS，可以看到：
- 连接状态
- 发送的消息
- 接收的消息

### 2. 打印所有消息
```typescript
websocketService.connect(token, (message) => {
  console.log('📨 收到消息:', JSON.stringify(message, null, 2));
});
```

### 3. 检查连接错误
查看控制台中的错误信息：
- `❌ WebSocket (SockJS) error:` - 连接错误
- `Failed to parse WebSocket message:` - 消息解析错误
- `WebSocket is not connected` - 发送消息时未连接

## 注意事项

1. **Token 有效性**: 确保 Token 在连接时有效且未过期
2. **自动重连**: 服务已实现自动重连（5 秒间隔）
3. **消息格式**: 支持多种消息格式，自动转换为统一格式
4. **兼容性**: 保持向后兼容，旧的 `send()` 方法仍然可用
5. **错误处理**: 所有错误会在控制台输出，便于调试

## 生产环境配置

确保在 `config.ts` 中配置正确的 WebSocket 地址：

```typescript
// config.ts
export const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com'  // 生产环境使用 HTTPS，WebSocket 会自动使用 WSS
  : 'http://127.0.0.1:8080';   // 开发环境
```

SockJS 会自动根据 HTTP/HTTPS 选择 WS/WSS 协议。

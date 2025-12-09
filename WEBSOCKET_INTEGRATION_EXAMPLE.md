# WebSocket 集成示例

本文档展示如何使用改进后的 `websocketService`,包含完整的错误处理、Token 过期处理和重连机制。

## 改进内容

基于 `WEBSOCKET_ERROR_HANDLING.md` 文档,已对 `websocketService.ts` 进行以下改进:

### ✅ 新增功能

1. **Token 过期自动处理**
   - 检测 WebSocket 异常关闭 (code=1006)
   - 客户端自动刷新 Token 并重连
   - 客服端提示重新登录

2. **智能重连机制**
   - 指数退避算法 (2s → 4s → 8s,最大 10s)
   - 最多重连 3 次
   - 区分 Token 问题和网络问题

3. **连接状态管理**
   - 提供状态回调: `connecting` | `connected` | `disconnected` | `reconnecting` | `error`
   - 可用于更新 UI 连接状态指示器

4. **增强的日志**
   - Token 掩码显示 (安全)
   - 详细的连接/断开事件日志
   - 错误分类和追踪

5. **用户通知**
   - 连接失败通知
   - Token 过期提示
   - 重连进度提示

## 使用示例

### 1. 客户端连接 (基础用法)

```typescript
import websocketService from './services/websocketService';

// 创建客户并获取 token
const createCustomer = async () => {
  const response = await fetch('/api/v1/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '张三',
      channel: 'WEB',
      metadata: { source: 'homepage' }
    })
  });
  
  const data = await response.json();
  return data;
};

// 连接 WebSocket
const connectWebSocket = async () => {
  const customerData = await createCustomer();
  
  websocketService.connect(
    customerData.token,
    (message) => {
      // 处理接收到的消息
      console.log('收到消息:', message);
      
      switch (message.type) {
        case 'chatMessage':
          displayMessage(message.payload);
          break;
        case 'offline_message':
          displayOfflineMessage(message.payload);
          break;
        case 'offline_messages_complete':
          console.log(`已加载 ${message.payload.count} 条离线消息`);
          break;
        default:
          console.warn('未知消息类型:', message.type);
      }
    }
  );
};

connectWebSocket();
```

### 2. 客户端连接 (完整配置)

```typescript
import websocketService from './services/websocketService';
import { useState } from 'react';

const ChatComponent = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [customerId, setCustomerId] = useState<string>('');
  
  const connectWithFullConfig = async () => {
    // 1. 创建客户
    const response = await fetch('/api/v1/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '张三',
        channel: 'WEB',
        metadata: { source: 'homepage' }
      })
    });
    
    const customerData = await response.json();
    setCustomerId(customerData.id);
    
    // 2. 连接 WebSocket (完整配置)
    websocketService.connect(
      customerData.token,
      (message) => {
        handleMessage(message);
      },
      {
        customerId: customerData.id,
        channel: 'WEB',
        isCustomer: true,
        
        // 连接状态变化回调
        onStatusChange: (status) => {
          console.log('连接状态变化:', status);
          setConnectionStatus(status);
          
          // 更新 UI
          switch (status) {
            case 'connecting':
              showToast('正在连接...', 'info');
              break;
            case 'connected':
              showToast('已连接', 'success');
              break;
            case 'reconnecting':
              showToast('正在重新连接...', 'warning');
              break;
            case 'error':
              showToast('连接失败', 'error');
              break;
          }
        },
        
        // 自定义 Token 刷新逻辑 (可选)
        onTokenRefresh: async () => {
          const response = await fetch('/api/v1/customers/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: customerData.id,
              channel: 'WEB'
            })
          });
          
          const data = await response.json();
          return data.token;
        }
      }
    );
  };
  
  const handleMessage = (message: any) => {
    // 处理消息逻辑
  };
  
  const showToast = (message: string, type: string) => {
    // 显示通知
  };
  
  return (
    <div>
      <div className={`status-indicator status-${connectionStatus}`}>
        {connectionStatus}
      </div>
      {/* 其他 UI 组件 */}
    </div>
  );
};
```

### 3. 客服端连接

```typescript
import websocketService from './services/websocketService';

const AgentWorkspace = () => {
  const connectAsAgent = async () => {
    // 1. 客服登录
    const loginResponse = await fetch('/api/v1/public/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'agent001',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    // 2. 连接 WebSocket
    websocketService.connect(
      loginData.token,
      (message) => {
        console.log('收到客户消息:', message);
        updateWorkspace(message);
      },
      {
        isCustomer: false,
        onStatusChange: (status) => {
          if (status === 'error') {
            // 客服 Token 过期,提示重新登录
            alert('登录已过期，请重新登录');
            window.location.href = '/login';
          }
        }
      }
    );
  };
  
  return (
    <button onClick={connectAsAgent}>连接客服工作台</button>
  );
};
```

### 4. 发送消息

```typescript
// 发送聊天消息
const sendMessage = (sessionId: string, text: string) => {
  websocketService.sendChatMessage(
    sessionId,
    customerId,
    text,
    { timestamp: new Date().toISOString() }
  );
};

// 发送事件
const subscribeToSession = (sessionId: string) => {
  websocketService.sendEvent('subscribe', { sessionId });
};

// 发送状态变更
const updateStatus = (status: string) => {
  websocketService.sendEvent('status_change', { status });
};
```

### 5. UI 连接状态指示器

```tsx
import { useState, useEffect } from 'react';
import websocketService from './services/websocketService';

const ConnectionStatusBar = () => {
  const [status, setStatus] = useState<string>('disconnected');
  
  useEffect(() => {
    // 连接时设置状态回调
    // 注意:这里假设你已经在其他地方调用了 connect
    // 如果需要,可以在 connect 时传入状态回调
  }, []);
  
  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return { text: '正在连接...', color: 'blue', icon: '🔄' };
      case 'connected':
        return { text: '已连接', color: 'green', icon: '✅' };
      case 'reconnecting':
        return { text: '正在重新连接...', color: 'orange', icon: '🔄' };
      case 'error':
        return { text: '连接失败', color: 'red', icon: '❌' };
      default:
        return { text: '未连接', color: 'gray', icon: '⚪' };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <div 
      className="connection-status-bar"
      style={{ 
        backgroundColor: config.color,
        padding: '8px 16px',
        color: 'white',
        display: status === 'connected' ? 'none' : 'block'
      }}
    >
      {config.icon} {config.text}
    </div>
  );
};
```

### 6. 完整的 React Hook 封装

```typescript
import { useState, useEffect, useCallback } from 'react';
import websocketService, { ServerMessage } from './services/websocketService';

interface UseWebSocketOptions {
  token: string;
  customerId?: string;
  channel?: string;
  isCustomer?: boolean;
  onTokenRefresh?: () => Promise<string>;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // 连接 WebSocket
    websocketService.connect(
      options.token,
      (message) => {
        setMessages(prev => [...prev, message]);
      },
      {
        customerId: options.customerId,
        channel: options.channel,
        isCustomer: options.isCustomer,
        onStatusChange: (status) => {
          setConnectionStatus(status);
          setIsConnected(status === 'connected');
        },
        onTokenRefresh: options.onTokenRefresh
      }
    );
    
    // 组件卸载时断开连接
    return () => {
      websocketService.disconnect();
    };
  }, [options.token]);
  
  const sendMessage = useCallback((sessionId: string, text: string) => {
    websocketService.sendChatMessage(sessionId, options.customerId || '', text);
  }, [options.customerId]);
  
  const sendEvent = useCallback((event: string, payload: any) => {
    websocketService.sendEvent(event, payload);
  }, []);
  
  return {
    connectionStatus,
    messages,
    isConnected,
    sendMessage,
    sendEvent
  };
};
```

使用 Hook:

```typescript
const ChatPage = () => {
  const { 
    connectionStatus, 
    messages, 
    isConnected, 
    sendMessage 
  } = useWebSocket({
    token: customerToken,
    customerId: customerId,
    channel: 'WEB',
    isCustomer: true
  });
  
  return (
    <div>
      <div>状态: {connectionStatus}</div>
      <div>
        {messages.map((msg, index) => (
          <div key={index}>{JSON.stringify(msg)}</div>
        ))}
      </div>
      <button 
        onClick={() => sendMessage(sessionId, '你好')}
        disabled={!isConnected}
      >
        发送消息
      </button>
    </div>
  );
};
```

## 错误处理场景

### 场景 1: Token 过期

```
1. 客户长时间未使用(Token 过期)
2. WebSocket 握手失败 (code=1006)
3. 自动调用 /api/v1/customers/token 刷新
4. 使用新 Token 重新连接
5. 推送离线消息
```

### 场景 2: 网络波动

```
1. 网络暂时中断
2. WebSocket 关闭 (code 可能为 1006 或其他)
3. 如果不是因为 Token,则直接重连
4. 使用指数退避算法重试 3 次
5. 成功重连后继续使用
```

### 场景 3: 客服 Token 过期

```
1. 客服工作 8 小时后 Token 过期
2. WebSocket 连接断开
3. 检测到是客服用户
4. 提示"登录已过期，请重新登录"
5. 跳转到登录页
```

## API 参考

### `websocketService.connect()`

连接 WebSocket 服务。

```typescript
websocketService.connect(
  token: string,
  onMessage: (message: ServerMessage) => void,
  options?: {
    customerId?: string;        // 客户 ID (用于自动刷新 Token)
    channel?: string;           // 渠道 (WEB/APP/WECHAT)
    isCustomer?: boolean;       // 是否为客户端 (默认 true)
    onStatusChange?: (status) => void;  // 状态变化回调
    onTokenRefresh?: () => Promise<string>;  // 自定义 Token 刷新
  }
)
```

### `websocketService.sendChatMessage()`

发送聊天消息。

```typescript
websocketService.sendChatMessage(
  conversationId: string,
  senderId: string,
  content: string,
  metadata?: Record<string, any>
)
```

### `websocketService.sendEvent()`

发送事件消息。

```typescript
websocketService.sendEvent(
  event: string,
  payload: any
)
```

### `websocketService.disconnect()`

断开连接。

```typescript
websocketService.disconnect()
```

### `websocketService.isConnected()`

检查是否已连接。

```typescript
const connected: boolean = websocketService.isConnected()
```

## 调试技巧

### Chrome DevTools

1. 打开 **Network** → **WS**
2. 查看握手请求的 **Response Headers**
3. 检查 `X-WebSocket-Error-Code` 和 `X-WebSocket-Error-Message`

### 控制台日志

改进后的服务会输出详细日志:

- `🔌 WebSocket 连接` - 连接开始
- `✅ WebSocket connected` - 连接成功
- `❌ WebSocket error` - 连接错误
- `⚠️ Token 可能已过期` - Token 问题
- `🔄 3000ms 后尝试第 1 次重连` - 重连进度
- `📢 通知用户` - 用户通知

## 最佳实践

1. **总是提供状态回调** - 用于更新 UI 连接状态
2. **客户端提供 customerId 和 channel** - 支持自动 Token 刷新
3. **客服端监听错误状态** - 及时引导重新登录
4. **使用 React Hook 封装** - 简化组件集成
5. **处理所有消息类型** - 包括离线消息、事件响应等

## 相关文档

- `WEBSOCKET_ERROR_HANDLING.md` - 详细的错误处理说明
- `WEBSOCKET_USAGE.md` - WebSocket 基础使用
- `WEBSOCKET_CONFIG.md` - WebSocket 配置指南

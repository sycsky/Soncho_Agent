# WebSocket 消息格式修复

## 问题描述

前端代码使用的 WebSocket 消息格式与后端规范不一致，导致消息发送和接收失败。

## 后端规范

### 发送消息格式
```json
{
  "event": "sendMessage",
  "payload": {
    "sessionId": "会话ID（UUID字符串）",
    "text": "消息文本内容",
    "isInternal": false,
    "attachments": [
      {
        "type": "IMAGE",
        "url": "附件URL",
        "name": "文件名.jpg",
        "sizeKb": 150
      }
    ],
    "mentions": ["@客服ID1", "@客服ID2"]
  }
}
```

### 接收消息格式
```json
{
  "event": "newMessage",
  "payload": {
    "sessionId": "会话ID",
    "message": {
      "id": "消息ID",
      "sessionId": "会话ID",
      "senderType": "AGENT",      // ⚠️ 注意：后端使用 senderType
      "agentId": "发送者ID",
      "text": "消息内容",
      "internal": false,           // ⚠️ 注意：后端使用 internal
      "translationData": {},
      "mentions": [],
      "attachments": [],
      "createdAt": "2025-11-25T12:00:00Z"
    }
  }
}
```

## 修复内容

### 1. **App.tsx 修改**

#### ✅ 消息发送 (handleSendMessage)
- **修改前**: 使用 `type: 'sendMessage'` 格式
- **修改后**: 使用 `sendEvent('sendMessage', payload)` 方法，符合后端规范
- **附件格式转换**: `size` → `sizeKb`，并转换为数字

```typescript
// 修改后
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
```

#### ✅ 消息接收 (handleWebSocketMessage)
- **字段映射**: 
  - `event` → `type` (统一为前端使用的 type)
  - `senderType` → `sender` (转换为前端枚举)
  - `internal` → `isInternal`
  - `createdAt` → `timestamp` (转换为毫秒数)
  - `translationData` → `translation`

```typescript
// 接收消息时的格式转换
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
  translation: backendMessage.translationData
};
```

#### ✅ 其他事件发送
所有 WebSocket 事件发送都改为使用 `sendEvent()` 方法：
- `updateSessionStatus` (解决会话、切换AI模式、转移会话)
- `updateUserProfile` (更新标签、备注)
- `changeAgentStatus` (更改客服状态)

### 2. **websocketService.ts 修改**

#### ✅ 消息接收处理
增强了消息格式的兼容性，支持多种格式：

1. **后端标准格式**: `{ event: string, payload: any }`
2. **旧格式1**: `{ type: string, data: any }`
3. **旧格式2**: `{ type: string, payload: any }`
4. **聊天消息格式**: `{ channel: string, content: string, ... }`

```typescript
if (message.event && message.payload !== undefined) {
  // 后端标准格式: { event: "newMessage", payload: {...} }
  serverMessage = {
    type: message.event,  // 统一转换为 type 字段
    payload: message.payload
  };
}
```

#### ✅ sendEvent 方法增强
添加了调试日志，方便追踪消息发送：

```typescript
console.group('📤 WebSocket 发送消息');
console.log('Event:', event);
console.log('Payload:', payload);
console.groupEnd();
```

## 字段映射表

| 前端字段 | 后端字段 (发送) | 后端字段 (接收) | 说明 |
|---------|----------------|----------------|------|
| - | `event` | `event` | 事件类型 |
| - | `payload` | `payload` | 事件数据 |
| `sender` | - | `senderType` | 消息发送者类型 |
| `isInternal` | `isInternal` | `internal` | 是否为内部消息 |
| `timestamp` | - | `createdAt` | 消息时间 |
| `translation` | - | `translationData` | 翻译数据 |
| `attachments[].size` | `attachments[].sizeKb` | `attachments[].sizeKb` | 附件大小 |

## 测试要点

1. ✅ **发送普通消息**: 文本消息正常发送
2. ✅ **发送带附件消息**: 图片/文件附件格式正确
3. ✅ **发送@提及消息**: mentions 数组正确传递
4. ✅ **发送内部备注**: isInternal 字段正确
5. ✅ **接收新消息**: senderType 正确转换为前端枚举
6. ✅ **接收内部消息**: internal 字段正确映射
7. ✅ **时间戳转换**: createdAt 正确转换为毫秒时间戳
8. ✅ **会话更新事件**: 解决、转移、AI切换等操作

## 兼容性说明

- **向后兼容**: websocketService 仍支持旧的 `type` 格式消息
- **向前兼容**: 优先使用新的 `event` 格式，符合后端标准
- **错误处理**: 无法识别的消息格式会打印警告，不会导致崩溃

## 相关文件

- `App.tsx` - 消息发送与接收逻辑
- `services/websocketService.ts` - WebSocket 服务
- `types.ts` - 类型定义

## 修复时间
2025-11-25

# 🐛 修复：API 路径重复问题

## 问题描述

调用会话消息接口时，路径重复了 `/api/v1`：

```
错误路径: /api/v1/api/v1/chat/sessions/{sessionId}/messages
         ^^^^^^^^ ^^^^^^^^ 重复了！
```

---

## 🔍 根本原因

`services/api.ts` 中的 `request` 方法已经自动添加了 `/api/v1` 前缀：

```typescript
// services/api.ts
async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}/api/v1${endpoint}`;
  //                      ^^^^^^^^ 已包含 /api/v1 前缀
  // ...
}
```

但在 `App.tsx` 中调用时，又手动添加了一次：

```typescript
// App.tsx (错误)
const messages = await api.get(`/api/v1/chat/sessions/${sessionId}/messages`);
//                              ^^^^^^^^ 多余的前缀
```

**结果**：
- 拼接后的路径：`${BASE_URL}/api/v1/api/v1/chat/sessions/${sessionId}/messages`
- 导致 404 Not Found

---

## ✅ 解决方案

### 修改 App.tsx

```typescript
// ❌ 错误（导致路径重复）
const messages = await api.get(`/api/v1/chat/sessions/${sessionId}/messages`);

// ✅ 正确（api.ts 会自动添加 /api/v1）
const messages = await api.get(`/chat/sessions/${sessionId}/messages`);
```

**完整代码**:
```typescript
const loadSessionMessages = async (sessionId: string) => {
  try {
    const messages = await api.get<Message[]>(`/chat/sessions/${sessionId}/messages`);
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, messages } : s
    ));
  } catch (error) {
    console.error('Failed to load session messages:', error);
    showToast('ERROR', 'Failed to load messages');
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, messages: [] } : s
    ));
  }
};
```

---

## 📋 API 调用规范

### 核心原则

**`api.ts` 已经包含 `/api/v1` 前缀，所以调用时不要重复添加！**

### 正确用法

| 前端调用 | 实际请求路径 |
|---------|-------------|
| `api.get('/bootstrap')` | `GET /api/v1/bootstrap` |
| `api.get('/chat/sessions/123/messages')` | `GET /api/v1/chat/sessions/123/messages` |
| `api.post('/auth/login', {...})` | `POST /api/v1/auth/login` |
| `api.put('/users/123', {...})` | `PUT /api/v1/users/123` |
| `api.delete('/agents/456')` | `DELETE /api/v1/agents/456` |

### 错误示例（不要这样做）

```typescript
// ❌ 错误：会变成 /api/v1/api/v1/bootstrap
api.get('/api/v1/bootstrap')

// ❌ 错误：会变成 /api/v1/api/v1/auth/login
api.post('/api/v1/auth/login', {...})

// ❌ 错误：会变成 /api/v1/api/v1/chat/sessions/123/messages
api.get('/api/v1/chat/sessions/123/messages')
```

---

## 🔍 如何验证修复

### 方法 1: 浏览器开发工具

1. 打开 Chrome DevTools (F12)
2. 切换到 **Network** 面板
3. 点击会话，触发消息加载
4. 查看请求路径：

**修复前**:
```
Request URL: http://localhost:3000/api/v1/api/v1/chat/sessions/xxx/messages
Status: 404 Not Found
```

**修复后**:
```
Request URL: http://localhost:3000/api/v1/chat/sessions/xxx/messages
Status: 200 OK
```

### 方法 2: 添加日志

在 `services/api.ts` 中添加：

```typescript
async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}/api/v1${endpoint}`;
  console.log('🔗 API Request:', url);  // ⬅️ 添加日志
  // ...
}
```

在控制台查看：
```
🔗 API Request: http://localhost:3000/api/v1/chat/sessions/xxx/messages
```

---

## 📝 相关修改

### 修改的文件
1. ✅ `App.tsx` - 修复 `loadSessionMessages` 函数
2. ✅ `API_ENDPOINTS.md` - 更新文档示例
3. ✅ `FEATURE_LAZY_LOAD_MESSAGES.md` - 更新文档示例
4. ✅ `API_CHANGES_SUMMARY.md` - 更新文档示例
5. ✅ `API_USAGE_GUIDE.md` - **新建**完整的 API 使用指南

### 不需要修改的文件
- `services/api.ts` - 保持不变（前缀逻辑正确）
- `components/ChatList.tsx` - 无 API 调用
- `types.ts` - 类型定义无关

---

## 🎯 最佳实践

### 1. 统一使用 API 服务

```typescript
// ✅ 推荐：使用封装的 api 服务
import api from './services/api';
const data = await api.get('/endpoint');

// ❌ 不推荐：直接使用 fetch
const response = await fetch(`${BASE_URL}/api/v1/endpoint`);
```

### 2. 使用 TypeScript 泛型

```typescript
// ✅ 推荐：指定返回类型
const messages = await api.get<Message[]>('/chat/sessions/123/messages');

// ⚠️ 可以但不推荐：不指定类型
const messages = await api.get('/chat/sessions/123/messages');
```

### 3. 错误处理

```typescript
// ✅ 推荐：添加 try-catch
try {
  const data = await api.get('/endpoint');
  // 处理成功响应
} catch (error) {
  // notificationService 已自动显示错误
  // 添加额外的错误处理逻辑
  console.error('Operation failed:', error);
}
```

### 4. 端点命名规范

```typescript
// ✅ 推荐：使用 REST 风格
api.get('/users')              // 获取列表
api.get('/users/123')          // 获取单个
api.post('/users', {...})      // 创建
api.put('/users/123', {...})   // 更新
api.delete('/users/123')       // 删除

// ❌ 不推荐：动词风格
api.get('/getUsers')
api.post('/createUser')
api.post('/updateUser')
```

---

## 🔧 调试技巧

### 快速检查 API 路径

在 `services/api.ts` 的 `request` 方法中临时添加：

```typescript
async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}/api/v1${endpoint}`;
  
  // 调试：检查路径是否正确
  if (url.includes('/api/v1/api/v1')) {
    console.error('❌ API 路径重复:', url);
    console.trace('调用堆栈');
  }
  
  // ...
}
```

---

## ✅ 检查清单

修复后验证：
- [x] `App.tsx` 中 `loadSessionMessages` 使用正确路径
- [x] 浏览器 Network 面板显示正确路径（无重复）
- [x] 消息加载成功（200 OK）
- [x] 所有文档更新为正确示例
- [x] 创建了 `API_USAGE_GUIDE.md` 避免未来错误

---

## 📅 修复记录
- **日期**: 2025-11-25
- **影响范围**: `App.tsx`
- **修复类型**: Bug Fix - API 路径错误
- **严重程度**: High（导致消息无法加载）
- **根本原因**: endpoint 重复包含 `/api/v1` 前缀

---

## 🔗 相关文档
- `API_USAGE_GUIDE.md` - API 使用指南（必读）
- `API_ENDPOINTS.md` - 完整的 API 端点文档
- `services/api.ts` - API 服务实现

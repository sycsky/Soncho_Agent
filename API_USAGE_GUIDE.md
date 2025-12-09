# 📘 API 使用指南

## 重要说明

`services/api.ts` 已经在所有请求中自动添加了 `/api/v1` 前缀，所以调用时 **不需要** 再加这个前缀。

---

## ✅ 正确用法

### API 服务配置
```typescript
// services/api.ts
const url = `${BASE_URL}/api/v1${endpoint}`;
//                      ^^^^^^^^ 已经包含前缀
```

### 调用示例

#### ❌ 错误（会导致路径重复）
```typescript
// 错误：会变成 /api/v1/api/v1/chat/sessions/xxx/messages
const messages = await api.get(`/api/v1/chat/sessions/${sessionId}/messages`);
```

#### ✅ 正确
```typescript
// 正确：最终路径是 /api/v1/chat/sessions/xxx/messages
const messages = await api.get(`/chat/sessions/${sessionId}/messages`);
```

---

## 📡 所有 API 调用规范

### 1. Bootstrap 数据
```typescript
// ✅ 正确
const data = await api.get('/bootstrap');

// 实际请求: GET {BASE_URL}/api/v1/bootstrap
```

### 2. 获取会话消息
```typescript
// ✅ 正确
const messages = await api.get(`/chat/sessions/${sessionId}/messages`);

// 实际请求: GET {BASE_URL}/api/v1/chat/sessions/{sessionId}/messages
```

### 3. 登录
```typescript
// ✅ 正确
const response = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
});

// 实际请求: POST {BASE_URL}/api/v1/auth/login
```

### 4. 更新用户资料
```typescript
// ✅ 正确
await api.put(`/users/${userId}`, {
  name: 'New Name',
  tags: ['VIP']
});

// 实际请求: PUT {BASE_URL}/api/v1/users/{userId}
```

### 5. 删除资源
```typescript
// ✅ 正确
await api.delete(`/quick-replies/${replyId}`);

// 实际请求: DELETE {BASE_URL}/api/v1/quick-replies/{replyId}
```

---

## 🔧 完整的 API 服务方法

### request (基础方法)
```typescript
api.request<T>(endpoint: string, options?: RequestInit): Promise<T>
```

### get
```typescript
api.get<T>(endpoint: string, options?: RequestInit): Promise<T>

// 示例
const data = await api.get<User>('/users/123');
```

### post
```typescript
api.post<T>(endpoint: string, body: unknown, options?: RequestInit): Promise<T>

// 示例
const newUser = await api.post<User>('/users', {
  name: 'John',
  email: 'john@example.com'
});
```

### put
```typescript
api.put<T>(endpoint: string, body: unknown, options?: RequestInit): Promise<T>

// 示例
const updated = await api.put<User>('/users/123', {
  name: 'John Updated'
});
```

### delete
```typescript
api.delete<T>(endpoint: string, options?: RequestInit): Promise<T>

// 示例
await api.delete('/users/123');
```

---

## 🔐 认证处理

API 服务会自动处理 Token：

```typescript
// Token 自动从 localStorage 获取
const token = localStorage.getItem('nexus_token');

// 自动添加到 Header
headers.set('Authorization', `Bearer ${token}`);
```

所以你不需要手动添加 Authorization Header。

---

## 📦 响应格式

后端统一响应格式：

```typescript
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

API 服务会自动解析并返回 `data` 字段：

```typescript
// 后端返回
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": "123",
    "name": "John"
  }
}

// api.get() 返回值
{
  "id": "123",
  "name": "John"
}
```

---

## ⚠️ 错误处理

### 自动错误提示

API 服务会自动通过 `notificationService` 显示错误：

```typescript
try {
  await api.get('/some-endpoint');
} catch (error) {
  // notificationService 已经自动显示错误提示
  // 你可以添加额外的错误处理逻辑
  console.error('Operation failed:', error);
}
```

### HTTP 状态码处理

```typescript
// 200-299: 成功
// 204: No Content（返回空）
// 400: Bad Request（参数错误）
// 401: Unauthorized（未认证）
// 403: Forbidden（无权限）
// 404: Not Found（资源不存在）
// 500: Internal Server Error（服务器错误）
```

### 自定义错误处理

```typescript
try {
  const data = await api.get('/endpoint');
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      // Token 过期，跳转登录
      handleLogout();
    } else if (error.message.includes('Network error')) {
      // 网络错误
      showOfflineMode();
    }
  }
}
```

---

## 🎯 实际使用案例

### 案例 1: 加载会话消息（App.tsx）

```typescript
const loadSessionMessages = async (sessionId: string) => {
  try {
    // ✅ endpoint 不包含 /api/v1
    const messages = await api.get<Message[]>(`/chat/sessions/${sessionId}/messages`);
    
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, messages } : s
    ));
  } catch (error) {
    console.error('Failed to load messages:', error);
    // notificationService 已经显示了错误
    // 设置为空数组避免重复请求
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, messages: [] } : s
    ));
  }
};

// 实际请求路径: GET /api/v1/chat/sessions/{sessionId}/messages
```

### 案例 2: 获取 Bootstrap 数据（App.tsx）

```typescript
const fetchBootstrapData = async (token: string) => {
  try {
    // ✅ endpoint 不包含 /api/v1
    const data = await api.get<any>('/bootstrap');
    
    const { groups, sessions } = transformSessionGroups(data.sessionGroups || []);
    setSessions(sessions);
    setChatGroups(groups);
    // ...
  } catch (error) {
    console.error('Failed to fetch bootstrap:', error);
    handleLogout();
  }
};

// 实际请求路径: GET /api/v1/bootstrap
```

### 案例 3: 登录（LoginScreen.tsx）

```typescript
const handleLogin = async (email: string, password: string) => {
  try {
    // ✅ endpoint 不包含 /api/v1
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password
    });
    
    localStorage.setItem('nexus_token', response.token);
    localStorage.setItem('nexus_user', JSON.stringify(response.agent));
    onLoginSuccess(response);
  } catch (error) {
    console.error('Login failed:', error);
    // notificationService 已经显示了错误
  }
};

// 实际请求路径: POST /api/v1/auth/login
```

---

## 📋 端点路径对照表

| 前端调用 | 实际请求路径 |
|---------|-------------|
| `api.get('/bootstrap')` | `GET /api/v1/bootstrap` |
| `api.get('/chat/sessions/123/messages')` | `GET /api/v1/chat/sessions/123/messages` |
| `api.post('/auth/login', {...})` | `POST /api/v1/auth/login` |
| `api.put('/users/123', {...})` | `PUT /api/v1/users/123` |
| `api.delete('/quick-replies/456')` | `DELETE /api/v1/quick-replies/456` |
| `api.get('/knowledge-base')` | `GET /api/v1/knowledge-base` |
| `api.post('/agents', {...})` | `POST /api/v1/agents` |

---

## 🔍 调试技巧

### 查看实际请求路径

在 `services/api.ts` 的 `request` 方法中添加日志：

```typescript
async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}/api/v1${endpoint}`;
  console.log('API Request:', url);  // ⬅️ 添加日志
  // ...
}
```

### 使用浏览器开发工具

1. 打开 Chrome DevTools (F12)
2. 切换到 Network 面板
3. 筛选 XHR/Fetch 请求
4. 查看请求的完整路径

---

## ✅ 检查清单

使用 API 服务时，确保：

- [ ] endpoint 以 `/` 开头
- [ ] endpoint **不包含** `/api/v1` 前缀
- [ ] 使用正确的 HTTP 方法（GET/POST/PUT/DELETE）
- [ ] POST/PUT 请求传递了 body 参数
- [ ] 添加了 try-catch 错误处理
- [ ] 使用 TypeScript 泛型指定返回类型

---

## 📅 最后更新
2025-11-25

## 🔗 相关文件
- `services/api.ts` - API 服务实现
- `services/notificationService.ts` - 错误通知服务
- `config.ts` - BASE_URL 配置

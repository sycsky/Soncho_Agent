# WebSocket 重复连接与 Bootstrap API 重复调用问题修复

## 🔴 问题描述

### 问题 1: WebSocket 连接 3 次
页面加载后 WebSocket 会连接 3 次，导致：
- 网络资源浪费
- 可能触发后端限流
- 接收重复的消息
- 调试困难

### 问题 2: Bootstrap API 调用 2 次
`/api/v1/bootstrap` 接口在页面刷新时被调用 2 次，原因：
- **React 18 Strict Mode** 在开发环境下会故意重复执行 effect
- 目的是帮助发现副作用问题和内存泄漏

## 🔍 问题分析

### 根本原因 1: React Hook 依赖链循环

**React useCallback 依赖链循环导致组件重复渲染**

```typescript
// 问题代码
const handleWebSocketMessage = useCallback((message) => {
  // ...
}, [activeSessionId]);  // ❌ 依赖 activeSessionId

const fetchBootstrapData = useCallback(async (user, token) => {
  // ...
  setActiveSessionId(sessions[0].id);  // ❌ 修改 activeSessionId
  websocketService.connect(token, handleWebSocketMessage);  // ❌ 依赖 handleWebSocketMessage
}, [handleWebSocketMessage]);  // ❌ 依赖 handleWebSocketMessage

useEffect(() => {
  // ...
  fetchBootstrapData(user, token);
}, [fetchBootstrapData]);  // ❌ 依赖 fetchBootstrapData
```

### 执行流程

```
1. 组件挂载，useEffect 执行
   → fetchBootstrapData() 被调用 [第 1 次连接]
   
2. fetchBootstrapData 中设置 activeSessionId
   → activeSessionId 变化
   
3. activeSessionId 变化导致 handleWebSocketMessage 重新创建
   → handleWebSocketMessage 引用变化
   
4. handleWebSocketMessage 变化导致 fetchBootstrapData 重新创建
   → fetchBootstrapData 引用变化
   
5. fetchBootstrapData 变化触发 useEffect 再次执行
   → fetchBootstrapData() 再次被调用 [第 2 次连接]
   
6. 重复步骤 2-5 [第 3 次连接]
```

### 根本原因 2: React 18 Strict Mode

**React 18 的 Strict Mode 在开发环境下会重复执行 effects**

```typescript
// index.tsx
root.render(
  <React.StrictMode>  // ⚠️ Strict Mode 会导致 effects 执行 2 次
    <App />
  </React.StrictMode>
);
```

**Strict Mode 执行流程**:
```
1. 组件首次挂载 → useEffect 执行 → fetchBootstrapData() [第 1 次]
2. Strict Mode 卸载组件（仅在开发环境）
3. Strict Mode 重新挂载组件 → useEffect 再次执行 → fetchBootstrapData() [第 2 次]
```

这是 React 18 的有意设计，用于：
- 检测副作用是否正确清理
- 发现潜在的内存泄漏
- 确保组件可以安全地重新挂载

**注意**: 生产环境不会有这个问题，Strict Mode 仅在开发模式生效。
```

## ✅ 解决方案

### 核心思路

1. **打破依赖链**: 移除 `fetchBootstrapData` 对 `handleWebSocketMessage` 的依赖
2. **防止重复连接**: 在连接前检查是否已连接
3. **使用 useRef**: 保存最新的消息处理函数，避免闭包问题
4. **防止 Strict Mode 重复初始化**: 使用 ref 标志跟踪初始化状态

### 修复代码

#### 1. 添加 useRef 保存状态

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';

function App() {
  // ✅ 使用 ref 保存最新的 WebSocket 消息处理函数
  const wsMessageHandlerRef = useRef<((message: ServerMessage) => void) | null>(null);
  
  // ✅ 使用 ref 防止重复初始化（防止 Strict Mode 重复调用）
  const isInitialized = useRef(false);
  
  // ... 其他代码
}
```

#### 2. 更新 ref 以保存最新的处理函数

```typescript
const handleWebSocketMessage = useCallback((message: ServerMessage) => {
  // ... 处理逻辑
}, [activeSessionId]);

// ✅ 每次 handleWebSocketMessage 更新时，更新 ref
useEffect(() => {
  wsMessageHandlerRef.current = handleWebSocketMessage;
}, [handleWebSocketMessage]);
```

#### 3. 移除 fetchBootstrapData 的依赖

```typescript
const fetchBootstrapData = useCallback(async (loggedInUser: Agent, token: string) => {
  // ... bootstrap 逻辑
  
  // ✅ 只在首次加载时连接，避免重复连接
  if (!websocketService.isConnected()) {
    websocketService.connect(token, (msg) => {
      // 使用 ref 调用最新的处理函数，避免闭包问题
      wsMessageHandlerRef.current?.(msg);
    });
  }
  
}, []); // ✅ 空依赖数组，不会因为其他状态变化而重新创建
```

#### 4. 防止 Strict Mode 重复调用

```typescript
useEffect(() => {
  // ✅ 防止 Strict Mode 导致的重复调用
  if (isInitialized.current) {
    console.log('⏭️ 跳过重复初始化 (Strict Mode)');
    return;
  }
  
  const token = localStorage.getItem('nexus_token');
  const userJson = localStorage.getItem('nexus_user');
  if (token && userJson) {
    try {
      const loggedInUser: Agent = JSON.parse(userJson);
      setIsAuthenticated(true);
      setCurrentUser(loggedInUser);
      fetchBootstrapData(loggedInUser, token);
      isInitialized.current = true; // ✅ 标记已初始化
    } catch (e) {
      handleLogout();
      setLoadingState('READY');
    }
  } else {
    setLoadingState('READY');
  }
}, []); // ✅ 只在组件挂载时执行一次
```

## 🎯 修复效果

### 修复前
```
📡 调用 Bootstrap API  (第1次)
🔌 WebSocket 连接      (第1次)
📡 调用 Bootstrap API  (第2次 - Strict Mode)
🔌 WebSocket 连接      (第2次 - 依赖链循环)
🔌 WebSocket 连接      (第3次 - 依赖链循环)
```

### 修复后 (开发环境)
```
📡 调用 Bootstrap API  (第1次)
🔌 WebSocket 连接      (仅1次)
⏭️ 跳过重复初始化 (Strict Mode)
```

### 修复后 (生产环境)
```
📡 调用 Bootstrap API  (仅1次)
🔌 WebSocket 连接      (仅1次)
```

## 📊 技术要点

### 1. useRef vs useCallback

| 特性 | useRef | useCallback |
|------|--------|-------------|
| 返回值变化 | 引用永远不变 | 依赖变化时重新创建 |
| 触发重渲染 | 否 | 是（如果被其他 hook 依赖） |
| 获取最新值 | `ref.current` | 直接调用 |
| 适用场景 | 保存可变值 | 优化函数传递性能 |

### 2. 依赖数组的影响

```typescript
// ❌ 问题：过度依赖导致重复执行
useEffect(() => {
  doSomething();
}, [dependency1, dependency2, dependency3]);

// ✅ 解决：只在必要时执行
useEffect(() => {
  doSomething();
}, []); // 仅首次执行

// 或使用 ref 避免闭包陈旧值问题
```

### 3. WebSocket 连接检查

```typescript
// ✅ 防止重复连接
if (!websocketService.isConnected()) {
  websocketService.connect(token, handler);
}
```

## 🔍 调试技巧

### 1. 追踪 useEffect 执行

```typescript
useEffect(() => {
  console.log('🔄 Effect 执行:', effectName);
  // ...
}, [dependencies]);
```

### 2. 监控依赖变化

```typescript
useEffect(() => {
  console.log('📦 依赖变化:', { dep1, dep2 });
}, [dep1, dep2]);
```

### 3. 检查 WebSocket 连接状态

```typescript
console.log('🔌 WebSocket 状态:', websocketService.isConnected());
```

## ⚠️ 注意事项

### 1. React 18 Strict Mode 的影响

**开发环境 vs 生产环境**:

| 环境 | Bootstrap API 调用次数 | WebSocket 连接次数 | 说明 |
|------|---------------------|------------------|------|
| 开发环境 (Strict Mode) | 1 次 | 1 次 | ✅ 使用 ref 防止重复 |
| 生产环境 | 1 次 | 1 次 | ✅ Strict Mode 不生效 |

**为什么不关闭 Strict Mode?**

虽然可以移除 `<React.StrictMode>` 来避免开发环境的重复调用，但**不推荐**这样做，因为：
- Strict Mode 帮助发现潜在问题
- 确保组件可以安全重新挂载（React 18 并发特性需要）
- 生产环境不受影响

**更好的做法**: 使用 `useRef` 防止重复初始化（已实现）

### 2. 闭包陈旧值问题

使用空依赖数组 `[]` 时，函数内的状态值会是首次渲染时的值（闭包）。

**解决方案：使用 useRef**

```typescript
// ❌ 问题：handler 会捕获旧的 activeSessionId
const fetchData = useCallback(() => {
  websocketService.connect(token, handleMessage); // handleMessage 捕获旧值
}, []);

// ✅ 解决：通过 ref 获取最新值
const handlerRef = useRef(handleMessage);
useEffect(() => { handlerRef.current = handleMessage; }, [handleMessage]);

const fetchData = useCallback(() => {
  websocketService.connect(token, (msg) => handlerRef.current(msg));
}, []);
```

### 2. WebSocket 断线重连

现有的重连逻辑不受影响，因为：
- 重连使用的是保存在 service 内部的 handler
- handler 通过 ref 始终指向最新的处理函数

## 🧪 测试建议

### 1. 功能测试
- [ ] 页面刷新后只连接 1 次
- [ ] 消息正常接收
- [ ] 断线重连正常
- [ ] 登录后连接正常

### 2. 性能测试
- [ ] 检查 Network 面板，确认只有 1 个 WebSocket 连接
- [ ] 检查 Console，确认没有重复的连接日志
- [ ] 检查组件渲染次数（使用 React DevTools Profiler）

### 3. 边界测试
- [ ] 快速刷新页面
- [ ] Token 过期后的重连
- [ ] 网络波动时的表现

## 📋 相关文件

- `App.tsx` - 主要修复位置
- `services/websocketService.ts` - WebSocket 服务
- `BUGFIX_WEBSOCKET_MESSAGE_FORMAT.md` - 消息格式修复

## 📚 参考资料

- [React useCallback](https://react.dev/reference/react/useCallback)
- [React useRef](https://react.dev/reference/react/useRef)
- [React useEffect](https://react.dev/reference/react/useEffect)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 修复时间
2025-11-25

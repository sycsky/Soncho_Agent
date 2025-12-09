# Bug 修复: Group 字段名不匹配 (system vs isSystem)

## 问题描述

Bootstrap API 返回的 `groups` 数据字段名与前端类型定义不匹配:

```json
// 后端返回
{
  "id": "...",
  "name": "访客_033522 的咨询",
  "system": false  // ❌ 错误: 应该是 isSystem
}

// 前端期望
{
  "id": "...",
  "name": "访客_033522 的咨询",
  "isSystem": false  // ✅ 正确
}
```

## 根本原因

后端使用 `system` 作为字段名,而前端 TypeScript 类型定义使用 `isSystem`:

```typescript
export interface ChatGroup {
  id: string;
  name: string;
  isSystem: boolean;  // 布尔值字段遵循 is/has 命名规范
}
```

## 影响

如果不修复,会导致:
- ❌ `group.isSystem` 为 `undefined`
- ❌ 无法正确判断系统分组
- ❌ 可能允许删除系统分组 (Inbox, Resolved)
- ❌ TypeScript 类型检查失败

## 解决方案

### 1. 添加 Group 转换器

在 `services/dataTransformer.ts` 中添加:

```typescript
/**
 * API 返回的 Group 格式
 */
interface ApiChatGroup {
  id: string;
  name: string;
  system: boolean;  // ❌ 后端使用 system
}

/**
 * 转换 Group 数据
 */
export function transformChatGroup(apiGroup: ApiChatGroup): ChatGroup {
  return {
    id: apiGroup.id,
    name: apiGroup.name,
    isSystem: apiGroup.system  // ✅ 字段名转换
  };
}

/**
 * 批量转换 groups
 */
export function transformChatGroups(apiGroups: ApiChatGroup[]): ChatGroup[] {
  return apiGroups.map(transformChatGroup);
}
```

### 2. 在 App.tsx 中使用

**修复前:**
```typescript
setChatGroups(data.groups || []);
```

**修复后:**
```typescript
import { transformChatGroups } from './services/dataTransformer';

// 转换 groups 数据
const transformedGroups = transformChatGroups(data.groups || []);

// 使用转换后的数据
setChatGroups(transformedGroups);

// 传递给 session 转换器
const transformedSessions = transformBootstrapSessions(
  data.sessions || [], 
  transformedGroups  // 使用转换后的 groups
);
```

## 修复文件

1. ✅ `services/dataTransformer.ts` - 添加 Group 转换函数
2. ✅ `App.tsx` - 使用 transformChatGroups
3. ✅ `API_BOOTSTRAP_MISMATCH_ANALYSIS.md` - 更新问题分析

## 字段命名规范

### TypeScript/JavaScript 布尔值命名

```typescript
// ✅ 推荐: 使用 is/has/can/should 前缀
isSystem: boolean
isActive: boolean
hasPermission: boolean
canEdit: boolean
shouldUpdate: boolean

// ❌ 不推荐: 直接使用名词
system: boolean
active: boolean
permission: boolean
```

### 后端 API 建议

建议后端也采用相同的命名规范:

```json
{
  "isSystem": false,  // ✅ 清晰表示这是布尔值
  "isActive": true,
  "hasMessages": false
}
```

## 测试场景

### ✅ 场景 1: 系统分组识别

```typescript
// 转换前
const apiGroup = { id: "1", name: "Inbox", system: true };
// isSystem 为 undefined ❌

// 转换后
const group = transformChatGroup(apiGroup);
console.log(group.isSystem);  // true ✅
```

### ✅ 场景 2: 防止删除系统分组

```typescript
// ChatList.tsx
{!group.isSystem && (
  <button onClick={() => onDeleteGroup(group.id)}>
    <Trash2 />
  </button>
)}
// 如果 isSystem 为 undefined,会错误地显示删除按钮 ❌
```

### ✅ 场景 3: 批量转换

```typescript
const apiGroups = [
  { id: "1", name: "Inbox", system: true },
  { id: "2", name: "客服组", system: false }
];

const groups = transformChatGroups(apiGroups);
// 所有 groups 都有正确的 isSystem 字段 ✅
```

## 相关问题

这个字段名不匹配是 Bootstrap API 数据格式问题的一部分:

1. **Session 数据**: `lastActiveAt` vs `lastActive`
2. **Group 数据**: `system` vs `isSystem` ← 本次修复
3. **缺失字段**: user, messages, unreadCount

## 后端修改建议

### 推荐方案: 统一字段命名

```json
{
  "groups": [
    {
      "id": "...",
      "name": "Inbox",
      "isSystem": true  // ✅ 使用 isSystem
    }
  ]
}
```

### 好处

1. **类型一致**: 前后端使用相同的字段名
2. **代码清晰**: 布尔值字段一目了然
3. **减少转换**: 不需要前端转换层
4. **降低错误**: 避免字段名拼写错误

## 影响范围

- ✅ **分组列表**: 正确识别系统分组
- ✅ **删除功能**: 系统分组不显示删除按钮
- ✅ **类型安全**: TypeScript 类型检查通过
- ✅ **代码维护**: 统一的命名规范

## 完成时间

2025-11-25

## 总结

通过添加 Group 数据转换器,我们:

1. ✅ 解决了字段名不匹配问题 (`system` → `isSystem`)
2. ✅ 保持了代码的类型安全
3. ✅ 遵循了 TypeScript 布尔值命名最佳实践
4. ✅ 为后端改进提供了清晰的建议

现在应用可以正确识别和处理系统分组了! 🎉

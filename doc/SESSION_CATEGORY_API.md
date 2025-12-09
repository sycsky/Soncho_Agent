# 会话分类模块使用指南

## 概述

会话分类模块允许管理员创建分类，并将会话自动分配到对应的分组中。每个客服可以将自己的分组绑定到特定分类，当新会话携带分类ID创建时，系统会自动将会话分配到绑定了该分类的分组。

## 核心功能

### 1. 分类管理 (CRUD)

分类是全局的，由管理员创建和管理，所有客服都可以看到。

#### 分类属性
- `id`: 分类唯一标识 (UUID)
- `name`: 分类名称 (全局唯一)
- `description`: 分类描述
- `icon`: 分类图标
- `color`: 分类颜色
- `sortOrder`: 排序顺序
- `enabled`: 是否启用
- `createdByAgentId`: 创建人ID

### 2. 分组与分类绑定

每个客服可以将自己的分组绑定到一个或多个分类。

**核心约束**：同一个客服下，每个分类只能绑定到一个分组。例如：
- Agent A 有分组 X 和 Y
- 如果分组 X 绑定了分类 1，那么分组 Y 就不能再绑定分类 1

### 3. 自动分组分配

当创建会话时携带 `categoryId`：
1. 系统查找主责客服是否有分组绑定了该分类
2. 如果找到，会话自动分配到该分组
3. 如果没有，会话分配到默认分组 (Open)

## API 接口

### 分类管理接口

#### 获取所有启用的分类
```
GET /api/v1/session-categories
```

#### 获取所有分类（包括禁用的）
```
GET /api/v1/session-categories/all
```

#### 获取分类详情
```
GET /api/v1/session-categories/{id}
```

#### 创建分类
```
POST /api/v1/session-categories
Content-Type: application/json

{
  "name": "技术支持",
  "description": "技术问题咨询",
  "icon": "🔧",
  "color": "#3B82F6",
  "sortOrder": 1
}
```

#### 更新分类
```
PUT /api/v1/session-categories/{id}
Content-Type: application/json

{
  "name": "技术支持-新",
  "description": "技术问题咨询（已更新）",
  "enabled": true
}
```

#### 删除分类
```
DELETE /api/v1/session-categories/{id}
```

### 分组分类绑定接口

#### 为分组绑定分类
```
POST /api/v1/session-groups/{groupId}/categories/{categoryId}
```

#### 解除分组的分类绑定
```
DELETE /api/v1/session-groups/{groupId}/categories/{categoryId}
```

#### 获取分组绑定的所有分类
```
GET /api/v1/session-groups/{groupId}/categories
```

#### 批量绑定分类到分组
```
PUT /api/v1/session-groups/{groupId}/categories
Content-Type: application/json

{
  "categoryIds": ["uuid1", "uuid2", "uuid3"]
}
```

### 创建会话时携带分类

在调用获取客户Token接口时，可以传入 `categoryId`：

```
POST /api/v1/public/customer-token
Content-Type: application/json

{
  "name": "张三",
  "channel": "WEB",
  "email": "zhang@example.com",
  "categoryId": "分类UUID"
}
```

## 数据模型

### session_categories 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(255) | 分类名称（唯一） |
| description | TEXT | 分类描述 |
| icon | VARCHAR(50) | 图标 |
| color | VARCHAR(20) | 颜色 |
| sort_order | INTEGER | 排序 |
| enabled | BOOLEAN | 是否启用 |
| created_by_agent_id | UUID | 创建人 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### session_group_category_bindings 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_group_id | UUID | 分组ID |
| category_id | UUID | 分类ID |
| agent_id | UUID | 客服ID |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**唯一约束**: `(agent_id, category_id)` - 确保同一客服下每个分类只能绑定到一个分组

### chat_sessions 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| category_id | UUID | 会话分类ID（可选） |

## 使用示例

### 场景：为不同业务类型自动分组

1. **管理员创建分类**
```bash
# 创建"售前咨询"分类
curl -X POST /api/v1/session-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "售前咨询", "icon": "💰", "color": "#10B981"}'

# 创建"售后支持"分类
curl -X POST /api/v1/session-categories \
  -H "Content-Type: application/json" \
  -d '{"name": "售后支持", "icon": "🔧", "color": "#F59E0B"}'
```

2. **客服绑定分类到自己的分组**
```bash
# 客服A创建"售前"分组并绑定分类
curl -X POST /api/v1/session-groups \
  -d '{"name": "售前", "icon": "💰", "color": "#10B981"}'

curl -X POST /api/v1/session-groups/{groupId}/categories/{售前咨询分类ID}
```

3. **客户端发起会话时指定分类**
```bash
# 从售前页面发起的咨询
curl -X POST /api/v1/public/customer-token \
  -d '{"name": "客户A", "channel": "WEB", "categoryId": "售前咨询分类ID"}'
```

4. **结果**
- 会话自动分配到客服A的"售前"分组
- 如果客服A没有绑定该分类的分组，则分配到默认的"Open"分组

## 注意事项

1. **系统分组不能绑定分类**: Open 和 Resolved 是系统分组，不支持分类绑定
2. **分类删除影响**: 删除分类会自动删除所有相关的绑定关系
3. **分组删除影响**: 删除分组会自动删除该分组的所有分类绑定
4. **分类唯一性**: 分类名称全局唯一，不能重复
5. **绑定唯一性**: 同一客服下，每个分类只能绑定到一个分组

## 数据库迁移

运行 `db/create_session_categories.sql` 脚本来创建必要的表和字段。


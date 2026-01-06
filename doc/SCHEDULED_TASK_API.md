# AI 定时任务模块 API 文档

本文档描述了 AI 客服系统中定时任务模块的 API 接口，用于前端对接。

## 基础信息

*   **Base URL**: `/api/v1/scheduled-tasks`
*   **Content-Type**: `application/json`

## 数据结构

### 1. 任务调度配置 (ScheduleConfig)

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `type` | String | 是 | 调度类型，可选值: `DAILY` (每天), `WEEKLY` (每周), `MONTHLY` (每月) |
| `time` | String | 是 | 执行时间，格式 `HH:mm:ss` 或 `HH:mm` (秒默认为00) |
| `daysOfWeek` | Array\<Integer\> | 否 | 周几执行 (1-7, 1=周一, 7=周日)，当 type=`WEEKLY` 时必填 |
| `daysOfMonth` | Array\<Integer\> | 否 | 每月几号执行 (1-31)，当 type=`MONTHLY` 时必填 |

### 2. 客户目标模式 (TaskCustomerMode)

| 值 | 说明 |
| :--- | :--- |
| `SPECIFIC_CUSTOMER` | 指定具体客户 |
| `CUSTOMER_ROLE` | 指定客户角色 (如 VIP, 供应商等) |

### 3. 创建/更新请求对象 (SaveScheduledTaskRequest)

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | String | 是 | 任务名称 |
| `description` | String | 否 | 任务描述 |
| `workflowId` | UUID | 是 | 关联的 AI 工作流 ID |
| `scheduleConfig` | Object | 是 | 调度配置对象 (见上方定义) |
| `customerMode` | String | 是 | 客户目标模式 (见上方定义) |
| `targetIds` | Array\<String\> | 否 | 目标 ID 列表。模式为 `SPECIFIC_CUSTOMER` 时填客户 ID；模式为 `CUSTOMER_ROLE` 时填角色 ID |
| `initialInput` | String | 否 | 工作流启动时的初始输入文本 (默认为 "Scheduled Task Trigger") |
| `enabled` | Boolean | 否 | 是否启用 (默认 true) |

### 4. 任务响应对象 (ScheduledTaskDto)

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | UUID | 任务 ID |
| `name` | String | 任务名称 |
| `description` | String | 任务描述 |
| `workflowId` | UUID | 关联的工作流 ID |
| `workflowName` | String | 关联的工作流名称 |
| `scheduleConfig` | Object | 调度配置对象 |
| `customerMode` | String | 客户目标模式 |
| `targetIds` | Array\<String\> | 目标 ID 列表 |
| `initialInput` | String | 初始输入 |
| `enabled` | Boolean | 是否启用 |
| `cronExpression` | String | 生成的 Cron 表达式 (后端自动生成) |
| `lastRunAt` | String | 上次运行时间 (ISO 8601) |
| `nextRunAt` | String | 下次运行时间 (ISO 8601) |
| `createdAt` | String | 创建时间 |
| `updatedAt` | String | 更新时间 |

---

## 接口列表

### 1. 创建定时任务

*   **URL**: `POST /api/v1/scheduled-tasks`
*   **描述**: 创建一个新的定时任务。

**请求示例**

```json
{
  "name": "每周一 VIP 问候",
  "description": "针对 VIP 客户的周一例行问候",
  "workflowId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "scheduleConfig": {
    "type": "WEEKLY",
    "daysOfWeek": [1],
    "time": "09:30:00"
  },
  "customerMode": "CUSTOMER_ROLE",
  "targetIds": ["role-uuid-1", "role-uuid-2"],
  "initialInput": "你好，祝您周一愉快！",
  "enabled": true
}
```

**响应示例**

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "id": "task-uuid-123",
    "name": "每周一 VIP 问候",
    "workflowId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "workflowName": "VIP 关怀流程",
    "scheduleConfig": {
        "type": "WEEKLY",
        "daysOfWeek": [1],
        "time": "09:30:00"
    },
    "customerMode": "CUSTOMER_ROLE",
    "cronExpression": "0 30 9 ? * 1",
    "enabled": true,
    ...
  }
}
```

### 2. 更新定时任务

*   **URL**: `PUT /api/v1/scheduled-tasks/{id}`
*   **描述**: 更新已存在的定时任务。
*   **参数**: `id` (Path Variable) - 任务 ID

**请求示例**

```json
{
  "name": "每日早报推送 (修正)",
  "workflowId": "workflow-uuid",
  "scheduleConfig": {
    "type": "DAILY",
    "time": "08:00:00"
  },
  "customerMode": "SPECIFIC_CUSTOMER",
  "targetIds": ["cust-uuid-1"],
  "enabled": false
}
```

### 3. 获取所有定时任务

*   **URL**: `GET /api/v1/scheduled-tasks`
*   **描述**: 获取所有定时任务列表。

**响应示例**

```json
{
  "code": 200,
  "success": true,
  "data": [
    {
      "id": "task-1",
      "name": "任务A",
      "nextRunAt": "2023-10-27T09:00:00Z",
      ...
    },
    {
      "id": "task-2",
      "name": "任务B",
      ...
    }
  ]
}
```

### 4. 获取单个任务详情

*   **URL**: `GET /api/v1/scheduled-tasks/{id}`
*   **描述**: 获取指定 ID 的任务详情。

### 5. 删除定时任务

*   **URL**: `DELETE /api/v1/scheduled-tasks/{id}`
*   **描述**: 删除指定的定时任务。

**响应示例**

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": null
}
```

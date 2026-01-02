# Shopify Integration Guide

## 1. 概述
本分支 (`feature/shopify-integration`) 旨在为 AI Agent 客服系统添加 Shopify 平台支持，使其能够作为 Shopify App 发布并集成到商家店铺中。

## 2. 问题解答

### Q1: 上架到 Shopify 要适配什么？
要成功上架 Shopify App Store，需要适配以下关键点：

1.  **OAuth 2.0 认证**:
    *   必须实现 Shopify 的 OAuth 流程，以便商家安装应用时获取 Access Token。
    *   需要处理 `hmac` 签名验证，确保请求来自 Shopify。
2.  **嵌入式应用 (Embedded App)**:
    *   使用 Shopify App Bridge 将应用嵌入到 Shopify Admin 后台。
    *   需要在响应头中处理 Content Security Policy (CSP) 以允许 iframe 嵌入。
3.  **Webhooks**:
    *   必须处理 `app/uninstalled` webhook 以清理数据（GDPR 要求）。
    *   建议监听 `orders/create`, `customers/update` 等事件以实现自动客服功能。
4.  **计费 API (Billing API)**:
    *   如果应用收费，必须使用 Shopify Billing API，不能使用第三方支付网关。

### Q2: 是否要优化 UI 跟 Shopify 同步？
**是，强烈建议使用 Shopify Polaris 设计系统。**

*   **原因**: Shopify 商家习惯于 Polaris 的设计语言。使用 Polaris 可以提供原生的用户体验，增加应用被安装和保留的概率。Shopify App Review 团队也会更倾向于通过遵循 Polaris 规范的应用。
*   **本分支变更**:
    *   已引入 `@shopify/polaris` 组件库。
    *   创建了 `ShopifyAppProvider` 组件，用于包裹应用以提供 Polaris 主题和上下文。

### Q3: 功能上是否要改动？
是的，需要进行以下功能扩展：

1.  **新增 "Shopify" 渠道**:
    *   已在官方渠道配置中添加 `SHOPIFY` 类型。
    *   允许配置 Shop Domain, Access Token, API Key 等信息。
2.  **客服能力集成**:
    *   **订单查询**: 客服机器人需要能够调用 Shopify Admin API 查询订单状态、物流信息。
    *   **商品推荐**: 需要能够读取店铺商品列表进行推荐。
3.  **多店铺支持**:
    *   系统架构需要支持多租户（每个安装应用的商家为一个租户）。

## 3. 当前分支变更内容

### 3.1 依赖更新
*   添加 `@shopify/polaris`: Shopify 官方 React 组件库。
*   添加 `@shopify/app-bridge-react`: 用于构建嵌入式应用。

### 3.2 代码变更
1.  **类型定义 (`types/officialChannel.ts`)**:
    *   新增 `SHOPIFY` 渠道类型。
    *   定义 `ShopifyConfig` 接口 (shopDomain, accessToken, apiKey)。
2.  **服务层 (`services/officialChannelService.ts`)**:
    *   Mock 数据中增加 Shopify 渠道，使其在前端可见。
3.  **UI 配置 (`components/settings/OfficialChannelConfig.tsx`)**:
    *   实现 Shopify 渠道的配置表单，支持输入店铺域名和 API 凭证。
4.  **基础设施 (`components/shopify/ShopifyAppProvider.tsx`)**:
    *   新增 Polaris Provider 封装组件，为后续开发嵌入式页面做准备。

## 4. 后续开发建议 (Next Steps)

1.  **后端开发**:
    *   实现 Shopify OAuth 登录接口。
    *   实现 Webhook 接收和处理逻辑。
2.  **前端页面**:
    *   使用 Polaris 重构或创建专门的 Shopify Dashboard 页面。
    *   使用 App Bridge 处理页面跳转和 Toast 通知。
3.  **AI 能力**:
    *   编写 Shopify 专用的 Tool/Plugin，使 AI Agent 能调用 Shopify API (如 `get_order`, `get_product`)。

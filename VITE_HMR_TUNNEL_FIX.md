# Vite HMR 内网映射连接断开问题解决方案

## 问题描述

使用内网映射（如 ngrok, frp 等）访问 Vite 开发服务器时，经常出现以下错误：
```
[vite] server connection lost. Polling for restart...
```

## 问题原因

1. **WebSocket 连接超时**：内网映射代理服务器在一段时间无活动后会关闭 WebSocket 连接
2. **协议不匹配**：HTTPS 网站需要使用 WSS 协议，而不是 WS 协议
3. **端口映射问题**：客户端尝试连接的端口与实际映射的端口不一致
4. **跨域问题**：内网映射域名与本地开发服务器域名不同

## 解决方案

### 方案 1：配置 Vite HMR（推荐）

已在 `vite.config.ts` 中添加了以下配置：

```typescript
server: {
  hmr: {
    protocol: 'ws', // 如果使用 https，改为 'wss'
    clientPort: 3000,
    timeout: 60000, // 增加超时时间到 60 秒
    overlay: true,
  },
  watch: {
    usePolling: true, // 使用轮询模式
    interval: 1000,
  },
}
```

### 方案 2：使用环境变量动态配置

在项目根目录创建 `.env` 文件（本地开发使用）：

```env
# 本地开发
VITE_HMR_PROTOCOL=ws
VITE_HMR_HOST=localhost
VITE_HMR_PORT=3000
```

创建 `.env.tunnel` 文件（内网映射使用）：

```env
# 内网映射配置
VITE_HMR_PROTOCOL=wss  # 如果映射使用 HTTPS
VITE_HMR_HOST=your-tunnel-domain.com  # 替换为您的内网映射域名
VITE_HMR_PORT=443  # HTTPS 端口
```

启动时使用：
```bash
# 使用内网映射配置
npm run dev -- --mode tunnel
```

### 方案 3：禁用 HMR（临时方案）

如果问题持续存在，可以临时禁用 HMR：

在 `vite.config.ts` 中添加：
```typescript
server: {
  hmr: false, // 完全禁用 HMR
}
```

**缺点**：失去热更新功能，每次修改需要手动刷新页面。

### 方案 4：修改内网映射配置（推荐）

#### 如果使用 frp

在 `frpc.ini` 中添加 WebSocket 支持：

```ini
[vite-web]
type = http
local_ip = 127.0.0.1
local_port = 3000
custom_domains = your-domain.com
# 增加超时时间
connect_timeout = 60
tcp_mux = true
```

#### 如果使用 ngrok

```bash
ngrok http 3000 --host-header=rewrite
```

或在 `ngrok.yml` 中配置：

```yaml
tunnels:
  vite:
    proto: http
    addr: 3000
    host_header: rewrite
    inspect: true
```

### 方案 5：使用代理配置（高级）

更新 `vite.config.ts`，根据环境动态配置 HMR：

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  const isTunnel = mode === 'tunnel' || env.VITE_USE_TUNNEL === 'true';

  return {
    server: {
      hmr: isTunnel ? {
        protocol: env.VITE_HMR_PROTOCOL || 'wss',
        host: env.VITE_HMR_HOST,
        clientPort: parseInt(env.VITE_HMR_PORT || '443'),
        timeout: 60000,
      } : true,
      watch: isTunnel ? {
        usePolling: true,
        interval: 1000,
      } : undefined,
    },
  };
});
```

## 测试方法

1. **启动开发服务器**：
   ```bash
   cd ai_agent_web
   npm run dev
   ```

2. **通过内网映射访问**：打开映射的 URL

3. **验证 WebSocket 连接**：
   - 打开浏览器开发者工具
   - 切换到 Network 标签
   - 筛选 WS/WSS 连接
   - 查看是否有 WebSocket 连接，状态应为 "101 Switching Protocols"

4. **测试热更新**：修改任意组件文件，查看是否自动刷新

## 常见问题

### Q1: 仍然频繁断开连接？

**A**: 尝试以下操作：
1. 检查内网映射服务的稳定性
2. 增加 `timeout` 值到更大（如 120000）
3. 使用 `usePolling: true` 模式
4. 检查防火墙设置

### Q2: 使用 HTTPS 映射但仍然报错？

**A**: 确保：
1. `protocol` 设置为 `'wss'`（而不是 `'ws'`）
2. `clientPort` 设置为 `443`
3. 内网映射正确配置了 SSL 证书

### Q3: 生产环境部署后也有这个问题？

**A**: 生产环境应该：
1. 使用构建后的静态文件（`npm run build`）
2. 不使用 Vite 开发服务器
3. 部署到 Nginx/Apache 等生产服务器

## 推荐配置（针对内网映射）

对于大多数内网映射场景，推荐使用以下配置：

```typescript
// vite.config.ts
server: {
  hmr: {
    protocol: 'ws', // 根据映射是否使用 HTTPS 决定
    timeout: 60000,
    overlay: true,
  },
  watch: {
    usePolling: true,
    interval: 1000,
  },
}
```

配合内网映射工具的 WebSocket 支持配置，可以有效解决连接断开问题。

## 参考资料

- [Vite Server Options](https://vitejs.dev/config/server-options.html)
- [Vite HMR API](https://vitejs.dev/guide/api-hmr.html)
- [WebSocket 通过代理](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)


# 内网映射 HMR 连接断开 - 快速修复指南

## 🚨 问题现象
```
[vite] server connection lost. Polling for restart...
```

## ✅ 快速解决方案

### 方法 1：创建配置文件（推荐）

在 `ai_agent_web` 目录创建 `.env.local` 文件：

```bash
# 启用内网映射模式
VITE_USE_TUNNEL=true

# 如果映射使用 HTTP（默认）
VITE_HMR_PROTOCOL=ws
VITE_HMR_PORT=3000

# 如果映射使用 HTTPS，使用以下配置
# VITE_HMR_PROTOCOL=wss
# VITE_HMR_PORT=443
# VITE_HMR_HOST=your-tunnel-domain.com
```

### 方法 2：临时禁用 HMR

在 `.env.local` 中添加：
```bash
VITE_DISABLE_HMR=true
```

**注意**：这会禁用热更新，修改代码后需要手动刷新页面。

### 方法 3：本地开发（不使用内网映射）

不创建 `.env.local` 文件或确保：
```bash
VITE_USE_TUNNEL=false
```

## 📝 配置说明

| 环境变量 | 说明 | 可选值 |
|---------|------|--------|
| `VITE_USE_TUNNEL` | 是否使用内网映射 | `true` / `false` |
| `VITE_HMR_PROTOCOL` | WebSocket 协议 | `ws` (HTTP) / `wss` (HTTPS) |
| `VITE_HMR_HOST` | 内网映射域名 | 例：`your-domain.com` |
| `VITE_HMR_PORT` | 客户端连接端口 | HTTP: `3000`, HTTPS: `443` |
| `VITE_DISABLE_HMR` | 完全禁用 HMR | `true` / `false` |

## 🔧 不同内网映射工具的配置

### frp (Fast Reverse Proxy)

**frpc.ini**:
```ini
[vite-web]
type = http
local_ip = 127.0.0.1
local_port = 3000
custom_domains = your-domain.com
connect_timeout = 60
tcp_mux = true
```

**.env.local**:
```bash
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=ws  # 或 wss（如果配置了 HTTPS）
VITE_HMR_HOST=your-domain.com
```

### ngrok

**启动命令**:
```bash
ngrok http 3000 --host-header=rewrite
```

**.env.local**:
```bash
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=wss  # ngrok 默认使用 HTTPS
VITE_HMR_HOST=your-random-id.ngrok.io
VITE_HMR_PORT=443
```

### 花生壳 / nps / 其他工具

根据工具是否使用 HTTPS 选择协议：
- **HTTP 映射**: `VITE_HMR_PROTOCOL=ws` + `VITE_HMR_PORT=3000`
- **HTTPS 映射**: `VITE_HMR_PROTOCOL=wss` + `VITE_HMR_PORT=443`

## 🧪 验证配置

1. 启动开发服务器：
```bash
cd ai_agent_web
npm run dev
```

2. 打开浏览器开发者工具 (F12)

3. 切换到 **Network** 标签

4. 筛选 **WS** 连接

5. 应该看到一个 WebSocket 连接，状态为：
   - ✅ **101 Switching Protocols** （连接成功）
   - ❌ **其他状态** （配置有问题）

6. 修改任意文件，页面应自动更新（如果启用了 HMR）

## ❓ 常见问题

### Q: 配置后仍然断开连接？

**A**: 尝试以下步骤：
1. 重启开发服务器（Ctrl+C 后重新 `npm run dev`）
2. 清除浏览器缓存并刷新（Ctrl+Shift+R）
3. 检查内网映射服务是否稳定运行
4. 确认防火墙没有阻止 WebSocket 连接

### Q: 如何知道我的映射是 HTTP 还是 HTTPS？

**A**: 查看映射 URL：
- `http://your-domain.com` → 使用 `ws` 协议
- `https://your-domain.com` → 使用 `wss` 协议

### Q: 生产环境需要这些配置吗？

**A**: 不需要。生产环境应该：
1. 运行 `npm run build` 构建静态文件
2. 将 `dist` 目录部署到 Nginx/Apache
3. 不使用 Vite 开发服务器

## 📚 更多信息

详细说明请查看：[VITE_HMR_TUNNEL_FIX.md](./VITE_HMR_TUNNEL_FIX.md)


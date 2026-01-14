# Cloudflare 内网映射配置指南

## 问题说明

使用 Cloudflare 做内网映射时，Vite 可能会尝试连接错误的端口：
```
❌ 错误：wss://son-cho.com:3000/?token=xxx
✅ 正确：wss://son-cho.com/?token=xxx (隐式使用 443 端口)
```

## 解决方案

### 步骤 1：创建配置文件

在 `ai_agent_web` 目录下创建 `.env.local` 文件（如果已存在则编辑它）：

```bash
# Cloudflare 内网映射配置
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=wss
VITE_HMR_HOST=son-cho.com
VITE_HMR_PORT=443
```

### 步骤 2：重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
cd ai_agent_web
npm run dev
```

### 步骤 3：验证配置

1. 通过 `https://son-cho.com` 访问
2. 打开浏览器开发者工具 (F12)
3. 切换到 **Network** 标签
4. 筛选 **WS** 连接
5. 应该看到：`wss://son-cho.com/?token=xxx` (没有 `:3000` 端口)

## 配置说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `VITE_USE_TUNNEL` | `true` | 启用内网映射模式 |
| `VITE_HMR_PROTOCOL` | `wss` | 使用安全 WebSocket（Cloudflare 使用 HTTPS） |
| `VITE_HMR_HOST` | `son-cho.com` | 您的 Cloudflare 域名 |
| `VITE_HMR_PORT` | `443` | 标准 HTTPS 端口（不是 3000） |

## 为什么端口要设置为 443？

通过 Cloudflare 访问时：
- 浏览器访问：`https://son-cho.com` → Cloudflare (443 端口)
- Cloudflare 转发到：本地服务器 (3000 端口)
- WebSocket 连接也应该使用：`wss://son-cho.com:443` (标准 HTTPS 端口)

如果设置为 3000，客户端会尝试连接 `wss://son-cho.com:3000`，而 Cloudflare 可能没有开放这个端口。

## Cloudflare Tunnel 配置建议

### 如果使用 Cloudflare Tunnel (cloudflared)

**config.yml**:
```yaml
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  - hostname: son-cho.com
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
      connectTimeout: 60s
      # 支持 WebSocket
      http2Origin: false
  - service: http_status:404
```

### 关键设置

1. **connectTimeout: 60s** - 增加连接超时时间
2. **http2Origin: false** - 确保 WebSocket 支持
3. **noTLSVerify: true** - 如果本地使用 HTTP

## 测试步骤

### 1. 检查 WebSocket 连接

打开 `https://son-cho.com`，在控制台应该看到：

```
[vite] connected.
```

而不是：
```
[vite] server connection lost. Polling for restart...
```

### 2. 检查网络请求

在 Network 标签的 WS 筛选中，应该看到：
- **Request URL**: `wss://son-cho.com/?token=xxx` ✅
- **Status**: `101 Switching Protocols` ✅

而不是：
- **Request URL**: `wss://son-cho.com:3000/?token=xxx` ❌
- **Status**: `Failed` 或 `Timeout` ❌

### 3. 测试热更新

修改任意文件（如 `App.tsx`），页面应该自动刷新，无需手动刷新。

## 故障排除

### 问题：仍然显示 :3000 端口

**原因**：配置文件未生效或缓存问题

**解决**：
1. 确认 `.env.local` 在 `ai_agent_web` 目录（不是项目根目录）
2. 完全停止并重启开发服务器
3. 清除浏览器缓存（Ctrl+Shift+R）
4. 检查配置文件内容是否正确

### 问题：WebSocket 连接失败

**可能原因**：
1. Cloudflare 的 WebSocket 支持未启用
2. 防火墙阻止了 WebSocket 连接
3. Cloudflare Tunnel 配置不正确

**解决方法**：
1. 在 Cloudflare Dashboard 中确认 WebSocket 已启用
2. 检查 `cloudflared` 日志查看错误信息
3. 尝试使用 `curl` 测试连接：
   ```bash
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://son-cho.com
   ```

### 问题：连接一段时间后断开

**解决**：Cloudflare 有默认的超时限制，可以在 Tunnel 配置中增加：

```yaml
originRequest:
  connectTimeout: 60s
  keepAliveTimeout: 60s
  keepAliveConnections: 10
```

## 快速创建配置文件

### Windows PowerShell

```powershell
cd ai_agent_web
@"
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=wss
VITE_HMR_HOST=son-cho.com
VITE_HMR_PORT=443
"@ | Out-File -FilePath .env.local -Encoding utf8
```

### Windows CMD

```cmd
cd ai_agent_web
(
echo VITE_USE_TUNNEL=true
echo VITE_HMR_PROTOCOL=wss
echo VITE_HMR_HOST=son-cho.com
echo VITE_HMR_PORT=443
) > .env.local
```

### Linux / macOS

```bash
cd ai_agent_web
cat > .env.local << EOF
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=wss
VITE_HMR_HOST=son-cho.com
VITE_HMR_PORT=443
EOF
```

### 手动创建

1. 打开 `ai_agent_web` 目录
2. 创建新文件 `.env.local`
3. 复制以下内容：

```
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=wss
VITE_HMR_HOST=son-cho.com
VITE_HMR_PORT=443
```

4. 保存文件

## 完整配置示例

如果您需要配置 API 代理，完整的 `.env.local` 可以是：

```bash
# Cloudflare 内网映射配置
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=wss
VITE_HMR_HOST=son-cho.com
VITE_HMR_PORT=443

# API 配置
VITE_API_BASE_URL=http://127.0.0.1:8080

# Gemini API Key (如果需要)
# GEMINI_API_KEY=your-api-key-here

# 调试模式（可选）
# VITE_DEBUG=true
```

## 验证配置是否生效

启动服务器后，查看终端输出，应该看到类似：

```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://0.0.0.0:3000/
  ➜  press h to show help
```

然后通过 `https://son-cho.com` 访问，WebSocket 应该连接成功。

## 总结

对于 Cloudflare 内网映射：
- ✅ 协议：`wss`（HTTPS）
- ✅ 端口：`443`（标准 HTTPS 端口）
- ✅ 域名：您的 Cloudflare 域名
- ❌ 不要使用：`:3000` 端口

配置后记得重启服务器！


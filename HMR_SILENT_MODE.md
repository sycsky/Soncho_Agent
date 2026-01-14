# HMR 静默模式配置说明

## 问题

内网映射环境下，WebSocket 连接不稳定，频繁出现：
```
[vite] server connection lost. Polling for restart...
```

## 三种解决方案

### 方案 1：完全禁用 HMR ❌

**配置**：
```bash
VITE_DISABLE_HMR=true
```

**效果**：
- ✅ 不会再出现 "connection lost" 提示
- ❌ 失去所有热更新功能
- ❌ 修改代码后必须手动刷新页面（Ctrl+R）

**适用场景**：
- 网络极度不稳定
- 不需要频繁修改代码
- 只是查看效果，不做开发

---

### 方案 2：静默模式（推荐）✅

**配置**：
```bash
VITE_SILENT_HMR=true
```

**效果**：
- ✅ 不会显示 "connection lost" 错误提示
- ✅ 保留热更新功能（连接正常时仍然自动更新）
- ✅ 连接丢失时静默处理，不打扰开发
- ⚠️ 连接丢失后修改代码需要手动刷新

**适用场景**（推荐）：
- 内网映射环境开发
- 希望在连接稳定时享受热更新
- 不想被错误提示打扰

**工作原理**：
- 当 WebSocket 连接正常时：自动热更新 ✨
- 当连接丢失时：静默处理，不显示错误 🤫
- 可以随时手动刷新页面查看最新更改

---

### 方案 3：保持 HMR 默认行为 ⚠️

**配置**：
```bash
# 注释掉或删除以下两行
# VITE_DISABLE_HMR=true
# VITE_SILENT_HMR=true
```

**效果**：
- ✅ 完整的热更新功能
- ❌ 连接丢失时会显示错误覆盖层
- ❌ 频繁的 "connection lost" 提示

**适用场景**：
- 本地开发环境（不使用内网映射）
- 网络连接非常稳定
- 需要及时了解连接状态

---

## 当前配置

您当前使用的是 **方案 2：静默模式**

```bash
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=wss
VITE_HMR_HOST=son-cho.com
VITE_HMR_PORT=443
VITE_SILENT_HMR=true  # 静默模式
```

## 使用说明

### 1. 重启开发服务器

配置修改后需要重启：
```bash
# 在运行 npm run dev 的终端按 Ctrl+C
# 然后重新启动
npm run dev
```

### 2. 验证效果

访问 `https://son-cho.com`：

**静默模式下的预期行为**：
- ✅ 页面正常加载
- ✅ 修改文件时，如果连接正常会自动更新
- ✅ 连接丢失时不会弹出错误提示
- ✅ 控制台可能会有警告，但不会阻塞页面

### 3. 开发流程

**当热更新生效时**：
1. 修改代码
2. 保存文件
3. 页面自动更新 ✨

**当连接丢失时**：
1. 修改代码
2. 保存文件
3. 手动刷新页面（Ctrl+R 或 F5）

### 4. 切换方案

如果想尝试其他方案，编辑 `.env.local`：

**切换到方案 1（完全禁用）**：
```bash
# 注释掉静默模式
# VITE_SILENT_HMR=true

# 启用完全禁用
VITE_DISABLE_HMR=true
```

**切换到方案 3（默认行为）**：
```bash
# 注释掉所有禁用选项
# VITE_SILENT_HMR=true
# VITE_DISABLE_HMR=true
```

修改后记得重启服务器！

## 技术实现

### Vite 配置更新

在 `vite.config.ts` 中添加了静默模式支持：

```typescript
const hmrConfig = {
  protocol: 'wss',
  host: 'son-cho.com',
  clientPort: 443,
  timeout: 60000,
  // 关键配置：根据环境变量控制错误覆盖层
  overlay: env.VITE_SILENT_HMR === 'true' ? false : true,
};
```

**overlay 选项说明**：
- `overlay: true` - 显示错误覆盖层（包括 "connection lost"）
- `overlay: false` - 不显示错误覆盖层（静默处理）

## 对比表格

| 特性 | 方案 1<br>完全禁用 | 方案 2<br>静默模式 ⭐ | 方案 3<br>默认行为 |
|------|-------------------|---------------------|-------------------|
| 显示错误提示 | 无 | 无 | 有（烦人） |
| 热更新功能 | 无 | 有（条件） | 有 |
| 手动刷新 | 总是需要 | 连接丢失时需要 | 很少需要 |
| 开发体验 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 适合内网映射 | ✅ | ✅✅✅ | ❌ |

## 推荐配置

对于 **Cloudflare 内网映射** + **son-cho.com** 的场景：

```bash
# 最佳配置（当前配置）
VITE_USE_TUNNEL=true
VITE_HMR_PROTOCOL=wss
VITE_HMR_HOST=son-cho.com
VITE_HMR_PORT=443
VITE_SILENT_HMR=true
```

这个配置提供了**最佳的开发体验**：
- 🎯 不会被错误提示打扰
- ⚡ 连接稳定时享受热更新
- 🔄 连接不稳定时手动刷新即可

## 故障排除

### 问题：修改文件后没有自动更新

**原因**：WebSocket 连接可能已断开

**解决**：
1. 手动刷新页面（Ctrl+R）
2. 检查浏览器控制台的 Network → WS 连接状态
3. 如果长时间无法自动更新，考虑重启服务器

### 问题：想知道连接是否正常

**方法 1**：查看浏览器控制台
- 打开开发者工具 (F12)
- 切换到 Console 标签
- 成功连接会显示：`[vite] connected.`

**方法 2**：查看 Network 标签
- Network → WS 筛选
- 查看 WebSocket 连接状态
- Status 为 `101` 表示连接正常

### 问题：想临时查看错误提示

**快速切换**：
```bash
# 编辑 .env.local，注释掉静默模式
# VITE_SILENT_HMR=true

# 重启服务器
```

查看完错误后，再取消注释即可恢复静默模式。

## 总结

**静默模式是内网映射环境的最佳选择**：
- ✅ 不影响正常开发
- ✅ 不会被错误提示打扰
- ✅ 简单的手动刷新即可
- ✅ 配置简单，一行搞定

现在您可以愉快地开发了！🎉


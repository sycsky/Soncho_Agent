import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // 判断是否使用内网映射
    const useTunnel = env.VITE_USE_TUNNEL === 'true' || mode === 'tunnel';
    
    // HMR 配置
    const hmrConfig = useTunnel ? {
      // 内网映射模式
      protocol: (env.VITE_HMR_PROTOCOL as 'ws' | 'wss') || 'ws',
      host: env.VITE_HMR_HOST || undefined,
      clientPort: env.VITE_HMR_PORT ? parseInt(env.VITE_HMR_PORT) : 3000,
      timeout: 60000, // 60秒超时
      // 禁用错误覆盖层，避免 "connection lost" 提示
      overlay: env.VITE_SILENT_HMR === 'true' ? false : true,
    } : {
      // 本地开发模式
      protocol: 'ws' as const,
      clientPort: 3000,
      timeout: 60000,
      overlay: true,
    };
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
        // HMR 配置 - 自动适配内网映射
        // 环境变量说明：
        // VITE_USE_TUNNEL=true - 启用内网映射模式
        // VITE_HMR_PROTOCOL=ws/wss - WebSocket协议（HTTPS映射使用wss）
        // VITE_HMR_HOST=your-domain.com - 内网映射域名
        // VITE_HMR_PORT=443 - 客户端连接端口
        hmr: env.VITE_DISABLE_HMR === 'true' ? false : hmrConfig,
        // 文件监听配置 - 内网映射时使用轮询模式
        watch: useTunnel ? {
          usePolling: true, // 使用轮询模式，适合网络文件系统或内网映射
          interval: 1000, // 轮询间隔（毫秒）
        } : undefined,
        proxy: {
          '/api': {
            target: env.VITE_API_BASE_URL || 'http://127.0.0.1:8080',
            changeOrigin: true, // Necessary for SNI/Virtual Hosts on remote backend
            secure: false,
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                proxyReq.setHeader('X-Forwarded-Proto', 'https');
                proxyReq.setHeader('X-Forwarded-Port', '443');
                if (req.headers.host) {
                   proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
                   proxyReq.setHeader('X-Forwarded-Server', req.headers.host);
                }
              });
            },
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
        // Add global polyfill for SockJS
        global: 'globalThis',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

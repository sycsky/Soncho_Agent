import { BASE_URL } from '../config';
import SockJS from 'sockjs-client';

// Define the structure for messages sent to the server
// 客户端发送的消息可以是事件消息或聊天消息
interface ClientMessage {
  type: string;
  payload: any;
}

// 事件消息格式
interface EventMessage {
  event: string;
  payload: any;
  eventId: string;
  timestamp: number;
}

// 聊天消息格式
interface ChatMessage {
  conversationId?: string;
  senderId: string;
  content: string;
  metadata?: Record<string, any>;
}

// Define the structure for messages received from the server
export interface ServerMessage {
  type: string;
  payload: any;
}

// 服务端事件响应格式
interface ServerEventResponse {
  type: string;
  data: any;
}

// 服务端聊天消息格式
interface ServerChatMessage {
  channel: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

// 连接状态回调
export type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error') => void;

// Token 刷新回调
export type TokenRefreshCallback = () => Promise<string>;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandler: ((message: ServerMessage) => void) | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private token: string | null = null;
  private shouldReconnect: boolean = false;
  private connectionStatusCallback: ConnectionStatusCallback | null = null;
  private tokenRefreshCallback: TokenRefreshCallback | null = null;
  private customerId: string | null = null;
  private channel: string | null = null;
  private isCustomer: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * 连接 WebSocket 服务
   * @param token - 认证 token
   * @param onMessage - 消息处理回调
   * @param options - 可选配置
   */
  connect(
    token: string, 
    onMessage: (message: ServerMessage) => void,
    options?: {
      customerId?: string;
      channel?: string;
      isCustomer?: boolean;
      onStatusChange?: ConnectionStatusCallback;
      onTokenRefresh?: TokenRefreshCallback;
    }
  ) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket (SockJS) is already connected.');
      return;
    }
    
    this.token = token;
    this.messageHandler = onMessage;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    
    // 设置可选配置
    if (options) {
      this.customerId = options.customerId || null;
      this.channel = options.channel || null;
      this.isCustomer = options.isCustomer !== undefined ? options.isCustomer : true;
      this.connectionStatusCallback = options.onStatusChange || null;
      this.tokenRefreshCallback = options.onTokenRefresh || null;
    }
    
    this.createWebSocket();
  }
  
  private createWebSocket() {
    if (!this.token || !this.shouldReconnect) {
        console.error("WebSocket connection cannot be established without a token or if disconnected intentionally.");
        return;
    }

    this.updateConnectionStatus('connecting');

    // Use SockJS to connect to the WebSocket endpoint with token parameter
    // 根据文档，使用 /ws/chat?token= 格式
    const sockJsUrl = `${BASE_URL}/ws/chat?token=${this.token}`;
    
    console.group('🔌 WebSocket 连接');
    console.log('URL:', `${BASE_URL}/ws/chat?token=${this.maskToken(this.token)}`);
    console.log('时间:', new Date().toISOString());
    console.log('用户类型:', this.isCustomer ? '客户' : '客服');
    console.groupEnd();
    
    // Create SockJS instance (it will automatically upgrade to WebSocket if available)
    this.socket = new SockJS(sockJsUrl) as any;

    this.socket.onopen = () => {
      console.log('✅ WebSocket (SockJS) connected');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
      this.startHeartbeat();
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        // ✅ 统一处理不同格式的消息
        // 格式1 (后端标准): { event: string, payload: any }
        // 格式2 (旧格式): { type: string, payload/data: any }
        // 格式3 (聊天消息): { channel: string, conversationId: string, ... }
        
        let serverMessage: ServerMessage;
        
        if (message.event && message.payload !== undefined) {
          // ✅ 后端标准格式: { event: "newMessage", payload: {...} }
          serverMessage = {
            type: message.event,  // 统一转换为 type 字段供前端使用
            payload: message.payload
          };
        } else if (message.type && message.data !== undefined) {
          // 事件响应格式: { type: string, data: any }
          serverMessage = {
            type: message.type,
            payload: message.data
          };
        } else if (message.type && message.payload !== undefined) {
          // 旧格式兼容: { type: string, payload: any }
          serverMessage = message as ServerMessage;
        } else if (message.channel && message.content) {
          // 聊天消息格式，转换为统一格式
          serverMessage = {
            type: 'chatMessage',
            payload: message
          };
        } else {
          // 其他格式，直接使用
          serverMessage = message as ServerMessage;
        }
        
        if (this.messageHandler) {
          this.messageHandler(serverMessage);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error, event.data);
      }
    };

    this.socket.onerror = (error) => {
      console.error('❌ WebSocket (SockJS) error:', error);
      console.error('WebSocket 错误，等待 close 事件获取详细信息');
    };

    this.socket.onclose = (event: CloseEvent) => {
      this.stopHeartbeat();
      console.group('🔌 WebSocket close 事件');
      console.log('Code:', event.code);
      console.log('Reason:', event.reason);
      console.log('WasClean:', event.wasClean);
      console.groupEnd();

      if (!this.shouldReconnect) {
        console.log('WebSocket (SockJS) disconnected intentionally.');
        this.updateConnectionStatus('disconnected');
        return;
      }

      // 根据关闭码判断是否需要重连
      if (event.code === 1006) {
        // 异常关闭，先验证 token 是否有效
        this.checkTokenAndReconnect();
      } else if (event.code !== 1000) {
        // 非正常关闭，尝试重连
        console.log('🔌 WebSocket 非正常关闭，尝试重连...');
        this.attemptReconnect();
      } else {
        // 正常关闭
        this.updateConnectionStatus('disconnected');
      }
    };
  }

  /**
   * 检查 Token 有效性并决定是否重连
   */
  private async checkTokenAndReconnect() {
    if (!this.token) {
      this.handleTokenExpired();
      return;
    }

    try {
      console.log('🕵️‍♂️ 检查当前 token 是否已失效...');
      const response = await fetch(`${BASE_URL}/api/v1/public/validate-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      const isTokenValid = response.ok;

      if (isTokenValid) {
        console.log('✅ Token 有效，尝试重连...');
        this.attemptReconnect();
      } else {
        console.warn('❌ Token 已失效，进行过期处理...');
        this.handleTokenExpired();
      }
    } catch (error) {
      console.error('❌ Token 验证请求失败，尝试重连:', error);
      // 如果网络错误无法验证，尝试重连让重连逻辑处理
      this.attemptReconnect();
    }
  }

  /**
   * 处理 Token 过期
   */
  private async handleTokenExpired() {
    console.warn('⚠️ Token 可能已过期，正在处理...');
    this.updateConnectionStatus('error');
    
    if (this.isCustomer) {
      // 客户端：尝试刷新 token
      await this.refreshCustomerToken();
    } else {
      // 客服端：需要重新登录
      this.handleAgentTokenExpired();
    }
  }

  /**
   * 刷新客户 Token
   */
  private async refreshCustomerToken() {
    try {
      let newToken: string;

      if (this.tokenRefreshCallback) {
        // 使用自定义刷新回调
        newToken = await this.tokenRefreshCallback();
      } else if (this.customerId && this.channel) {
        // 使用默认刷新逻辑
        const response = await fetch(`${BASE_URL}/api/v1/customers/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: this.customerId,
            channel: this.channel
          })
        });
        
        if (!response.ok) {
          throw new Error(`Token 刷新失败: ${response.status}`);
        }
        
        const data = await response.json();
        newToken = data.token;
      } else {
        throw new Error('无法刷新 Token: 缺少 customerId 或 channel');
      }
      
      console.log('✅ Token 刷新成功');
      this.token = newToken;
      this.reconnectAttempts = 0;
      
      // 使用新 token 重新连接
      this.createWebSocket();
    } catch (error) {
      console.error('❌ 刷新客户 Token 失败:', error);
      this.notifyUser('连接失败，请刷新页面重试');
      this.updateConnectionStatus('error');
    }
  }

  /**
   * 处理客服 Token 过期
   */
  private handleAgentTokenExpired() {
    console.warn('⚠️ 客服 Token 过期，需要重新登录');
    this.notifyUser('登录已过期，请重新登录');
    this.updateConnectionStatus('error');
    
    // 可以触发重新登录逻辑
    // window.location.href = '/login';
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      
      console.log(`🔄 ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);
      this.updateConnectionStatus('reconnecting');
      
      setTimeout(() => {
        if (this.shouldReconnect) {
          this.createWebSocket();
        }
      }, delay);
    } else {
      console.error('❌ 达到最大重连次数，停止重连');
      this.notifyUser('连接失败，请刷新页面重试');
      this.updateConnectionStatus('error');
      this.shouldReconnect = false;
    }
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error') {
    if (this.connectionStatusCallback) {
      this.connectionStatusCallback(status);
    }
  }

  /**
   * 通知用户
   */
  private notifyUser(message: string) {
    // 可以集成实际的通知系统（Toast、Alert 等）
    console.log('📢 通知用户:', message);
    // 示例：可以触发全局事件或调用通知服务
    // notificationService.show(message, 'error');
  }

  /**
   * 掩码 Token（用于日志）
   */
  private maskToken(token: string): string {
    if (!token || token.length < 10) return '***';
    return token.substring(0, 8) + '...' + token.substring(token.length - 4);
  }

  // 发送原有格式的消息（保持兼容性）
  send(message: ClientMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected. Message not sent:', message);
      this.notifyUser('连接已断开，正在重新连接...');
      this.attemptReconnect();
    }
  }

  // ✅ 根据后端规范：发送事件消息（推荐使用）
  sendEvent(event: string, payload: any) {
    // ✅ 生成唯一的 eventId 和时间戳（long类型）
    const eventId = this.generateEventId();
    const timestamp = Date.now();  // ✅ 使用 long 数字（毫秒时间戳）
    
    const eventMessage: EventMessage = { 
      event, 
      payload,
      eventId,      // ✅ eventId 在外层
      timestamp     // ✅ timestamp 在外层（long类型）
    };
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.group('📤 WebSocket 发送消息');
      console.log('Event:', event);
      console.log('EventId:', eventId);
      console.log('Timestamp:', timestamp, `(${new Date(timestamp).toISOString()})`);
      console.log('Payload:', payload);
      console.groupEnd();
      this.socket.send(JSON.stringify(eventMessage));
    } else {
      console.error('WebSocket is not connected. Event not sent:', event);
      this.notifyUser('连接已断开，正在重新连接...');
      this.attemptReconnect();
    }
  }

  /**
   * 生成唯一的事件ID
   */
  private generateEventId(): string {
    // 使用时间戳 + 随机数生成唯一ID
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // 根据文档新增：发送聊天消息
  sendChatMessage(conversationId: string, senderId: string, content: string, metadata?: Record<string, any>) {
    const chatMessage: ChatMessage = {
      conversationId,
      senderId,
      content,
      metadata
    };
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(chatMessage));
    } else {
      console.error('WebSocket is not connected. Chat message not sent:', content);
      this.notifyUser('连接已断开，正在重新连接...');
      this.attemptReconnect();
    }
  }

  /**
   * 获取当前连接状态
   */
  getConnectionState(): number {
    return this.socket ? this.socket.readyState : WebSocket.CLOSED;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * 启动心跳机制
   */
  private startHeartbeat() {
    this.stopHeartbeat(); // 清除可能存在的旧心跳定时器
    
    // 每30秒发送一次心跳
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // 发送 ping 事件
        this.socket.send(JSON.stringify({ event: 'ping' }));
        console.log('💓 Heartbeat sent');
      }
    }, 30000);
  }

  /**
   * 停止心跳机制
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close(1000, 'Client closed connection');
      this.socket = null;
    }
    this.updateConnectionStatus('disconnected');
  }
}

// Singleton instance
const websocketService = new WebSocketService();
export default websocketService;


(function() {
  // Prevent multiple initializations
  if (window.AiAgentWidget) return;

  const ICONS = {
    message: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    send: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>'
  };

  const STORAGE_KEYS = {
    browserId: 'ai_agent_widget_browser_id',
    customerToken: 'ai_agent_widget_customer_token',
    customerId: 'ai_agent_widget_customer_id'
  };

  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return `wid_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    }
  };

  const normalizeApiBaseUrl = (input) => {
    const trimmed = (input || '').toString().trim();
    if (!trimmed) return null;

    let url;
    try {
      url = new URL(trimmed);
    } catch (e) {
      url = new URL(trimmed, window.location.origin);
    }

    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\/+$/, '');
    if (url.pathname.endsWith('/api')) {
      url.pathname = url.pathname.slice(0, -4);
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  };

  const buildWsUrl = (apiBaseUrl, token) => {
    const base = new URL(apiBaseUrl);
    const wsUrl = new URL(base.toString());
    wsUrl.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = base.pathname.replace(/\/+$/, '');
    wsUrl.pathname = `${basePath}/ws/chat`.replace(/\/{2,}/g, '/');
    wsUrl.search = '';
    wsUrl.searchParams.set('token', token);
    return wsUrl.toString();
  };

  const safeJsonParse = (value) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  };

  class AiAgentWidget {
    constructor(config) {
      this.config = {
        agentId: config.agentId || 'default',
        primaryColor: config.primaryColor || '#000000',
        position: config.position || 'bottom-right',
        welcomeMessage: config.welcomeMessage || 'Hello! How can I help you today?',
        apiBaseUrl: config.apiBaseUrl || config.api_base_url || (window.AI_AGENT_API_BASE_URL || ''),
        shop: config.shop || config.shopDomain || null,
        customerName: config.customerName || null,
        channel: config.channel || 'WEB'
      };
      
      this.isOpen = false;
      this.messages = [
        { role: 'bot', content: this.config.welcomeMessage }
      ];

      this.apiBaseUrl = normalizeApiBaseUrl(this.config.apiBaseUrl);
      this.ws = null;
      this.isConnected = false;
      this.connecting = false;
      this.pendingMessages = [];
      this.customerId = null;
      this.customerToken = null;
      this.conversationId = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;

      this.init();
      this.bootstrap();
    }

    init() {
      this.createContainer();
      this.createLauncher();
      this.createWindow();
      this.attachEventListeners();
    }

    bootstrap() {
      this.bootstrapAsync().catch(() => {});
    }

    async bootstrapAsync() {
      if (!this.apiBaseUrl) {
        this.addMessage('bot', 'Chat widget backend is not configured.');
        return;
      }

      const existingToken = (() => {
        try {
          return localStorage.getItem(STORAGE_KEYS.customerToken);
        } catch (e) {
          return null;
        }
      })();
      const existingCustomerId = (() => {
        try {
          return localStorage.getItem(STORAGE_KEYS.customerId);
        } catch (e) {
          return null;
        }
      })();

      if (existingToken && existingCustomerId) {
        this.customerToken = existingToken;
        this.customerId = existingCustomerId;
        this.connectWebSocket();
        return;
      }

      const browserId = this.getOrCreateBrowserId();
      const channelId = this.buildChannelId(browserId);
      const customerName = this.config.customerName || `Visitor_${browserId.slice(0, 6)}`;

      const response = await fetch(`${this.apiBaseUrl}/api/v1/public/customer-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: customerName,
          channel: this.config.channel,
          channelId,
          metadata: {
            agentId: this.config.agentId,
            shop: this.config.shop,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent
          }
        })
      });

      if (!response.ok) {
        this.addMessage('bot', 'Unable to connect to support right now.');
        return;
      }

      const json = await response.json();
      const data = json && json.data ? json.data : json;
      if (!data || !data.token || !data.customerId) {
        this.addMessage('bot', 'Unable to connect to support right now.');
        return;
      }

      this.customerToken = data.token;
      this.customerId = data.customerId;
      try {
        localStorage.setItem(STORAGE_KEYS.customerToken, this.customerToken);
        localStorage.setItem(STORAGE_KEYS.customerId, this.customerId);
      } catch (e) {}

      this.connectWebSocket();
    }

    getOrCreateBrowserId() {
      try {
        const existing = localStorage.getItem(STORAGE_KEYS.browserId);
        if (existing) return existing;
        const created = generateId();
        localStorage.setItem(STORAGE_KEYS.browserId, created);
        return created;
      } catch (e) {
        return generateId();
      }
    }

    buildChannelId(browserId) {
      const shopPart = this.config.shop ? `shopify_${this.config.shop}` : 'shopify_unknown';
      return `${shopPart}_${browserId}`;
    }

    connectWebSocket() {
      if (!this.customerToken || this.ws || this.connecting) return;
      this.connecting = true;

      let wsUrl;
      try {
        wsUrl = buildWsUrl(this.apiBaseUrl, this.customerToken);
      } catch (e) {
        this.connecting = false;
        this.addMessage('bot', 'Unable to connect to support right now.');
        return;
      }

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (e) {
        this.connecting = false;
        this.ws = null;
        this.addMessage('bot', 'Unable to connect to support right now.');
        return;
      }

      this.ws.onopen = () => {
        this.connecting = false;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.flushPendingMessages();
      };

      this.ws.onmessage = (event) => {
        const parsed = typeof event.data === 'string' ? safeJsonParse(event.data) : null;
        if (!parsed) return;

        if (parsed.conversationId) {
          this.conversationId = parsed.conversationId;
        }

        const senderId = parsed.senderId;
        const content = parsed.content;
        if (!content) return;

        const role = senderId && this.customerId && senderId === this.customerId ? 'user' : 'bot';
        this.addMessage(role, content);
      };

      this.ws.onerror = () => {};

      this.ws.onclose = () => {
        this.isConnected = false;
        this.connecting = false;
        this.ws = null;
        this.scheduleReconnect();
      };
    }

    scheduleReconnect() {
      if (!this.customerToken) return;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
      this.reconnectAttempts += 1;
      const delayMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 15000);
      setTimeout(() => this.connectWebSocket(), delayMs);
    }

    flushPendingMessages() {
      if (!this.isConnected || !this.ws) return;
      const toSend = [...this.pendingMessages];
      this.pendingMessages = [];
      toSend.forEach((payload) => {
        try {
          this.ws.send(JSON.stringify(payload));
        } catch (e) {
          this.pendingMessages.unshift(payload);
        }
      });
    }

    createContainer() {
      this.container = document.createElement('div');
      this.container.className = `ai-agent-widget-container ${this.config.position}`;
      document.body.appendChild(this.container);
    }

    createLauncher() {
      this.launcher = document.createElement('button');
      this.launcher.className = 'ai-agent-launcher';
      this.launcher.style.backgroundColor = this.config.primaryColor;
      this.launcher.innerHTML = ICONS.message;
      this.launcher.setAttribute('aria-label', 'Open chat');
      this.container.appendChild(this.launcher);
    }

    createWindow() {
      this.window = document.createElement('div');
      this.window.className = 'ai-agent-window';
      
      // Header
      const header = document.createElement('div');
      header.className = 'ai-agent-header';
      header.style.backgroundColor = this.config.primaryColor;
      header.innerHTML = `
        <h3 class="ai-agent-title">Support</h3>
        <button class="ai-agent-close" aria-label="Close chat">${ICONS.close}</button>
      `;

      // Messages Area
      this.messagesContainer = document.createElement('div');
      this.messagesContainer.className = 'ai-agent-messages';
      this.renderMessages();

      // Input Area
      const inputArea = document.createElement('div');
      inputArea.className = 'ai-agent-input-area';
      inputArea.innerHTML = `
        <input type="text" class="ai-agent-input" placeholder="Type a message..." />
        <button class="ai-agent-send" disabled>${ICONS.send}</button>
      `;

      this.window.appendChild(header);
      this.window.appendChild(this.messagesContainer);
      this.window.appendChild(inputArea);
      this.container.appendChild(this.window);

      this.input = inputArea.querySelector('.ai-agent-input');
      this.sendBtn = inputArea.querySelector('.ai-agent-send');
      this.closeBtn = header.querySelector('.ai-agent-close');
    }

    renderMessages() {
      this.messagesContainer.innerHTML = this.messages.map(msg => `
        <div class="ai-agent-message ${msg.role}" 
             style="${msg.role === 'user' ? `background-color: ${this.config.primaryColor}` : ''}">
          ${msg.content}
        </div>
      `).join('');
      this.scrollToBottom();
    }

    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    toggle() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.window.classList.add('open');
        this.launcher.style.transform = 'scale(0)';
        setTimeout(() => this.input.focus(), 100);
      } else {
        this.window.classList.remove('open');
        this.launcher.style.transform = 'scale(1)';
      }
    }

    addMessage(role, content) {
      this.messages.push({ role, content });
      this.renderMessages();
    }

    async handleSend() {
      const text = this.input.value.trim();
      if (!text) return;

      this.addMessage('user', text);
      this.input.value = '';
      this.sendBtn.disabled = true;

      const payload = {
        conversationId: this.conversationId || undefined,
        senderId: this.customerId || 'anonymous',
        content: text,
        metadata: {
          agentId: this.config.agentId,
          shop: this.config.shop,
          pageUrl: window.location.href
        }
      };

      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(payload));
        } catch (e) {
          this.pendingMessages.push(payload);
        }
      } else {
        this.pendingMessages.push(payload);
        this.connectWebSocket();
      }

      this.sendBtn.disabled = false;
    }

    attachEventListeners() {
      this.launcher.addEventListener('click', () => this.toggle());
      this.closeBtn.addEventListener('click', () => this.toggle());

      this.input.addEventListener('input', (e) => {
        this.sendBtn.disabled = !e.target.value.trim();
      });

      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleSend();
      });

      this.sendBtn.addEventListener('click', () => this.handleSend());
      
      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (this.isOpen && 
            !this.container.contains(e.target) && 
            !this.launcher.contains(e.target)) {
          this.toggle();
        }
      });
    }
  }

  // Expose to global scope
  window.AiAgentWidget = {
    init: (config) => new AiAgentWidget(config)
  };
})();

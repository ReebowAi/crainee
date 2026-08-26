// public/js/websocket.js
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.isConnecting = false;
    this.subscriptions = new Set();
    
    // Bind methods
    this.handleMessage = this.handleMessage.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) return;
    this.isConnecting = true;
    
    try {
      // Use Socket.io if available, otherwise native WebSocket
      if (typeof io !== 'undefined') {
        this.socket = io('/', {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts, 
          reconnectionDelay: this.reconnectDelay
        });
        this.setupSocketIO();
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.socket = new WebSocket(`${protocol}//${window.location.host}`);
        this.setupNativeWebSocket();
      }
    } catch (err) {
      console.error('WebSocket connection error:', err);
      this.scheduleReconnect();
    }
  }

  setupSocketIO() {
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('connected');
      this.resubscribe();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
      this.isConnecting = false;
    });

    this.socket.on('market:update', (data) => {
      this.emit('market:update', data);
    });

    this.socket.on('notification:banner', (data) => {
      this.emit('notification:banner', data);
    });

    this.socket.on('orderbook:update', (data) => {
      this.emit('orderbook:update', data);
    }); 

    this.socket.on('portfolio:update', (data) => {
      this.emit('portfolio:update', data);
    });

    this.socket.on('admin:market:paused', (data) => {
      this.emit('admin:market:paused', data);
    });

    this.socket.on('admin:market:resumed', (data) => {
      this.emit('admin:market:resumed', data);
    });

    this.socket.on('admin:settings:updated', (data) => {
      this.emit('admin:settings:updated', data);
    });
  }

  setupNativeWebSocket() {
    this.socket.onopen = this.handleOpen;
    this.socket.onclose = this.handleClose;
    this.socket.onerror = this.handleError;
    this.socket.onmessage = this.handleMessage;
  }

  handleOpen() {
    console.log('✅ Native WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.emit('connected');
    this.resubscribe();
  }

  handleClose(event) {
    console.log('❌ Native WebSocket closed:', event.code, event.reason);
    this.emit('disconnected', event.reason);
    this.scheduleReconnect();
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    this.isConnecting = false;
  } 

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.emit(data.type, data.payload);
    } catch (err) {
      console.error('Failed to parse WS message:', err);
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1) + Math.random() * 1000;
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  resubscribe() {
    for (const sub of this.subscriptions) {
      this.send(sub);
    }
  }

  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else if (this.socket?.connected) {
      // Socket.IO
      this.socket.emit(data.type, data.payload);
    } else {
      // Queue for later
      this.subscriptions.add(data);
    }
  }

  subscribe(channel) {
    this.send({ type: 'subscribe', channel });
  }

  unsubscribe(channel) {
    this.send({ type: 'unsubscribe', channel });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (err) {
          console.error(`Listener error for ${event}:`, err);
        }
      }
    }
  }

  disconnect() {
    this.subscriptions.clear();
    if (this.socket) {
      if (typeof io !== 'undefined' && this.socket.disconnect) {
        this.socket.disconnect();
      } else if (this.socket.close) {
        this.socket.close();
      }
      this.socket = null;
    } 
  }
}

// Export class & alias for modular imports (matching WSClient expectation)
export { WebSocketManager };
export const WSClient = WebSocketManager;

// Export singleton
window.wsManager = new WebSocketManager();

// Auto-connect on load
document.addEventListener('DOMContentLoaded', () => {
  window.wsManager.connect();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  window.wsManager.disconnect();
});

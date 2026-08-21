// public/js/services/ws-client.js - WebSocket client for real-time data
export class WSClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.subscriptions = new Set();
    this.messageHandlers = new Map();
    this.isAuthenticated = false;
    this.pendingRequests = new Map();
    this.requestId = 0;
  }
  
  async connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          
          // Authenticate if we have a token
          if (window.App.token) {
            this.send('auth', { token: window.App.token });
          }
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isAuthenticated = false;
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }
  
  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }
  
  handleMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'connected':
        console.log('WS:', data.message);
        break;
        
      case 'auth_success':
        this.isAuthenticated = true;
        console.log('WS authenticated for user:', data.userId);
        // Re-subscribe to previous subscriptions
        this.subscriptions.forEach(assetId => {
          this.send('subscribe', { assetId });
        });
        break;
        
      case 'auth_error':
        console.error('WS auth error:', data.error);
        break;
        
      case 'price_update':
        this.emit('price_update', data);
        break;
        
      case 'orderbook_snapshot':
      case 'orderbook_update':
        this.emit('orderbook', data);
        break;
        
      case 'ticker_message':
        this.emit('ticker', data);
        break;
        
      case 'market_summary':
        this.emit('market_summary', data);
        break;
        
      case 'assets_list':
        this.emit('assets_list', data);
        break;
        
      case 'subscribed':
      case 'unsubscribed':
        this.emit('subscription_change', data);
        break;
        
      case 'pong':
        // Heartbeat response
        break;
        
      case 'error':
        console.error('WS error:', data.error);
        break;
        
      default:
        // Check for custom handlers
        if (this.messageHandlers.has(type)) {
          this.messageHandlers.get(type).forEach(handler => handler(data));
        }
    }
  }
  
  // Event emitter pattern
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event).add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }
  
  emit(event, data) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          console.error(`Handler error for ${event}:`, e);
        }
      });
    }
  }
  
  subscribe(assetId) {
    this.subscriptions.add(assetId);
    this.send('subscribe', { assetId });
  }
  
  unsubscribe(assetId) {
    this.subscriptions.delete(assetId);
    this.send('unsubscribe', { assetId });
  }
  
  subscribeAll() {
    this.subscriptions.add('all');
    this.send('subscribe', { assetId: 'all' });
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
  }
  
  // Request-response pattern for RPC-style calls
  request(type, data) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject, timeout: setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, 10000) });
      
      this.send(type, { ...data, requestId: id });
    });
  }
}

// Heartbeat
setInterval(() => {
  if (window.App.ws && window.App.ws.isAuthenticated) {
    window.App.ws.send('ping', {});
  }
}, 30000);

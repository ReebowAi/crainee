// websocket/ws-handler.js - Real-time WebSocket handling for Crainee Enterprise Platform
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'crainee-enterprise-secret-key-2026';

function setupWebSocket(wss, db) {
  const clients = new Map(); // ws -> { userId, subscriptions: Set }

  function verifyWsToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return null;
    }
  }

  function send(ws, type, data) {
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }

  function broadcastToSubscribers(assetId, type, data) {
    for (const [ws, client] of clients) {
      if (client.subscriptions.has(assetId) || client.subscriptions.has('all')) {
        send(ws, type, data);
      }
    }
  }

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    // Send welcome
    send(ws, 'connected', { message: 'Connected to Crainee Enterprise real-time feed' });

    ws.on('message', (message) => {
      try {
        const { type, data } = JSON.parse(message.toString());
        
        switch (type) {
          case 'auth':
            const decoded = verifyWsToken(data.token);
            if (decoded) {
              clients.set(ws, { userId: decoded.id, subscriptions: new Set(['all']) });
              send(ws, 'auth_success', { userId: decoded.id });
              console.log(`User ${decoded.email} authenticated on WS`);
            } else {
              send(ws, 'auth_error', { error: 'Invalid token' });
            }
            break;

          case 'subscribe':
            const client = clients.get(ws);
            if (client && data.assetId) {
              client.subscriptions.add(data.assetId);
              // Send current order book immediately
              const orderBook = db.getOrderBook(data.assetId);
              send(ws, 'orderbook_snapshot', { assetId: data.assetId, ...orderBook });
              send(ws, 'subscribed', { assetId: data.assetId });
            }
            break;

          case 'unsubscribe':
            const c = clients.get(ws);
            if (c && data.assetId) {
              c.subscriptions.delete(data.assetId);
              send(ws, 'unsubscribed', { assetId: data.assetId });
            }
            break;

          case 'get_assets':
            const assets = db.getAllAssets();
            send(ws, 'assets_list', { assets });
            break;

          case 'get_orderbook':
            const ob = db.getOrderBook(data.assetId);
            send(ws, 'orderbook_snapshot', { assetId: data.assetId, ...ob });
            break;

          case 'ping':
            send(ws, 'pong', { timestamp: Date.now() });
            break;

          default:
            send(ws, 'error', { error: `Unknown message type: ${type}` });
        }
      } catch (e) {
        console.error('WS message error:', e);
        send(ws, 'error', { error: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket disconnected');
    });

    ws.on('error', (err) => {
      console.error('WS error:', err);
      clients.delete(ws);
    });
  });

  // Expose broadcast functions for market simulator
  wss.broadcastPriceUpdate = (assetId, priceData) => {
    broadcastToSubscribers(assetId, 'price_update', priceData);
  };

  wss.broadcastOrderBook = (assetId, orderBook) => {
    broadcastToSubscribers(assetId, 'orderbook_update', { assetId, ...orderBook });
  };

  wss.broadcastTicker = (message) => {
    broadcastToSubscribers('all', 'ticker_message', { message });
  };

  wss.broadcastMarketSummary = (summary) => {
    broadcastToSubscribers('all', 'market_summary', summary);
  };

  console.log('WebSocket handler initialized');
}

module.exports = { setupWebSocket };

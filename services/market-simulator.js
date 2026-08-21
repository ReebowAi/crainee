// services/market-simulator.js - Simulates realistic market movements for Crainee Enterprise Platform
const { v4: uuidv4 } = require('uuid');

let simulationInterval = null;
let orderBookInterval = null;
let tickerInterval = null;

function startMarketSimulator(wss, db) {
  console.log('Starting market simulator...');
  
  // Get update interval from settings (default 1000ms)
  const getPriceInterval = () => {
    const setting = db.getSetting('price_update_interval');
    return setting ? parseInt(setting.value) : 1000;
  };

  const getTickerInterval = () => {
    const setting = db.getSetting('ticker_speed');
    return setting ? parseInt(setting.value) : 3000;
  };

  // Price simulation with realistic volatility
  function simulatePriceMovement() {
    const assets = db.getAllAssets();
    
    for (const asset of assets) {
      // Volatility based on asset type
      const volatility = {
        crypto: 0.008,   // 0.8% per tick
        stock: 0.003,    // 0.3% per tick
        forex: 0.0005    // 0.05% per tick
      }[asset.type] || 0.005;

      // Random walk with mean reversion
      const price24hAgo = asset.price_24h_ago;
      const currentPrice = asset.current_price;
      const meanReversion = (price24hAgo - currentPrice) * 0.001;
      const randomChange = (Math.random() - 0.5) * 2 * volatility * currentPrice;
      const newPrice = currentPrice + meanReversion + randomChange;
      
      // Ensure price stays positive and reasonable
      const finalPrice = Math.max(newPrice, price24hAgo * 0.5);
      
      // Volume simulation
      const baseVolume = asset.volume_24h / 86400; // per second
      const volumeVariation = 0.5 + Math.random();
      const tickVolume = baseVolume * volumeVariation * (getPriceInterval() / 1000);
      
      const updated = db.updateAssetPrice(asset.id, finalPrice, tickVolume);
      
      if (updated) {
        // Calculate 24h change
        const change24h = ((finalPrice - price24hAgo) / price24hAgo) * 100;
        
        // Broadcast price update
        wss.broadcastPriceUpdate(asset.id, {
          assetId: asset.id,
          symbol: asset.symbol,
          price: finalPrice,
          change24h: change24h,
          volume24h: updated.volume_24h,
          high24h: updated.high_24h,
          low24h: updated.low_24h,
          timestamp: Date.now()
        });
      }
    }
  }

  // Order book simulation - generates realistic depth
  function simulateOrderBook() {
    const assets = db.getAllAssets();
    
    for (const asset of assets) {
      // Clear old system orders
      db.clearOrderBook(asset.id);
      
      const midPrice = asset.current_price;
      const spread = midPrice * 0.001; // 0.1% spread
      const tickSize = midPrice > 100 ? 0.01 : (midPrice > 1 ? 0.001 : 0.0001);
      
      // Generate buy orders (below mid)
      for (let i = 1; i <= 30; i++) {
        const price = midPrice - spread - (i * tickSize * (1 + Math.random() * 2));
        const quantity = (Math.random() * 100 + 10) * Math.pow(0.9, i);
        if (quantity > 0.001) {
          db.addOrderBookEntry(asset.id, 'buy', price, quantity, null, 1);
        }
      }
      
      // Generate sell orders (above mid)
      for (let i = 1; i <= 30; i++) {
        const price = midPrice + spread + (i * tickSize * (1 + Math.random() * 2));
        const quantity = (Math.random() * 100 + 10) * Math.pow(0.9, i);
        if (quantity > 0.001) {
          db.addOrderBookEntry(asset.id, 'sell', price, quantity, null, 1);
        }
      }
      
      // Broadcast updated order book
      const orderBook = db.getOrderBook(asset.id);
      wss.broadcastOrderBook(asset.id, orderBook);
    }
  }

  // Ticker message rotation
  function rotateTicker() {
    const tickers = db.getActiveTickers();
    if (tickers.length > 0) {
      const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];
      wss.broadcastTicker(randomTicker.message);
    }
    
    // Occasionally generate new professional ticker message
    if (Math.random() < 0.1) { // 10% chance
      const newTicker = db.generateAITickerMessage();
      db.addTickerMessage(newTicker);
      wss.broadcastTicker(newTicker);
    }
  }

  // Market summary broadcast
  function broadcastMarketSummary() {
    const assets = db.getAllAssets();
    const summary = {
      totalAssets: assets.length,
      gainers: assets.filter(a => a.current_price > a.price_24h_ago).length,
      losers: assets.filter(a => a.current_price < a.price_24h_ago).length,
      totalVolume24h: assets.reduce((sum, a) => sum + a.volume_24h, 0),
      timestamp: Date.now()
    };
    wss.broadcastMarketSummary(summary);
  }

  // Start intervals
  simulationInterval = setInterval(simulatePriceMovement, getPriceInterval());
  orderBookInterval = setInterval(simulateOrderBook, 5000); // Update order book every 5s
  tickerInterval = setInterval(rotateTicker, getTickerInterval());
  
  // Market summary every 10 seconds
  setInterval(broadcastMarketSummary, 10000);

  // Initial order book population
  simulateOrderBook();
  
  // Initial broadcast
  broadcastMarketSummary();

  console.log('Market simulator running');
  
  // Return cleanup function
  return () => {
    if (simulationInterval) clearInterval(simulationInterval);
    if (orderBookInterval) clearInterval(orderBookInterval);
    if (tickerInterval) clearInterval(tickerInterval);
  };
}

module.exports = { startMarketSimulator };

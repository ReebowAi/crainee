// services/market-simulator.js - Market Simulator & Order Book Engine
const { EduDatabase } = require('../database/db');
const db = new EduDatabase();

let simulatorInterval = null;
let priceUpdateInterval = null;

async function startMarketSimulator(io) {
  console.log('Starting market simulator...');

  // Ensure DB connection is active if not already
  if (!db.isConnected) {
    try {
      await db.initialize();
    } catch (err) {
      console.error('Market simulator failed to connect to DB:', err);
      return;
    }
  }

  // Get update intervals from settings or defaults
  let tickerSpeed = 3000;
  let priceInterval = 1000;

  try {
    const tickerSetting = await db.getSetting('ticker_speed');
    if (tickerSetting && tickerSetting.value) {
      tickerSpeed = parseInt(tickerSetting.value, 10);
    }
    const priceSetting = await db.getSetting('price_update_interval');
    if (priceSetting && priceSetting.value) {
      priceInterval = parseInt(priceSetting.value, 10);
    }
  } catch (e) {
    console.log('Using default simulator timings');
  }

  // Price fluctuation loop
  priceUpdateInterval = setInterval(async () => {
    try {
      let assets = await db.getAllAssets();
      
      // Safety check to ensure assets is always an iterable array
      if (!Array.isArray(assets)) {
        assets = [];
      }

      for (const asset of assets) {
        // Generate small realistic price fluctuation (-0.15% to +0.15%)
        const changePercent = (Math.random() * 0.3 - 0.145) / 100;
        const priceChange = asset.current_price * changePercent;
        let newPrice = Number((asset.current_price + priceChange).toFixed(4));
        
        if (newPrice <= 0) newPrice = 0.01;

        const volumeIncrement = Math.floor(Math.random() * 50000) + 1000;
        await db.updateAssetPrice(asset.id, newPrice, volumeIncrement);

        // Broadcast live price updates via WebSocket if io is present
        if (io) {
          io.emit('price_update', {
            asset_id: asset.id,
            symbol: asset.symbol,
            current_price: newPrice,
            volume_24h: (asset.volume_24h || 0) + volumeIncrement
          });
        }
      }
    } catch (error) {
      console.error('Error in price update loop:', error);
    }
  }, priceInterval);

  // Order book simulation loop
  simulatorInterval = setInterval(async () => {
    try {
      let assets = await db.getAllAssets();
      
      // Safety check to ensure assets is always an iterable array
      if (!Array.isArray(assets)) {
        assets = [];
      }

      if (assets.length === 0) return;

      // Pick a random asset to simulate order book activity
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const currentPrice = randomAsset.current_price;

      // Generate buy and sell orders around current price
      await db.clearOrderBook(randomAsset.id);

      // Add 5 buy orders below current price
      for (let i = 1; i <= 5; i++) {
        const discount = (Math.random() * 0.5 + 0.1) * i;
        const buyPrice = Number((currentPrice - discount).toFixed(2));
        const quantity = Number((Math.random() * 10 + 0.5).toFixed(4));
        if (buyPrice > 0) {
          await db.addOrderBookEntry(randomAsset.id, 'buy', buyPrice, quantity, null, 1);
        }
      }

      // Add 5 sell orders above current price
      for (let i = 1; i <= 5; i++) {
        const premium = (Math.random() * 0.5 + 0.1) * i;
        const sellPrice = Number((currentPrice + premium).toFixed(2));
        const quantity = Number((Math.random() * 10 + 0.5).toFixed(4));
        await db.addOrderBookEntry(randomAsset.id, 'sell', sellPrice, quantity, null, 1);
      }

      // Fetch updated order book and broadcast
      if (io) {
        const orderBook = await db.getOrderBook(randomAsset.id);
        io.emit('orderbook_update', {
          asset_id: randomAsset.id,
          symbol: randomAsset.symbol,
          ...orderBook
        });
      }

      // Periodically broadcast a simulated ticker message
      if (io && Math.random() > 0.4) {
        const tickerMsg = db.generateAITickerMessage();
        io.emit('ticker_message', { message: tickerMsg });
      }

    } catch (error) {
      console.error('Error in order book simulator loop:', error);
    }
  }, tickerSpeed);

  console.log('Market simulator running successfully.');
}

function stopMarketSimulator() {
  if (priceUpdateInterval) clearInterval(priceUpdateInterval);
  if (simulatorInterval) clearInterval(simulatorInterval);
  console.log('Market simulator stopped.');
}

module.exports = {
  startMarketSimulator,
  stopMarketSimulator
};

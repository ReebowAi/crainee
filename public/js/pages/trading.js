// public/js/pages/trading.js - Trading page with full order entry (Crainee Institutional)
export class Trading {
  constructor(container) {
    this.container = container;
    this.asset = null;
    this.orderbook = null;
    this.priceUnsubscriber = null;
    this.orderbookUnsubscriber = null;
    this.side = 'buy';
    this.orderType = 'market';
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Trade</h1>
          <p class="page-subtitle">Execute trades with real-time market data</p>
        </div>
      </div>
      
      <div class="grid" style="grid-template-columns: 1fr 420px; gap: 24px;">
        <!-- Left: Chart & Order Book -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Asset Selector & Price -->
          <section class="card" id="trading-header" style="display: none;">
            <div class="card-content">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="badge badge-gray" id="trade-symbol" style="font-size: var(--text-base);">---</span>
                    <h2 id="trade-name" style="margin: 0; font-size: var(--text-xl);"></h2>
                    <span class="badge badge-gray" id="trade-type"></span>
                  </div>
                  <div style="display: flex; gap: 24px;">
                    <div>
                      <div class="stat-label">Mark Price</div>
                      <div class="stat-value mono" id="trade-mark-price">--</div>
                    </div>
                    <div>
                      <div class="stat-label">24h Change</div>
                      <div class="stat-change" id="trade-change">--</div>
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" id="trade-buy-tab" data-side="buy">Buy</button>
                  <button class="btn btn-secondary btn-sm" id="trade-sell-tab" data-side="sell">Sell</button>
                </div>
              </div>
            </div>
          </section>
          
          <!-- Chart Placeholder -->
          <section class="card" style="flex: 1; min-height: 350px;">
            <div class="card-header">
              <h2 class="card-title">Chart</h2>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-ghost btn-sm" data-timeframe="1m">1m</button>
                <button class="btn btn-ghost btn-sm active" data-timeframe="5m">5m</button>
                <button class="btn btn-ghost btn-sm" data-timeframe="15m">15m</button>
                <button class="btn btn-ghost btn-sm" data-timeframe="1h">1h</button>
                <button class="btn btn-ghost btn-sm" data-timeframe="4h">4h</button>
                <button class="btn btn-ghost btn-sm" data-timeframe="1d">1d</button>
              </div>
            </div>
            <div class="card-content" style="padding: 0; height: 350px;">
              <div class="chart-placeholder" id="trading-chart">
                <span>TradingView Lightweight Charts or Chart.js integration ready</span>
              </div>
            </div>
          </section>
          
          <!-- Order Book Depth -->
          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Order Book Depth</h2>
            </div>
            <div class="card-content" style="padding: 0; height: 280px;">
              <div class="orderbook" style="height: 100%;">
                <div class="orderbook-side buys" style="height: 100%; overflow-y: auto;">
                  <div class="orderbook-header buys" style="position: sticky; top: 0; z-index: 1;">
                    <span>BIDS</span>
                    <span id="depth-buy-total">0.00</span>
                  </div>
                  <div id="depth-buys"></div>
                </div>
                <div class="orderbook-side sells" style="height: 100%; overflow-y: auto;">
                  <div class="orderbook-header sells" style="position: sticky; top: 0; z-index: 1;">
                    <span>ASKS</span>
                    <span id="depth-sell-total">0.00</span>
                  </div>
                  <div id="depth-sells"></div>
                </div>
              </div>
            </div>
          </section>
        </div>
        
        <!-- Right: Order Entry Panel -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Order Form -->
          <section class="card" style="position: sticky; top: 24px;">
            <div class="card-header">
              <h2 class="card-title">Place Order</h2>
            </div>
            <div class="card-content">
              <form id="trade-form">
                <!-- Order Type -->
                <div class="form-group">
                  <label class="form-label">Order Type</label>
                  <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-secondary flex-1" id="type-market" data-type="market">Market</button>
                    <button type="button" class="btn btn-secondary flex-1" id="type-limit" data-type="limit">Limit</button>
                    <button type="button" class="btn btn-secondary flex-1" id="type-stop" data-type="stop">Stop</button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    // Event bindings for trading page will go here
  }
}
                    button type="button" class="btn btn-secondary flex-1" id="type-stop" data-type="stop">Stop</button>
                  </div>
                </div>
                
                <!-- Limit Price (shown for limit/stop orders) -->
                <div class="form-group" id="limit-price-group" style="display: none;">
                  <label class="form-label">Limit Price</label>
                  <div style="display: flex; gap: 8px;">
                    <input type="number" class="form-input flex-1" id="limit-price" step="0.01" min="0" placeholder="Limit price">
                    <button type="button" class="btn btn-ghost" id="limit-mid" title="Use mid price">Mid</button>
                    <button type="button" class="btn btn-ghost" id="limit-bid" title="Use bid price">Bid</button>
                    <button type="button" class="btn btn-ghost" id="limit-ask" title="Use ask price">Ask</button>
                  </div>
                </div>
                
                <!-- Stop Price (shown for stop orders) -->
                <div class="form-group" id="stop-price-group" style="display: none;">
                  <label class="form-label">Stop Price</label>
                  <input type="number" class="form-input" id="stop-price" step="0.01" min="0" placeholder="Stop trigger price">
                </div>
                
                <!-- Quantity -->
                <div class="form-group">
                  <label class="form-label">Quantity</label>
                  <div style="display: flex; gap: 8px;">
                    <input type="number" class="form-input flex-1" id="trade-qty" step="0.0001" min="0" placeholder="Enter quantity">
                    <select class="form-input form-select" id="qty-unit" style="width: auto;">
                      <option value="base">Base (e.g. BTC)</option>
                      <option value="quote">Quote (e.g. USD)</option>
                    </select>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="button" class="btn btn-ghost btn-sm flex-1" data-qty="25">25%</button>
                    <button type="button" class="btn btn-ghost btn-sm flex-1" data-qty="50">50%</button>
                    <button type="button" class="btn btn-ghost btn-sm flex-1" data-qty="75">75%</button>
                    <button type="button" class="btn btn-ghost btn-sm flex-1" data-qty="100">100%</button>
                  </div>
                </div>
                
                <!-- Estimated Total -->
                <div class="form-group">
                  <label class="form-label">Est. Total</label>
                  <div class="form-input" id="est-total" style="background: var(--gray-50); color: var(--gray-900); font-family: var(--font-mono); font-weight: 600; font-size: var(--text-lg);">$0.00</div>
                </div>
                
                <!-- Fee Estimate -->
                <div class="form-group">
                  <label class="form-label">Est. Fee (0.1%)</label>
                  <div class="form-input" id="est-fee" style="background: var(--gray-50); color: var(--gray-600); font-family: var(--font-mono);">$0.00</div>
                </div>
                
                <!-- Submit Buttons -->
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                  <button type="submit" class="btn btn-success flex-1" id="submit-buy" style="display: none;">
                    Buy <span id="buy-btn-qty"></span>
                  </button>
                  <button type="submit" class="btn btn-error flex-1" id="submit-sell" style="display: none;">
                    Sell <span id="sell-btn-qty"></span>
                  </button>
                </div>
              </form>
            </div>
          </section>
          
          <!-- Account Info -->
          <section class="card" style="position: sticky; top: 420px;">
            <div class="card-header">
              <h2 class="card-title">Account</h2>
            </div>
            <div class="card-content">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <div class="stat-label">Cash Balance</div>
                  <div class="stat-value mono" id="trade-balance">$0.00</div>
                </div>
                <div>
                  <div class="stat-label">Available</div>
                  <div class="stat-value mono" id="trade-available">$0.00</div>
                </div>
                <div>
                  <div class="stat-label">Tier</div>
                  <div class="stat-value"><span class="badge" id="trade-tier">Bronze</span></div>
                </div>
                <div>
                  <div class="stat-label">Max Withdrawal</div>
                  <div class="stat-value mono" id="trade-max-withdrawal">$1,000</div>
                </div>
              </div>
              
              <div style="margin-top: 16px; padding: 12px; background: var(--warning-bg); border-radius: var(--border-radius); border-left: 4px solid var(--warning);">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--warning); flex-shrink: 0; margin-top: 1px;">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <div>
                    <div style="font-weight: 600; color: var(--warning); font-size: var(--text-sm);">crainee Prime Execution</div>
                    <div style="font-size: var(--text-xs); color: var(--gray-600); margin-top: 2px;">Institutional grade liquidity network. Withdrawals are subject to account tier constraints.</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      
      <!-- Recent Trades / Open Orders -->
      <div class="grid grid-2" style="margin-top: 24px;">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Recent Trades</h2>
          </div>
          <div class="card-content" style="padding: 0;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Side</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody id="recent-trades-body">
                  <tr><td colspan="5" class="text-center" style="padding: 40px; color: var(--gray-500);">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
        
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Open Orders</h2>
          </div>
          <div class="card-content" style="padding: 0;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Side</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="open-orders-body">
                  <tr><td colspan="6" class="text-center" style="padding: 40px; color: var(--gray-500);">No open orders</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    `;
  }
  
  bindEvents() {
    // Side tabs
    this.container.querySelectorAll('#trade-buy-tab, #trade-sell-tab').forEach(btn => {
      btn.addEventListener('click', () => this.setSide(btn.dataset.side));
    });
    
    // Order type buttons
    this.container.querySelectorAll('#type-market, #type-limit, #type-stop').forEach(btn => {
      btn.addEventListener('click', () => this.setOrderType(btn.dataset.type));
    });
    
    // Quick price buttons
    this.container.querySelector('#limit-mid')?.addEventListener('click', () => this.setLimitPrice('mid'));
    this.container.querySelector('#limit-bid')?.addEventListener('click', () => this.setLimitPrice('bid'));
    this.container.querySelector('#limit-ask')?.addEventListener('click', () => this.setLimitPrice('ask'));
    
    // Quantity percentage buttons
    this.container.querySelectorAll('[data-qty]').forEach(btn => {
      btn.addEventListener('click', () => this.setQuantityPercent(parseInt(btn.dataset.qty)));
    });
    
    // Quantity input
    this.container.querySelector('#trade-qty')?.addEventListener('input', () => this.updateEstimates());
    this.container.querySelector('#limit-price')?.addEventListener('input', () => this.updateEstimates());
    this.container.querySelector('#qty-unit')?.addEventListener('change', () => this.updateEstimates());
    
    // Form submit
    this.container.querySelector('#trade-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.executeOrder();
    });
    
    // Chart timeframe buttons
    this.container.querySelectorAll('[data-timeframe]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('[data-timeframe]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Would trigger chart reload
      });
    });
  }
  
  async onShow() {
    // Check for asset in URL
    const params = new URLSearchParams(window.location.search);
    const assetId = params.get('asset');
    
    await this.loadBalance();
    
    if (assetId) {
      await this.selectAsset(assetId);
    } else if (this.asset) {
      // Keep current asset
      this.updateHeader();
    }
    
    this.subscribeToUpdates();
  }
  
  async loadBalance() {
    try {
      const res = await window.API.getBalance();
      this.updateAccountInfo(res);
    } catch (e) {
      console.error('Failed to load balance:', e);
    }
  }
  
  updateAccountInfo(data) {
    const balance = data.balance || 0;
    const tier = data.tier || 'Bronze';
    
    // Tier withdrawal limits
    const limits = { Bronze: 1000, Silver: 5000, Gold: 25000, VIP: 1000000 };
    
    this.container.querySelector('#trade-balance').textContent = `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    this.container.querySelector('#trade-available').textContent = `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    this.container.querySelector('#trade-tier').textContent = tier;
    this.container.querySelector('#trade-tier').className = `badge badge-${tier.toLowerCase()}`;
    this.container.querySelector('#trade-max-withdrawal').textContent = `$${limits[tier]?.toLocaleString() || '1,000'}`;
    
    this.availableBalance = balance;
  }
  
  async selectAsset(assetId) {
    try {
      const res = await window.API.getAsset(assetId);
      this.asset = res.asset;
      
      this.updateHeader();
      this.loadOrderBook();
      this.loadRecentTrades();
      
      // Subscribe to real-time updates
      if (window.App.ws) {
        window.App.ws.subscribe(assetId);
      }
    } catch (e) {
      console.error('Failed to load asset:', e);
      window.Toast.error('Failed to load asset');
    }
  }
  
  updateHeader() {
    if (!this.asset) return;
    
    document.getElementById('trading-header').style.display = 'block';
    this.container.querySelector('#trade-symbol').textContent = this.asset.symbol;
    this.container.querySelector('#trade-name').textContent = this.asset.name;
    this.container.querySelector('#trade-type').textContent = this.asset.type.charAt(0).toUpperCase() + this.asset.type.slice(1);
    this.container.querySelector('#trade-mark-price').textContent = `$${this.asset.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const change24h = ((this.asset.current_price - this.asset.price_24h_ago) / this.asset.price_24h_ago) * 100;
    const changeEl = this.container.querySelector('#trade-change');
    changeEl.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${change24h >= 0 ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>'}
      </svg>
      ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%
    `;
    changeEl.className = `stat-change ${change24h >= 0 ? 'positive' : 'negative'}`;
    
    // Update active side tab
    this.setSide(this.side);
  }
  
  setSide(side) {
    this.side = side;
    
    const buyTab = this.container.querySelector('#trade-buy-tab');
    const sellTab = this.container.querySelector('#trade-sell-tab');
    const submitBuy = this.container.querySelector('#submit-buy');
    const submitSell = this.container.querySelector('#submit-sell');
    
    if (side === 'buy') {
      buyTab.classList.add('btn-success');
      buyTab.classList.remove('btn-secondary');
      sellTab.classList.add('btn-secondary');
      sellTab.classList.remove('btn-error');
      submitBuy.style.display = 'flex';
      submitSell.style.display = 'none';
    } else {
      sellTab.classList.add('btn-error');
      sellTab.classList.remove('btn-secondary');
      buyTab.classList.add('btn-secondary');
      buyTab.classList.remove('btn-success');
      submitSell.style.display = 'flex';
      submitBuy.style.display = 'none';
    }
    
    this.updateEstimates();
  }
  
  setOrderType(type) {
    this.orderType = type;
    
    this.container.querySelectorAll('#type-market, #type-limit, #type-stop').forEach(btn => {
      btn.classList.toggle('btn-primary', btn.dataset.type === type);
      btn.classList.toggle('btn-secondary', btn.dataset.type !== type);
    });
    
    // Show/hide price fields
    const limitGroup = this.container.querySelector('#limit-price-group');
    const stopGroup = this.container.querySelector('#stop-price-group');
    
    limitGroup.style.display = (type === 'limit' || type === 'stop') ? 'block' : 'none';
    stopGroup.style.display = type === 'stop' ? 'block' : 'none';
    
    this.updateEstimates();
  }
  
  setLimitPrice(reference) {
    if (!this.asset || !this.orderbook) return;
    
    let price;
    switch (reference) {
      case 'mid':
        const bestBid = this.orderbook.buys[0]?.price || this.asset.current_price;
        const bestAsk = this.orderbook.sells[0]?.price || this.asset.current_price;
        price = (bestBid + bestAsk) / 2;
        break;
      case 'bid':
        price = this.orderbook.buys[0]?.price || this.asset.current_price;
        break;
      case 'ask':
        price = this.orderbook.sells[0]?.price || this.asset.current_price;
        break;
    }
    
    if (price) {
      const input = this.container.querySelector('#limit-price');
      const tickSize = this.asset.current_price > 100 ? 0.01 : (this.asset.current_price > 1 ? 0.001 : 0.0001);
      input.value = Math.round(price / tickSize) * tickSize;
      this.updateEstimates();
    }
  }
  
  setQuantityPercent(percent) {
    if (!this.asset) return;
    
    const balance = this.availableBalance || 0;
    const price = this.getOrderPrice();
    
    if (price <= 0) return;
    
    let qty;
    const unit = this.container.querySelector('#qty-unit')?.value || 'base';
    
    if (unit === 'quote') {
      qty = (balance * percent / 100) / price;
    } else {
      const maxQty = balance / price;
      qty = maxQty * percent / 100;
    }
    
    const precision = this.asset.current_price > 100 ? 2 : (this.asset.current_price > 1 ? 4 : 6);
    qty = Math.floor(qty * Math.pow(10, precision)) / Math.pow(10, precision);
    
    this.container.querySelector('#trade-qty').value = qty;
    this.updateEstimates();
  }
  
  getOrderPrice() {
    if (this.orderType === 'market') {
      return this.asset.current_price;
    } else if (this.orderType === 'limit') {
      return parseFloat(this.container.querySelector('#limit-price')?.value) || 0;
    } else if (this.orderType === 'stop') {
      return parseFloat(this.container.querySelector('#stop-price')?.value) || 0;
    }
    return this.asset.current_price;
  }
  
  updateEstimates() {
    if (!this.asset) return;
    
    const qty = parseFloat(this.container.querySelector('#trade-qty')?.value) || 0;
    const price = this.getOrderPrice();
    const unit = this.container.querySelector('#qty-unit')?.value || 'base';
    
    let actualQty = qty;
    let total;
    
    if (unit === 'quote' && price > 0) {
      total = qty;
      actualQty = qty / price;
    } else {
      total = qty * price;
    }
    
    const fee = total * 0.001;
    
    this.container.querySelector('#est-total').textContent = `$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    this.container.querySelector('#est-fee').textContent = `$${fee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    if (actualQty > 0) {
      const qtyStr = this.asset.current_price > 100 ? actualQty.toFixed(2) : actualQty.toFixed(4);
      this.container.querySelector('#buy-btn-qty').textContent = ` ${qtyStr} ${this.asset.symbol}`;
      this.container.querySelector('#sell-btn-qty').textContent = ` ${qtyStr} ${this.asset.symbol}`;
    }
    
    const submitBtn = this.container.querySelector(this.side === 'buy' ? '#submit-buy' : '#submit-sell');
    const canTrade = actualQty > 0 && price > 0 && (this.side === 'buy' ? total <= this.availableBalance : true);
    submitBtn.disabled = !canTrade;
    
    if (!canTrade && this.side === 'buy') {
      submitBtn.title = 'Insufficient liquidity balance';
    } else {
      submitBtn.title = '';
    }
  }
  
  async loadOrderBook() {
    if (!this.asset) return;
    
    try {
      const res = await window.API.getOrderBook(this.asset.id, 50);
      this.orderbook = res.orderBook;
      this.renderDepthChart();
    } catch (e) {
      console.error('Failed to load order book:', e);
    }
  }
  
  renderDepthChart() {
    if (!this.orderbook) return;
    
    const buysContainer = this.container.querySelector('#depth-buys');
    const sellsContainer = this.container.querySelector('#depth-sells');
    
    const buyTotal = this.orderbook.buys.reduce((sum, b) => sum + b.quantity * b.price, 0);
    const sellTotal = this.orderbook.sells.reduce((sum, s) => sum + s.quantity * s.price, 0);
    
    this.container.querySelector('#depth-buy-total').textContent = `$${buyTotal.toLocaleString(undefined, {minimumFractionDigits: 0})}`;
    this.container.querySelector('#depth-sell-total').textContent = `$${sellTotal.toLocaleString(undefined, {minimumFractionDigits: 0})}`;
    
    buysContainer.innerHTML = this.orderbook.buys.map((order, i) => {
      const total = order.quantity * order.price;
      return `
        <div class="orderbook-row buy" style="opacity: ${1 - i * 0.015};">
          <span class="orderbook-price">$${order.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          <span class="orderbook-qty">${order.quantity.toLocaleString(undefined, {maximumFractionDigits: 4})}</span>
          <span class="orderbook-orders">$${total.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>
        </div>
      `;
    }).join('');
    
    sellsContainer.innerHTML = this.orderbook.sells.map((order, i) => {
      const total = order.quantity * order.price;
      return `
        <div class="orderbook-row sell" style="opacity: ${1 - i * 0.015};">
          <span class="orderbook-price">$${order.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          <span class="orderbook-qty">${order.quantity.toLocaleString(undefined, {maximumFractionDigits: 4})}</span>
          <span class="orderbook-orders">$${total.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>
        </div>
      `;
    }).join('');
  }
  
  async loadRecentTrades() {
    if (!this.asset) return;
    
    try {
      const res = await window.API.getTransactions(50);
      const trades = (res.transactions || []).filter(t => t.asset_id === this.asset.id && (t.type === 'buy' || t.type === 'sell')).slice(0, 20);
      
      const tbody = this.container.querySelector('#recent-trades-body');
      if (trades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px; color: var(--gray-500);">No recent trades</td></tr>';
        return;
      }
      
      tbody.innerHTML = trades.map(t => `
        <tr>
          <td>${this.formatTime(t.created_at)}</td>
          <td><span class="badge ${t.type === 'buy' ? 'badge-success' : 'badge-error'}">${t.type.toUpperCase()}</span></td>
          <td class="mono">${t.quantity?.toLocaleString(undefined, {maximumFractionDigits: 8}) || '--'}</td>
          <td class="mono">$${t.price?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '--'}</td>
          <td class="mono ${t.type === 'buy' ? 'positive' : 'negative'}">${t.type === 'buy' ? '+' : '-'}$${(t.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('');
    } catch (e) {
      console.error('Failed to load recent trades:', e);
    }
  }
  
  async executeOrder() {
    if (!this.asset) return;
    
    const qty = parseFloat(this.container.querySelector('#trade-qty')?.value) || 0;
    const price = this.getOrderPrice();
    const unit = this.container.querySelector('#qty-unit')?.value || 'base';
    
    let actualQty = qty;
    if (unit === 'quote' && price > 0) {
      actualQty = qty / price;
    }
    
    if (actualQty <= 0 || price <= 0) {
      window.Toast.error('Invalid quantity or price');
      return;
    }
    
    const submitBtn = this.container.querySelector(this.side === 'buy' ? '#submit-buy' : '#submit-sell');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    try {
      let res;
      if (this.side === 'buy') {
        res = await window.API.buy(this.asset.id, actualQty);
      } else {
        res = await window.API.sell(this.asset.id, actualQty);
      }
      
      if (res.success) {
        window.Toast.success(`${this.side === 'buy' ? 'Bought' : 'Sold'} ${actualQty.toFixed(4)} ${this.asset.symbol} @ $${res.executionPrice.toFixed(2)}`);
        
        this.container.querySelector('#trade-qty').value = '';
        this.updateEstimates();
        this.loadBalance();
        this.loadRecentTrades();
      }
    } catch (e) {
      window.Toast.error(e.message || 'Order failed');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${this.side === 'buy' ? 'Buy' : 'Sell'} <span id="${this.side === 'buy' ? 'buy-btn-qty' : 'sell-btn-qty'}"></span>`;
    }
  }
  
  subscribeToUpdates() {
    if (!this.asset || !window.App.ws) return;
    
    this.priceUnsubscriber = window.App.ws.on('price_update', (data) => {
      if (data.assetId === this.asset.id) {
        this.asset.current_price = data.price;
        this.container.querySelector('#trade-mark-price').textContent = `$${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const changeEl = this.container.querySelector('#trade-change');
        changeEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${data.change24h >= 0 ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>'}
          </svg>
          ${data.change24h >= 0 ? '+' : ''}${data.change24h.toFixed(2)}%
        `;
        changeEl.className = `stat-change ${data.change24h >= 0 ? 'positive' : 'negative'}`;
        
        this.updateEstimates();
      }
    });
    
    this.orderbookUnsubscriber = window.App.ws.on('orderbook', (data) => {
      if (data.assetId === this.asset.id) {
        this.orderbook = data;
        this.renderDepthChart();
      }
    });
  }
  
  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  }
}

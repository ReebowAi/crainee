// public/js/pages/market.js - Markets page with real-time data
class MarketPage {
  constructor(container) {
    this.container = container;
    this.assets = [];
    this.selectedAsset = null;
    this.priceUnsubscribers = new Map();
    this.orderbookUnsubscriber = null;
    this.activeQuickSide = 'buy';
  }

  async mount() {
    this.container.innerHTML = `
      <div class="market-page-container">
        <div class="markets-header">
          <h2>Markets</h2>
          <div class="market-filters">
            <input type="text" id="market-search" placeholder="Search markets..." class="form-control" />
            <select id="market-type-filter" class="form-control">
              <option value="">All Types</option>
              <option value="crypto">Crypto</option>
              <option value="stock">Stock</option>
              <option value="forex">Forex</option>
            </select>
          </div>
        </div>
        
        <div class="market-content-grid">
          <div class="markets-table-wrapper card">
            <table class="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Price</th>
                  <th>24h Change</th>
                  <th>Volume (24h)</th>
                  <th>24h High / Low</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="markets-body">
                <tr><td colspan="6" class="text-center">Loading markets...</td></tr>
              </tbody>
            </table>
          </div>
          
          <div class="market-detail-panel">
            <div id="selected-asset-header" class="card" style="display: none; margin-bottom: 1rem;">
              <div class="flex-between">
                <div>
                  <h3 id="detail-symbol" style="margin: 0; display: inline-block;"></h3>
                  <span id="detail-name" style="color: var(--gray-500); margin-left: 8px;"></span>
                  <span id="detail-type" class="badge" style="margin-left: 8px; text-transform: uppercase;"></span>
                </div>
                <div class="text-right">
                  <div id="detail-price" class="mono" style="font-size: 1.25rem; font-weight: bold;">$0.00</div>
                  <div id="detail-change" class="stat-change">--</div>
                </div>
              </div>
              <div class="flex-between" style="margin-top: 1rem; font-size: var(--text-xs); color: var(--gray-500);">
                <span>High: <strong id="detail-high" class="mono">--</strong></span>
                <span>Low: <strong id="detail-low" class="mono">--</strong></span>
                <span>Volume: <strong id="detail-volume" class="mono">--</strong></span>
              </div>
            </div>

            <div id="quick-trade-panel" class="card" style="display: none; margin-bottom: 1rem;">
              <h4>Quick Trade</h4>
              <div class="quick-trade-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                <button class="btn btn-sm btn-success" id="quick-buy-btn" style="flex: 1;" onclick="window.currentPage.setQuickTradeSide('buy')">Buy</button>
                <button class="btn btn-sm btn-secondary" id="quick-sell-btn" style="flex: 1;" onclick="window.currentPage.setQuickTradeSide('sell')">Sell</button>
              </div>
              <div class="form-group">
                <label>Quantity</label>
                <input type="number" id="quick-qty" class="form-control" placeholder="0.00" oninput="window.currentPage.updateQuickTradeTotal(this.value)" />
              </div>
              <div class="flex-between" style="margin-bottom: 1rem; font-size: var(--text-sm);">
                <span>Total Value:</span>
                <strong id="quick-total" class="mono">$0.00</strong>
              </div>
              <button id="quick-execute-btn" class="btn btn-success w-100" disabled onclick="window.currentPage.executeQuickTrade()">Execute Buy</button>
            </div>

            <div id="orderbook-card" class="card">
              <div class="flex-between" style="margin-bottom: 0.75rem;">
                <h4 style="margin: 0;">Order Book</h4>
                <select id="orderbook-depth" class="form-control" style="width: auto; padding: 2px 8px; font-size: var(--text-xs);" onchange="window.currentPage.loadOrderBook(window.currentPage.selectedAsset?.id, this.value)">
                  <option value="10">10 depth</option>
                  <option value="25" selected>25 depth</option>
                  <option value="50">50 depth</option>
                </select>
              </div>
              
              <div id="orderbook-loading" class="text-center" style="padding: 2rem; color: var(--gray-500);">
                Select an asset to view order book
              </div>
              
              <div id="orderbook-content" style="display: none; flex-direction: column; gap: 0.5rem;">
                <div class="orderbook-section">
                  <div class="text-xs text-gray-500 flex-between"><span>Asks (Sells)</span><span>Total: <span id="sell-total" class="mono">0.00</span></span></div>
                  <div id="orderbook-sells" class="orderbook-list"></div>
                </div>
                <hr style="border: 0; border-top: 1px solid var(--gray-200); margin: 4px 0;" />
                <div class="orderbook-section">
                  <div class="text-xs text-gray-500 flex-between"><span>Bids (Buys)</span><span>Total: <span id="buy-total" class="mono">0.00</span></span></div>
                  <div id="orderbook-buys" class="orderbook-list"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    window.currentPage = this;
    this.bindEvents();
    await this.loadMarkets();
  }

  bindEvents() {
    const searchInput = this.container.querySelector('#market-search');
    const typeFilter = this.container.querySelector('#market-type-filter');

    searchInput?.addEventListener('input', () => {
      this.filterMarkets(searchInput.value, typeFilter?.value);
    });

    typeFilter?.addEventListener('change', () => {
      this.filterMarkets(searchInput?.value, typeFilter.value);
    });
  }

  async loadMarkets() {
    try {
      const res = await window.API.getMarkets();
      this.assets = res.assets || [];
      this.renderMarketsTable(this.assets);
      this.subscribeToPriceUpdates();
    } catch (e) {
      console.error('Failed to load markets:', e);
      this.container.querySelector('#markets-body').innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed to load markets data.</td></tr>`;
    }
  }

  renderMarketsTable(assetsToRender) {
    const tbody = this.container.querySelector('#markets-body');
    if (!tbody) return;

    if (assetsToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No markets found</td></tr>`;
      return;
    }

    tbody.innerHTML = assetsToRender.map(asset => {
      const change24h = ((asset.current_price - asset.price_24h_ago) / asset.price_24h_ago) * 100;
      const isPositive = change24h >= 0;

      return `
        <tr data-asset-id="${asset.id}" style="cursor: pointer;">
          <td>
            <div class="flex-align" style="gap: 8px;">
              <strong>${asset.symbol}</strong>
              <div>
                <div style="font-size: var(--text-sm);">${asset.name}</div>
                <span style="font-size: var(--text-xs); color: var(--gray-500); text-transform: uppercase;">${asset.asset_type || 'crypto'}</span>
              </div>
            </div>
          </td>
          <td class="mono" data-price-id="${asset.id}">$${asset.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td>
            <span class="${isPositive ? 'positive' : 'negative'}" data-change-id="${asset.id}" style="font-weight: 600;">
              ${isPositive ? '+' : ''}${change24h.toFixed(2)}%
            </span>
          </td>
          <td class="mono">$${(asset.volume_24h / 1e6).toFixed(1)}M</td>
          <td>
            <div style="font-size: var(--text-xs); color: var(--gray-500);" class="mono">
              H: $${asset.high_24h ? asset.high_24h.toLocaleString(undefined, {minimumFractionDigits: 2}) : (asset.current_price * 1.05).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </div>
            <div style="font-size: var(--text-xs); color: var(--gray-500);" class="mono">
              L: $${asset.low_24h ? asset.low_24h.toLocaleString(undefined, {minimumFractionDigits: 2}) : (asset.current_price * 0.95).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </div>
          </td>
          <td>
            <button class="btn btn-ghost btn-sm select-asset-btn" data-id="${asset.id}">View</button>
          </td>
        </tr>
      `;
    }).join('');
    
    // Bind click events on rows
    tbody.querySelectorAll('tr[data-asset-id]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const assetId = row.dataset.assetId;
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) this.selectAsset(asset);
      });
    });
    
    tbody.querySelectorAll('.select-asset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const assetId = btn.dataset.id;
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) this.selectAsset(asset);
      });
    });
  }
  
  filterMarkets(searchQuery = '', typeFilter = '') {
    let filtered = [...this.assets];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.symbol.toLowerCase().includes(q) || 
        a.name.toLowerCase().includes(q)
      );
    }
    
    if (typeFilter) {
      filtered = filtered.filter(a => a.asset_type === typeFilter);
    }
    
    this.renderMarketsTable(filtered);
  }
  
  async selectAsset(asset) {
    this.selectedAsset = asset;
    
    // Highlight selected row in table
    this.container.querySelectorAll('#markets-body tr').forEach(tr => {
      tr.style.background = tr.dataset.assetId === asset.id ? 'var(--gray-100)' : '';
    });
    
    // Show header, order book, quick trade
    const headerEl = this.container.querySelector('#selected-asset-header');
    const loadingEl = this.container.querySelector('#orderbook-loading');
    const contentEl = this.container.querySelector('#orderbook-content');
    const tradePanel = this.container.querySelector('#quick-trade-panel');
    
    headerEl.style.display = 'block';
    loadingEl.style.display = 'none';
    contentEl.style.display = 'flex';
    tradePanel.style.display = 'block';
    
    // Populate header
    this.container.querySelector('#detail-symbol').textContent = asset.symbol;
    this.container.querySelector('#detail-name').textContent = asset.name;
    this.container.querySelector('#detail-type').textContent = asset.asset_type || 'crypto';
    this.container.querySelector('#detail-price').textContent = `$${asset.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const change24h = ((asset.current_price - asset.price_24h_ago) / asset.price_24h_ago) * 100;
    const changeEl = this.container.querySelector('#detail-change');
    changeEl.className = `stat-change ${change24h >= 0 ? 'positive' : 'negative'}`;
    changeEl.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${change24h >= 0 ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>'}
      </svg>
      ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% (24h)
    `;
    
    this.container.querySelector('#detail-high').textContent = `$${(asset.high_24h || asset.current_price * 1.05).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    this.container.querySelector('#detail-low').textContent = `$${(asset.low_24h || asset.current_price * 0.95).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    this.container.querySelector('#detail-volume').textContent = `$${(asset.volume_24h / 1e6).toFixed(2)}M`;
    
    // Reset quick trade form
    this.container.querySelector('#quick-qty').value = '';
    this.container.querySelector('#quick-total').textContent = '$0.00';
    this.container.querySelector('#quick-execute-btn').disabled = true;
    this.activeQuickSide = 'buy';
    this.updateQuickTradeButtons();
    
    // Load order book
    const depthSelect = this.container.querySelector('#orderbook-depth');
    await this.loadOrderBook(asset.id, parseInt(depthSelect?.value || 25));
    
    // Subscribe to order book via WS
    if (window.App.ws) {
      if (this.orderbookUnsubscriber) this.orderbookUnsubscriber();
      
      window.App.ws.subscribe(asset.id);
      this.orderbookUnsubscriber = window.App.ws.on('orderbook', (data) => {
        if (data.assetId === asset.id) {
          this.renderOrderBook(data.orderbook);
        }
      });
    }
  }
  
  async loadOrderBook(assetId, limit = 25) {
    try {
      const res = await window.API.getOrderBook(assetId, limit);
      if (res.orderbook) {
        this.renderOrderBook(res.orderbook);
      }
    } catch (e) {
      console.error('Failed to load order book:', e);
    }
  }
  
  renderOrderBook(orderbook) {
    const buySideContainer = this.container.querySelector('#orderbook-buys');
    const sellSideContainer = this.container.querySelector('#orderbook-sells');
    const buyTotalEl = this.container.querySelector('#buy-total');
    const sellTotalEl = this.container.querySelector('#sell-total');
    
    if (!buySideContainer || !sellSideContainer) return;
    
    const buys = orderbook.bids || [];
    const sells = orderbook.asks || [];
    
    let totalBuyQty = buys.reduce((acc, item) => acc + item.quantity, 0);
    let totalSellQty = sells.reduce((acc, item) => acc + item.quantity, 0);
    
    if (buyTotalEl) buyTotalEl.textContent = totalBuyQty.toFixed(2);
    if (sellTotalEl) sellTotalEl.textContent = totalSellQty.toFixed(2);
    
    buySideContainer.innerHTML = buys.map(item => `
      <div class="orderbook-row">
        <span class="mono positive">$${item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        <span class="mono">${item.quantity.toFixed(4)}</span>
        <span class="mono">${(item.price * item.quantity).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
      </div>
    `).join('');
    
    sellSideContainer.innerHTML = sells.map(item => `
      <div class="orderbook-row">
        <span class="mono negative">$${item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        <span class="mono">${item.quantity.toFixed(4)}</span>
        <span class="mono">${(item.price * item.quantity).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
      </div>
    `).join('');
  }
  
  setQuickTradeSide(side) {
    this.activeQuickSide = side;
    this.updateQuickTradeButtons();
  }
  
  updateQuickTradeButtons() {
    const buyBtn = this.container.querySelector('#quick-buy-btn');
    const sellBtn = this.container.querySelector('#quick-sell-btn');
    const executeBtn = this.container.querySelector('#quick-execute-btn');
    
    if (!buyBtn || !sellBtn) return;
    
    if (this.activeQuickSide === 'buy') {
      buyBtn.style.opacity = '1';
      buyBtn.style.boxShadow = 'var(--shadow-sm)';
      sellBtn.style.opacity = '0.6';
      executeBtn.className = 'btn btn-success';
      executeBtn.textContent = `Execute Buy ${this.selectedAsset?.symbol || ''}`;
    } else {
      sellBtn.style.opacity = '1';
      sellBtn.style.boxShadow = 'var(--shadow-sm)';
      buyBtn.style.opacity = '0.6';
      executeBtn.className = 'btn btn-error';
      executeBtn.textContent = `Execute Sell ${this.selectedAsset?.symbol || ''}`;
    }
  }
  
  updateQuickTradeTotal(qtyStr) {
    const qty = parseFloat(qtyStr);
    const executeBtn = this.container.querySelector('#quick-execute-btn');
    const totalEl = this.container.querySelector('#quick-total');
    
    if (!this.selectedAsset || isNaN(qty) || qty <= 0) {
      if (totalEl) totalEl.textContent = '$0.00';
      if (executeBtn) executeBtn.disabled = true;
      return;
    }
    
    const total = qty * this.selectedAsset.current_price;
    if (totalEl) totalEl.textContent = `$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (executeBtn) executeBtn.disabled = false;
  }
  
  async executeQuickTrade() {
    if (!this.selectedAsset) return;
    const qtyInput = this.container.querySelector('#quick-qty');
    const qty = parseFloat(qtyInput?.value);
    
    if (isNaN(qty) || qty <= 0) {
      window.Toast.error('Please enter a valid quantity');
      return;
    }
    
    try {
      let res;
      if (this.activeQuickSide === 'buy') {
        res = await window.API.buy(this.selectedAsset.id, qty);
        window.Toast.success(`Successfully bought ${qty} ${this.selectedAsset.symbol}!`);
      } else {
        res = await window.API.sell(this.selectedAsset.id, qty);
        window.Toast.success(`Successfully sold ${qty} ${this.selectedAsset.symbol}!`);
      }
      
      qtyInput.value = '';
      this.updateQuickTradeTotal('');
    } catch (e) {
      window.Toast.error(e.message || 'Trade execution failed');
    }
  }
  
  subscribeToPriceUpdates() {
    if (window.App.ws) {
      this.assets.forEach(asset => {
        const unsubscribe = window.App.ws.on('price_update', (data) => {
          if (data.assetId === asset.id) {
            const assetObj = this.assets.find(a => a.id === asset.id);
            if (assetObj) {
              assetObj.current_price = data.price;
              assetObj.high_24h = Math.max(assetObj.high_24h || data.price, data.price);
              assetObj.low_24h = Math.min(assetObj.low_24h || data.price, data.price);
            }
            
            // Update table row price
            const priceCell = this.container.querySelector(`[data-price-id="${asset.id}"]`);
            if (priceCell) {
              priceCell.textContent = `$${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }
            
            // If selected asset, update header price
            if (this.selectedAsset && this.selectedAsset.id === asset.id) {
              const detailPrice = this.container.querySelector('#detail-price');
              if (detailPrice) detailPrice.textContent = `$${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }
          }
        });
        this.priceUnsubscribers.set(asset.id, unsubscribe);
        window.App.ws.subscribe(asset.id);
      });
    }
  }
  
  onHide() {
    this.priceUnsubscribers.forEach(unsub => unsub());
    this.priceUnsubscribers.clear();
    if (this.orderbookUnsubscriber) {
      this.orderbookUnsubscriber();
      this.orderbookUnsubscriber = null;
    }
  }
}

// public/js/pages/markets.js (continued) - Markets page with real-time data
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

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
              text-xxs; color: var(--gray-500);">${asset.type}</div>
              </div>
            </div>
          </td>
          <td class="mono">$${asset.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td>
            <span class="${isPositive ? 'positive' : 'negative'}" style="font-weight: 600;">
              ${isPositive ? '+' : ''}${change24h.toFixed(2)}%
            </span>
          </td>
          <td class="mono">$${(asset.volume_24h / 1e6).toFixed(1)}M</td>
          <td class="mono" style="font-size: var(--text-xs);">
            $${asset.high_24h?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '--'} / 
            $${asset.low_24h?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '--'}
          </td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); document.querySelector('[data-asset-id=\\'${asset.id}\\']')?.click()">Select</button>
          </td>
        </tr>
      `;
    }).join('');
    
    // Add click handlers for rows
    tbody.querySelectorAll('tr[data-asset-id]').forEach(row => {
      row.addEventListener('click', () => {
        const assetId = row.dataset.assetId;
        this.selectAsset(assetId);
      });
    });
  }
  
  filterMarkets(search = '', type = '') {
    let filtered = this.assets;
    
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(a => 
        a.symbol.toLowerCase().includes(s) || 
        a.name.toLowerCase().includes(s)
      );
    }
    
    if (type) {
      filtered = filtered.filter(a => a.type === type);
    }
    
    this.renderMarketsTable(filtered);
  }
  
  selectAsset(assetId) {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return;
    
    this.selectedAsset = asset;
    
    // Update UI selection
    this.container.querySelectorAll('#markets-body tr').forEach(r => r.style.background = '');
    const selectedRow = this.container.querySelector(`#markets-body tr[data-asset-id="${assetId}"]`);
    if (selectedRow) selectedRow.style.background = 'var(--info-bg)';
    
    // Show detail panel
    document.getElementById('selected-asset-header').style.display = 'block';
    document.getElementById('orderbook-content').style.display = 'flex';
    document.getElementById('orderbook-loading').style.display = 'none';
    document.getElementById('quick-trade-panel').style.display = 'block';
    
    // Update detail header
    this.container.querySelector('#detail-symbol').textContent = asset.symbol;
    this.container.querySelector('#detail-name').textContent = asset.name;
    this.container.querySelector('#detail-type').textContent = asset.type.charAt(0).toUpperCase() + asset.type.slice(1);
    
    const change24h = ((asset.current_price - asset.price_24h_ago) / asset.price_24h_ago) * 100;
    const changeEl = this.container.querySelector('#detail-change');
    changeEl.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${change24h >= 0 ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>'}
      </svg>
      ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% (24h)
    `;
    changeEl.className = `stat-change ${change24h >= 0 ? 'positive' : 'negative'}`;
    
    this.container.querySelector('#detail-price').textContent = `$${asset.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    this.container.querySelector('#detail-high').textContent = `$${asset.high_24h?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '--'}`;
    this.container.querySelector('#detail-low').textContent = `$${asset.low_24h?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '--'}`;
    this.container.querySelector('#detail-volume').textContent = `$${(asset.volume_24h / 1e6).toFixed(1)}M`;
    
    // Load order book
    const depth = parseInt(this.container.querySelector('#orderbook-depth')?.value || '25');
    this.loadOrderBook(assetId, depth);
    
    // Subscribe to real-time updates for this asset
    this.subscribeToAsset(assetId);
    
    // Update quick trade
    this.updateQuickTradeTotal(this.container.querySelector('#quick-qty')?.value || '0');
  }
  
  async loadOrderBook(assetId, limit = 25) {
    try {
      const res = await window.API.getOrderBook(assetId, limit);
      this.renderOrderBook(res.orderBook);
    } catch (e) {
      console.error('Failed to load order book:', e);
    }
  }
  
  renderOrderBook({ buys, sells }) {
    const buysContainer = this.container.querySelector('#orderbook-buys');
    const sellsContainer = this.container.querySelector('#orderbook-sells');
    
    // Calculate totals
    const buyTotal = buys.reduce((sum, b) => sum + b.quantity * b.price, 0);
    const sellTotal = sells.reduce((sum, s) => sum + s.quantity * s.price, 0);
    
    this.container.querySelector('#buy-total').textContent = `$${buyTotal.toLocaleString(undefined, {minimumFractionDigits: 0})}`;
    this.container.querySelector('#sell-total').textContent = `$${sellTotal.toLocaleString(undefined, {minimumFractionDigits: 0})}`;
    
    // Render buys (highest price first)
    buysContainer.innerHTML = buys.map((order, i) => {
      const total = order.quantity * order.price;
      return `
        <div class="orderbook-row buy" style="opacity: ${1 - i * 0.02};">
          <span class="orderbook-price">$${order.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          <span class="orderbook-qty">${order.quantity.toLocaleString(undefined, {maximumFractionDigits: 4})}</span>
          <span class="orderbook-orders">${order.orders || 1} ord • $${total.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>
        </div>
      `;
    }).join('') || '<div class="orderbook-row buy"><span class="orderbook-price">--</span><span class="orderbook-qty">No bids</span></div>';
    
    // Render sells (lowest price first)
    sellsContainer.innerHTML = sells.map((order, i) => {
      const total = order.quantity * order.price;
      return `
        <div class="orderbook-row sell" style="opacity: ${1 - i * 0.02};">
          <span class="orderbook-price">$${order.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          <span class="orderbook-qty">${order.quantity.toLocaleString(undefined, {maximumFractionDigits: 4})}</span>
          <span class="orderbook-orders">${order.orders || 1} ord • $${total.toLocaleString(undefined, {minimumFractionDigits: 0})}</span>
        </div>
      `;
    }).join('') || '<div class="orderbook-row sell"><span class="orderbook-price">--</span><span class="orderbook-qty">No asks</span></div>';
  }
  
  subscribeToPriceUpdates() {
    if (window.App.ws) {
      this.priceUnsub = window.App.ws.on('price_update', (data) => {
        // Update markets table
        this.updateMarketRow(data);
        
        // Update detail panel if this asset is selected
        if (this.selectedAsset && this.selectedAsset.id === data.assetId) {
          this.updateDetailPanel(data);
        }
      });
    }
  }
  
  subscribeToAsset(assetId) {
    // Unsubscribe from previous
    if (this.orderbookUnsubscriber) {
      this.orderbookUnsubscriber();
    }
    
    if (window.App.ws) {
      window.App.ws.subscribe(assetId);
      
      this.orderbookUnsubscriber = window.App.ws.on('orderbook', (data) => {
        if (data.assetId === assetId) {
          this.renderOrderBook(data);
        }
      });
    }
  }
  
  updateMarketRow(data) {
    const row = this.container.querySelector(`#markets-body tr[data-asset-id="${data.assetId}"]`);
    if (!row) return;
    
    const change = data.change24h;
    const isPositive = change >= 0;
    
    row.querySelector('td:nth-child(2)').textContent = `$${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    row.querySelector('td:nth-child(3)').innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}" style="font-weight: 600;">${isPositive ? '+' : ''}${change.toFixed(2)}%</span>`;
    
    // Update the asset in our array
    const asset = this.assets.find(a => a.id === data.assetId);
    if (asset) {
      asset.current_price = data.price;
      asset.change24h = change;
    }
  }
  
  updateDetailPanel(data) {
    this.container.querySelector('#detail-price').textContent = `$${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const changeEl = this.container.querySelector('#detail-change');
    const isPositive = data.change24h >= 0;
    changeEl.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${isPositive ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>'}
      </svg>
      ${isPositive ? '+' : ''}${data.change24h.toFixed(2)}% (24h)
    `;
    changeEl.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
    
    if (data.high24h) {
      this.container.querySelector('#detail-high').textContent = `$${data.high24h.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }
    if (data.low24h) {
      this.container.querySelector('#detail-low').textContent = `$${data.low24h.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }
    if (data.volume24h) {
      this.container.querySelector('#detail-volume').textContent = `$${(data.volume24h / 1e6).toFixed(1)}M`;
    }
    
    // Update quick trade total
    this.updateQuickTradeTotal(this.container.querySelector('#quick-qty')?.value || '0');
  }
  
  quickTradeSide = 'buy';
  
  setQuickTradeSide(side) {
    this.quickTradeSide = side;
    const buyBtn = this.container.querySelector('#quick-buy-btn');
    const sellBtn = this.container.querySelector('#quick-sell-btn');
    const executeBtn = this.container.querySelector('#quick-execute-btn');
    
    if (side === 'buy') {
      buyBtn.classList.add('btn-success');
      buyBtn.classList.remove('btn-secondary');
      sellBtn.classList.add('btn-secondary');
      sellBtn.classList.remove('btn-error');
      executeBtn.classList.remove('btn-error');
      executeBtn.classList.add('btn-primary');
      executeBtn.textContent = 'Buy';
    } else {
      sellBtn.classList.add('btn-error');
      sellBtn.classList.remove('btn-secondary');
      buyBtn.classList.add('btn-secondary');
      buyBtn.classList.remove('btn-success');
      executeBtn.classList.remove('btn-primary');
      executeBtn.classList.add('btn-error');
      executeBtn.textContent = 'Sell';
    }
    
    this.updateQuickTradeTotal(this.container.querySelector('#quick-qty')?.value || '0');
  }
  
  updateQuickTradeTotal(qty) {
    const quantity = parseFloat(qty) || 0;
    const price = this.selectedAsset?.current_price || 0;
    const total = quantity * price;
    
    this.container.querySelector('#quick-total').textContent = `$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const executeBtn = this.container.querySelector('#quick-execute-btn');
    executeBtn.disabled = quantity <= 0 || !this.selectedAsset;
  }
  
  async executeQuickTrade() {
    const qty = parseFloat(this.container.querySelector('#quick-qty')?.value) || 0;
    if (qty <= 0 || !this.selectedAsset) return;
    
    const executeBtn = this.container.querySelector('#quick-execute-btn');
    executeBtn.disabled = true;
    executeBtn.textContent = 'Processing...';
    
    try {
      if (this.quickTradeSide === 'buy') {
        const res = await window.API.buy(this.selectedAsset.id, qty);
        if (res.success) {
          window.Toast.success(`Bought ${qty} ${this.selectedAsset.symbol} @ $${res.executionPrice.toFixed(2)}`);
          this.container.querySelector('#quick-qty').value = '';
          this.updateQuickTradeTotal('');
        }
      } else {
        const res = await window.API.sell(this.selectedAsset.id, qty);
        if (res.success) {
          window.Toast.success(`Sold ${qty} ${this.selectedAsset.symbol} @ $${res.executionPrice.toFixed(2)}`);
          this.container.querySelector('#quick-qty').value = '';
          this.updateQuickTradeTotal('');
        }
      }
    } catch (e) {
      window.Toast.error(e.message || 'Trade failed');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = this.quickTradeSide === 'buy' ? 'Buy' : 'Sell';
    }
  }
}

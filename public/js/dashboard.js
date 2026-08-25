// public/js/dashboard.js
class DashboardApp {
  constructor() {
    this.currentPage = 'overview';
    this.currentAsset = 'AAPL';
    this.currentAssetId = null;
    this.assets = [];
    this.user = null;
    this.orderBookUpdateTimer = null;
    this.tickerMessages = [];
    this.unsubscribers = [];
    this.init();
  }

  async init() {
    await this.loadUser();
    this.bindUI();
    this.setupWebSocket();
    await this.loadDashboardData();
    await this.loadAssets();
    this.startOrderBookUpdates();
    this.startTickerDisplay();
  }

  // Authentication & User
  async loadUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Not authenticated'); 
      const data = await res.json();
      this.user = data.user;
      this.updateUserUI();
    } catch (err) {
      window.location.href = '/';
    }
  }

  updateUserUI() {
    if (!this.user) return;
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = this.user.fullName || (this.user.email ? this.user.email.split('@')[0] : 'User');
    
    const emailEl = document.getElementById('dropdownUserEmail');
    if (emailEl) emailEl.textContent = this.user.email || '';
    
    const tierEl = document.getElementById('dropdownUserTier');
    if (tierEl) {
      tierEl.textContent = this.user.tier || 'Bronze';
      tierEl.className = `badge badge-tier-${(this.user.tier || 'bronze').toLowerCase()}`;
    }
    
    const sidebarTier = document.getElementById('sidebarTier');
    if (sidebarTier) {
      sidebarTier.textContent = this.user.tier || 'Bronze';
      sidebarTier.className = `tier-current badge badge-tier-${(this.user.tier || 'bronze').toLowerCase()}`;
    }

    const tierOrder = ['Bronze', 'Silver', 'Gold', 'VIP'];
    const currentIdx = tierOrder.indexOf(this.user.tier || 'Bronze');
    const nextTierEl = document.getElementById('sidebarNextTier');
    if (nextTierEl) {
      if (currentIdx !== -1 && currentIdx < tierOrder.length - 1) {
        nextTierEl.textContent = tierOrder[currentIdx + 1];
      } else {
        nextTierEl.textContent = 'MAX';
      }
    }
  }

  // UI Binding
  bindUI() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => this.toggleSidebar());
    
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => this.closeSidebar());

    // Navigation
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchPage(link.dataset.page);
      });
    });

    // Quick Trade Modal
    const quickBuyBtn = document.getElementById('quickBuyBtn');
    if (quickBuyBtn) quickBuyBtn.addEventListener('click', () => this.openQuickTrade('buy'));
    
    const quickTradeModal = document.getElementById('quickTradeModal');
    if (quickTradeModal) {
      const closeBtn = quickTradeModal.querySelector('.modal-close');
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal('quickTradeModal'));
      quickTradeModal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) this.closeModal('quickTradeModal');
      });
    }

    const submitQuickTrade = document.getElementById('submitQuickTrade');
    if (submitQuickTrade) submitQuickTrade.addEventListener('click', () => this.submitQuickTrade());

    const qtOrderType = document.getElementById('qtOrderType');
    if (qtOrderType) {
      qtOrderType.addEventListener('change', (e) => {
        const limitGroup = document.getElementById('qtLimitPriceGroup');
        if (limitGroup) limitGroup.style.display = e.target.value === 'limit' ? 'block' : 'none';
      });
    }

    const qtSymbol = document.getElementById('qtSymbol');
    if (qtSymbol) qtSymbol.addEventListener('input', (e) => this.searchSymbols(e.target.value));

    // User menu dropdown
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
    
    if (userMenu) {
      const trigger = userMenu.querySelector('.user-menu-trigger');
      if (trigger) {
        trigger.addEventListener('click', () => this.toggleDropdown(userMenu));
      }
      document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) userMenu.classList.remove('active');
      });
    }

    // Portfolio chart range buttons
    document.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => this.setPortfolioRange(btn.dataset.range));
    });

    // Trading desk asset type tabs
    document.querySelectorAll('#assetTypeTabs [data-type]').forEach(btn => {
      btn.addEventListener('click', () => this.switchAssetType(btn.dataset.type));
    });

    // Trading chart controls
    const chartTimeframe = document.getElementById('chartTimeframe');
    if (chartTimeframe) chartTimeframe.addEventListener('change', () => this.updateTradingChart());
    
    const chartType = document.getElementById('chartType');
    if (chartType) chartType.addEventListener('change', () => this.updateTradingChart());
    
    const chartFullscreen = document.getElementById('chartFullscreen');
    if (chartFullscreen) chartFullscreen.addEventListener('click', () => this.toggleChartFullscreen());

    // Order form
    const orderType = document.getElementById('orderType');
    if (orderType) orderType.addEventListener('change', () => this.updateOrderForm());
    
    const orderForm = document.getElementById('orderForm');
    if (orderForm) orderForm.addEventListener('submit', (e) => this.placeOrder(e));

    document.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setQuantityPercent(btn.dataset.qty));
    });

    document.querySelectorAll('#orderSideTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchOrderSide(btn.dataset.side));
    });

    const quantityInput = document.getElementById('quantity');
    if (quantityInput) quantityInput.addEventListener('input', () => this.updateEstimatedTotal());

    // Market movers tabs
    document.querySelectorAll('#moversTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchMoversTab(btn.dataset.mover));
    });

    // Order book depth
    const orderBookDepth = document.getElementById('orderBookDepth');
    if (orderBookDepth) orderBookDepth.addEventListener('change', () => this.updateOrderBook());

    // Settings link
    const settingsLink = document.getElementById('settingsLink');
    if (settingsLink) {
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSettingsModal();
      });
    }
  }

  // WebSocket Setup
  setupWebSocket() {
    if (!window.wsManager) return;
    this.unsubscribers.push(
      window.wsManager.on('connected', () => this.onWSConnected()),
      window.wsManager.on('disconnected', () => this.onWSDisconnected()),
      window.wsManager.on('market:update', (data) => this.onMarketUpdate(data)),
      window.wsManager.on('notification:banner', (data) => this.onNotificationBanner(data)),
      window.wsManager.on('orderbook:update', (data) => this.onOrderBookUpdate(data)),
      window.wsManager.on('portfolio:update', (data) => this.onPortfolioUpdate(data))
    );

    window.wsManager.subscribe({ type: 'subscribe', channel: 'market' });
    window.wsManager.subscribe({ type: 'subscribe', channel: 'notifications' });
  }

  onWSConnected() {
    const status = document.getElementById('marketStatus');
    if (status) status.classList.add('connected');
    this.loadDashboardData();
  }

  onWSDisconnected() {
    const status = document.getElementById('marketStatus');
    if (status) status.classList.remove('connected');
  }

  onMarketUpdate(data) {
    if (data.assets) {
      this.assets = data.assets;
      this.updateMarketData(data.assets);
    }
    if (data.portfolio) {
      this.updatePortfolioSummary(data.portfolio);
    }
  }

  onNotificationBanner(data) {
    if (data && data.message) {
      this.tickerMessages.unshift(data.message);
      if (this.tickerMessages.length > 20) this.tickerMessages.pop();
      this.renderTicker();
    }
  }

  onOrderBookUpdate(data) {
    if (data && data.assetId === this.currentAssetId) {
      this.renderOrderBook(data);
    }
  }

  onPortfolioUpdate(data) {
    this.updatePortfolioSummary(data);
  }

  // Page Navigation
  switchPage(pageId) {
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === pageId);
    });
    
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.dataset.page === pageId);
    });

    this.currentPage = pageId;
    this.closeSidebar();

    const titles = {
      overview: { title: 'Overview', subtitle: 'Your trading dashboard at a glance' },
      trading: { title: 'Trading Desk', subtitle: 'Real-time charts & order entry' },
      portfolio: { title: 'Portfolio', subtitle: 'Holdings, performance & analytics' },
      markets: { title: 'Markets', subtitle: 'Browse all available instruments' },
      transactions: { title: 'Transaction History', subtitle: 'Complete trading history' },
      tier: { title: 'Tier Status', subtitle: 'Your progression & benefits' }
    };

    const t = titles[pageId] || { title: pageId, subtitle: '' };
    const pageTitleEl = document.getElementById('pageTitle');
    const pageSubtitleEl = document.getElementById('pageSubtitle');
    if (pageTitleEl) pageTitleEl.textContent = t.title;
    if (pageSubtitleEl) pageSubtitleEl.textContent = t.subtitle;

    if (pageId === 'trading') this.loadTradingDesk();
    else if (pageId === 'portfolio') this.loadPortfolioPage();
    else if (pageId === 'markets') this.loadMarketsPage();
    else if (pageId === 'transactions') this.loadTransactionsPage();
    else if (pageId === 'tier') this.loadTierPage();
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('sidebarToggle');
    if (!sidebar || !overlay || !toggle) return;

    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
    toggle.setAttribute('aria-expanded', isOpen);
  }

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('sidebarToggle');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  toggleDropdown(menu) {
    menu.classList.toggle('active');
    const trigger = menu.querySelector('.user-menu-trigger');
    if (trigger) {
      trigger.setAttribute('aria-expanded', menu.classList.contains('active'));
    }
  }

  // Data Loading
  async loadDashboardData() {
    try {
      const res = await fetch('/api/dashboard/overview', { credentials: 'include' });
      if (!res.ok) {
        // Gracefully assemble safe fallback object if overview route isn't fully stubbed
        this.renderDashboard({
          portfolio: { totalValue: this.user?.virtualBalance || 10000, cashBalance: this.user?.virtualBalance || 10000, investedValue: 0, holdings: [], recentTransactions: [] },
          tierInfo: { progress: 25, balance: this.user?.virtualBalance || 10000, nextTier: { required: 50000 } },
          marketMovers: { gainers: [], losers: [] }
        });
        return;
      }
      const data = await res.json();
      this.renderDashboard(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }

  async loadAssets() {
    try {
      const res = await fetch('/api/market/assets', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load assets');
      const data = await res.json();
      this.assets = data.assets || [];
      this.populateAssetSelectors();
      if (this.assets.length > 0) {
        this.updateMarketData(this.assets);
      }
    } catch (err) {
      console.error('Assets load error:', err);
    }
  }

  renderDashboard(data) {
    if (!data) return;
    if (data.portfolio) {
      this.updatePortfolioSummary(data.portfolio);
      this.renderPortfolioChart(data.portfolio.history || []);
      this.renderAllocationChart(data.portfolio.holdings || []);
      this.renderHoldingsTable(data.portfolio.holdings || []);
      this.renderActivity(data.portfolio.recentTransactions || []);
    }
    if (data.tierInfo) {
      this.updateTierProgress(data.tierInfo);
    }
    if (data.marketMovers) {
      this.renderMovers(data.marketMovers);
    }
  }

  updatePortfolioSummary(portfolio) {
    const totalValue = portfolio.totalValue || 0;
    const cashBalance = portfolio.cashBalance || 0;
    const investedValue = portfolio.investedValue || 0;
    const dayPnl = portfolio.dayPnl || 0;
    const dayPnlPct = portfolio.dayPnlPct || 0;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    
    setVal('totalPortfolio', this.formatCurrency(totalValue));
    setVal('cashBalance', this.formatCurrency(cashBalance));
    setVal('investedValue', this.formatCurrency(investedValue));
    setVal('positionsCount', `${portfolio.holdings?.length || 0} positions`);
    setVal('dayPnl', this.formatCurrency(dayPnl, true));
    setVal('dayPnlPct', `(${dayPnlPct >= 0 ? '+' : ''}${dayPnlPct.toFixed(2)}%)`);
    setVal('headerBalance', this.formatCurrency(cashBalance));
    setVal('headerChange', this.formatCurrency(dayPnl, true) + ` (${dayPnlPct >= 0 ? '+' : ''}${dayPnlPct.toFixed(2)}%)`);
    
    const headerChangeEl = document.getElementById('headerChange');
    if (headerChangeEl) {
      headerChangeEl.className = `balance-change ${dayPnl >= 0 ? 'positive' : 'negative'}`;
    }

    setVal('buyingPower', this.formatCurrency(cashBalance));
    setVal('cashAvailable', this.formatCurrency(cashBalance));
    setVal('portfolioVal', this.formatCurrency(totalValue));
  }

  updateTierProgress(tierInfo) {
    if (!tierInfo) return;
    const progress = tierInfo.progress || 0;
    const bar = document.getElementById('tierProgressBar');
    if (bar) bar.style.width = `${progress}%`;
    
    const currentBal = document.getElementById('sidebarCurrentBalance');
    if (currentBal) currentBal.textContent = this.formatCurrency(tierInfo.balance || 0);
    
    const reqBal = document.getElementById('sidebarRequiredBalance');
    if (reqBal) reqBal.textContent = this.formatCurrency(tierInfo.nextTier?.required || 0);
  }

  // Portfolio Chart
  renderPortfolioChart(history) {
    if (!window.chartManager) return;
    if (!history || history.length === 0) {
      history = this.generateMockHistory(24);
    }
    const labels = history.map(h => {
      const d = new Date(h.timestamp || h.time || Date.now());
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    const values = history.map(h => h.value || h.totalValue || 0);
    window.chartManager.createPortfolioChart('portfolioChart', { labels, values });
  }

  setPortfolioRange(range) {
    document.querySelectorAll('[data-range]').forEach(b => {
      b.classList.toggle('active', b.dataset.range === range);
      b.setAttribute('aria-pressed', b.dataset.range === range);
    });
    const hours = { '1D': 24, '1W': 168, '1M': 720, '3M': 2160, 'ALL': 8760 };
    const history = this.generateMockHistory(hours[range] || 24);
    this.renderPortfolioChart(history);
  }

  generateMockHistory(hours) {
    const now = Date.now();
    const msPerHour = 3600000;
    let value = this.user?.virtualBalance || 10000;
    return Array.from({ length: Math.min(hours, 100) }, (_, i) => {
      const time = now - (hours - i) * msPerHour;
      value *= 1 + (Math.random() - 0.5) * 0.01;
      return { time, value: Math.max(100, value) };
    });
  }

  // Allocation Chart
  renderAllocationChart(holdings) {
    if (!window.chartManager) return;
    if (!holdings || holdings.length === 0) {
      window.chartManager.createAllocationChart('allocationChart', 'allocationLegend', {
        labels: ['Cash'],
        values: [this.user?.virtualBalance || 10000]
      });
      return;
    }
    const typeTotals = {};
    for (const h of holdings) {
      const type = h.type || 'stock';
      typeTotals[type] = (typeTotals[type] || 0) + (h.value || 0);
    }
    const labels = Object.keys(typeTotals).map(t => t.charAt(0).toUpperCase() + t.slice(1));
    const values = Object.values(typeTotals);
    window.chartManager.createAllocationChart('allocationChart', 'allocationLegend', { labels, values });
  }

  // Holdings Table
  renderHoldingsTable(holdings) {
    const tbody = document.querySelector('#holdingsTable tbody');
    if (!tbody) return;
    if (!holdings || holdings.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7" class="text-center py-5">No holdings yet. Start trading to build your portfolio.</td></tr>';
      return;
    }
    tbody.innerHTML = holdings.map(h => {
      const currentPrice = h.currentPrice || 0;
      const avgPrice = h.avgBuyPrice || 0;
      const qty = h.quantity || 0;
      const pnl = (currentPrice - avgPrice) * qty;
      const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
      return `
        <tr>
          <td>
            <div class="asset-cell">
              <span class="asset-symbol">${h.symbol || 'ASSET'}</span>
              <span class="asset-name">${h.name || ''}</span>
            </div>
          </td>
          <td class="text-right">${this.formatQuantity(qty)}</td>
          <td class="text-right">${this.formatCurrency(avgPrice)}</td>
          <td class="text-right">${this.formatCurrency(currentPrice)}</td>
          <td class="text-right">${this.formatCurrency(h.value || (currentPrice * qty))}</td>
          <td class="text-right ${pnl >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(pnl, true)}</td>
          <td class="text-right ${pnlPct >= 0 ? 'positive' : 'negative'}">${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%</td>
        </tr>
      `;
    }).join('');
  }

  // Market Movers
  renderMovers(movers) {
    this.currentMoversType = 'gainers';
    this.marketMovers = movers;
    this.renderMoversTab('gainers');
  }

  switchMoversTab(type) {
    document.querySelectorAll('#moversTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mover === type);
      b.setAttribute('aria-selected', b.dataset.mover === type);
    });
    this.currentMoversType = type;
    this.renderMoversTab(type);
  }

  renderMoversTab(type) {
    if (!this.marketMovers) return;
    const movers = this.marketMovers[type] || [];
    const tbody = document.getElementById('moversBody');
    if (!tbody) return;
    if (movers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No data available</td></tr>';
      return;
    }
    tbody.innerHTML = movers.map(m => `
      <tr class="mover-row">
        <td><span class="mover-symbol">${m.symbol}</span></td>
        <td><span class="mover-price">${this.formatCurrency(m.currentPrice || 0)}</span></td>
        <td class="text-right"><span class="mover-change ${(m.change24h || 0) >= 0 ? 'positive' : 'negative'}">${(m.change24h || 0) >= 0 ? '+' : ''}${(m.change24h || 0).toFixed(2)}%</span></td>
        <td class="text-right"><span class="mover-volume">${this.formatNumber(m.volume24h || 0)}</span></td>
      </tr>
    `).join('');
  }

  // Activity
  renderActivity(transactions) {
    const tbody = document.getElementById('activityBody');
    if (!tbody) return;
    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No recent activity</td></tr>';
      return;
    }
    tbody.innerHTML = transactions.slice(0, 20).map(t => {
      const time = t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const typeClass = t.type || 'unknown';
      const amountClass = ['buy', 'deposit'].includes(t.type) ? 'positive' : 'negative';
      return `
        <tr>
          <td class="activity-time">${time}</td>
          <td><span class="activity-type ${typeClass}">${t.type ? t.type.toUpperCase() : 'N/A'}</span></td>
          <td class="activity-asset">${t.symbol || '-'}</td>
          <td class="activity-details">${t.quantity ? `${t.quantity} @ ${this.formatCurrency(t.price || 0)}` : ''}</td>
          <td class="text-right activity-amount ${amountClass}">${this.formatCurrency(t.total || 0, true)}</td>
          <td><span class="activity-status ${t.status || 'completed'}">${t.status || 'completed'}</span></td>
        </tr>
      `;
    }).join('');
  }

  // Asset Selectors
  populateAssetSelectors() {
    const tradingSymbol = document.getElementById('tradingSymbol');
    const tradingName = document.getElementById('tradingName');
    if (!this.assets || this.assets.length === 0) return;
    
    const firstAsset = this.assets.find(a => a.type === 'stock') || this.assets[0];
    if (firstAsset) {
      this.currentAsset = firstAsset.symbol;
      this.currentAssetId = firstAsset.id;
      if (tradingSymbol) tradingSymbol.textContent = firstAsset.symbol;
      if (tradingName) tradingName.textContent = firstAsset.name;
      this.updateQuoteDisplay(firstAsset);
    }
  }

  switchAssetType(type) {
    document.querySelectorAll('#assetTypeTabs [data-type]').forEach(b => {
      b.classList.toggle('active', b.dataset.type === type);
      b.setAttribute('aria-selected', b.dataset.type === type);
    });
    const assetsOfType = this.assets.filter(a => a.type === type);
    if (assetsOfType.length > 0) {
      this.selectAsset(assetsOfType[0]);
    }
  }

  selectAsset(asset) {
    if (!asset) return;
    this.currentAsset = asset.symbol;
    this.currentAssetId = asset.id;
    const ts = document.getElementById('tradingSymbol');
    const tn = document.getElementById('tradingName');
    if (ts) ts.textContent = asset.symbol;
    if (tn) tn.textContent = asset.name;
    this.updateTradingChart();
    this.updateOrderBook();
    this.updateQuoteDisplay(asset);
    this.updateEstimatedTotal();
  }

  updateQuoteDisplay(asset) {
    if (!asset) return;
    const qPrice = document.getElementById('quotePrice');
    if (qPrice) qPrice.textContent = this.formatCurrency(asset.currentPrice || 0);

    const change24 = asset.change24h || 0;
    const changeClass = change24 >= 0 ? 'positive' : 'negative';
    const qChange = document.getElementById('quoteChange');
    if (qChange) {
      qChange.textContent = `${change24 >= 0 ? '+' : ''}${change24.toFixed(2)} (${change24.toFixed(2)}%)`;
      qChange.className = `quote-change ${changeClass}`;
    }

    const qBid = document.getElementById('quoteBid');
    if (qBid) qBid.textContent = this.formatCurrency(asset.bid || asset.currentPrice || 0);

    const qAsk = document.getElementById('quoteAsk');
    if (qAsk) qAsk.textContent = this.formatCurrency(asset.ask || asset.currentPrice || 0);

    const qSpread = document.getElementById('quoteSpread');
    if (qSpread) {
      const bid = asset.bid || asset.currentPrice || 0;
      const ask = asset.ask || asset.currentPrice || 0;
      qSpread.textContent = this.formatCurrency(Math.abs(ask - bid));
    }
  }

  // Trading Chart
  async updateTradingChart() {
    if (!this.currentAssetId) return;
    const chartTypeEl = document.getElementById('chartType');
    const type = chartTypeEl ? chartTypeEl.value : 'line';
    try {
      const res = await fetch(`/api/market/assets/${this.currentAssetId}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (window.chartManager && data.asset) {
        // Fallback chart rendering or line chart initialization
        const mockLabels = ['09:00', '10:00', '11:00', '12:00', '13:00'];
        const basePrice = data.asset.current_price || 100;
        const mockValues = [basePrice * 0.98, basePrice * 0.99, basePrice, basePrice * 1.01, basePrice * 1.02];
        window.chartManager.createLineChart('tradingChart', { labels: mockLabels, values: mockValues }, { type });
      }
    } catch (err) {
      console.error('Chart load error:', err);
    }
  }

  // Order Book
  async loadOrderBook() {
    if (!this.currentAssetId) return;
    try {
      const res = await fetch(`/api/market/orderbook/${this.currentAssetId}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.orderBook) {
        this.renderOrderBook(data.orderBook);
      }
    } catch (err) {
      console.error('Order book error:', err);
    }
  }

  renderOrderBook(data) {
    const asksContainer = document.getElementById('obAsks');
    const bidsContainer = document.getElementById('obBids');
    const spreadContainer = document.getElementById('obSpread');
    if (!asksContainer || !bidsContainer || !data) return;

    const bids = data.bids || [];
    const asks = data.asks || [];

    let askTotal = 0;
    asksContainer.innerHTML = [...asks].reverse().map(a => {
      askTotal += (a.size || a.quantity || 1);
      return `
        <div class="ob-row">
          <div class="ob-price">${this.formatCurrency(a.price || 0)}</div>
          <div class="ob-size">${this.formatQuantity(a.size || a.quantity || 0)}</div>
          <div class="ob-total">${this.formatQuantity(askTotal)}</div>
        </div>
      `;
    }).join('');

    let bidTotal = 0;
    bidsContainer.innerHTML = bids.map(b => {
      bidTotal += (b.size || b.quantity || 1);
      return `
        <div class="ob-row">
          <div class="ob-price">${this.formatCurrency(b.price || 0)}</div>
          <div class="ob-size">${this.formatQuantity(b.size || b.quantity || 0)}</div>
          <div class="ob-total">${this.formatQuantity(bidTotal)}</div>
        </div>
      `;
    }).join('');

    if (spreadContainer && asks.length > 0 && bids.length > 0) {
      const spread = (asks[0].price || 0) - (bids[0].price || 0);
      spreadContainer.innerHTML = `
        <div class="ob-row" style="background: rgba(255,255,255,0.05); font-weight: 600;">
          <div class="ob-price">SPREAD</div>
          <div class="ob-size">${this.formatCurrency(spread)}</div>
          <div class="ob-total">-</div>
        </div>
      `;
    }
  }

  startOrderBookUpdates() {
    this.orderBookUpdateTimer = setInterval(() => {
      if (this.currentAssetId) {
        this.loadOrderBook();
      }
    }, 2000);
  }

  updateOrderBook() {
    this.loadOrderBook();
  }

  // Order Form
  updateOrderForm() {
    const orderTypeEl = document.getElementById('orderType');
    const orderType = orderTypeEl ? orderTypeEl.value : 'market';
    
    const limitGroup = document.getElementById('limitPriceGroup');
    if (limitGroup) limitGroup.style.display = ['limit', 'stop_limit'].includes(orderType) ? 'block' : 'none';
    
    const stopGroup = document.getElementById('stopPriceGroup');
    if (stopGroup) stopGroup.style.display = ['stop', 'stop_limit'].includes(orderType) ? 'block' : 'none';
    
    this.updateEstimatedTotal();
  }

  switchOrderSide(side) {
    document.querySelectorAll('#orderSideTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.side === side);
      b.setAttribute('aria-selected', b.dataset.side === side);
    });
    
    const placeText = document.getElementById('placeOrderText');
    if (placeText) placeText.textContent = side === 'buy' ? 'Buy Market' : 'Sell Market';
    
    const btn = document.getElementById('placeOrderBtn');
    if (btn) {
      btn.classList.toggle('btn-buy', side === 'buy');
      btn.classList.toggle('btn-sell', side === 'sell');
    }
    this.updateEstimatedTotal();
  }

  setQuantityPercent(percent) {
    const cash = this.user?.virtualBalance || 10000;
    const asset = this.assets.find(a => a.id === this.currentAssetId || a.symbol === this.currentAsset);
    if (!asset) return;
    const currentPrice = asset.current_price || asset.currentPrice || 1;
    const maxQty = ((cash * percent) / 100) / currentPrice;
    
    const qtyInput = document.getElementById('quantity');
    if (qtyInput) qtyInput.value = maxQty.toFixed(4);
    this.updateEstimatedTotal();
  }

  updateEstimatedTotal() {
    const qtyInput = document.getElementById('quantity');
    const qty = qtyInput ? parseFloat(qtyInput.value) || 0 : 0;
    const asset = this.assets.find(a => a.id === this.currentAssetId || a.symbol === this.currentAsset);
    const tierConfig = this.getTierConfig();
    
    const estTotalEl = document.getElementById('estimatedTotal');
    const commInfoEl = document.getElementById('commissionInfo');
    const warningEl = document.getElementById('tierWarning');

    if (!asset || qty <= 0) {
      if (estTotalEl) estTotalEl.textContent = '$0.00';
      if (commInfoEl) commInfoEl.textContent = 'Commission: $0.00';
      return;
    }

    const price = asset.current_price || asset.currentPrice || 0;
    const total = price * qty;
    const commission = total * (tierConfig.commissionRate || 0.001);
    const grandTotal = total + commission;

    if (estTotalEl) estTotalEl.textContent = this.formatCurrency(grandTotal);
    if (commInfoEl) commInfoEl.textContent = `Commission: ${this.formatCurrency(commission)}`;

    const activeSideBtn = document.querySelector('#orderSideTabs .tab-btn.active');
    const side = activeSideBtn ? activeSideBtn.dataset.side : 'buy';
    
    if (warningEl) {
      if (side === 'buy' && grandTotal > (this.user?.virtualBalance || 0)) {
        warningEl.style.display = 'block';
        warningEl.textContent = `Insufficient funds. Available: ${this.formatCurrency(this.user?.virtualBalance || 0)}`;
      } else {
        warningEl.style.display = 'none';
      }
    }
  }

  getTierConfig() {
    const configs = {
      Bronze: { commissionRate: 0.0025 },
      Silver: { commissionRate: 0.0015 },
      Gold: { commissionRate: 0.0008 },
      VIP: { commissionRate: 0.0002 }
    };
    return configs[this.user?.tier] || configs.Bronze;
  }

  async placeOrder(e) {
    e.preventDefault();
    const activeSideBtn = document.querySelector('#orderSideTabs .tab-btn.active');
    const side = activeSideBtn ? activeSideBtn.dataset.side : 'buy';
    const assetId = this.currentAssetId;
    const qtyInput = document.getElementById('quantity');
    const quantity = qtyInput ? parseFloat(qtyInput.value) : 0;

    if (!assetId || !quantity || quantity <= 0) {
      this.showToast('Invalid order parameters', 'error');
      return;
    }

    const btn = document.getElementById('placeOrderBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Placing...';
    }

    try {
      const endpoint = side === 'buy' ? '/api/trading/buy' : '/api/trading/sell';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assetId, quantity })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Order execution failed');
      }

      this.showToast('Order executed successfully!', 'success');
      await this.loadDashboardData();
      if (qtyInput) qtyInput.value = '';
      this.updateEstimatedTotal();
    } catch (err) {
      console.error('Order error:', err);
      this.showToast(err.message || 'Order failed', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = side === 'buy' ? 'Buy Market' : 'Sell Market';
      }
    }
  }

  // Quick Trade Modal
  openQuickTrade(side) {
    const modal = document.getElementById('quickTradeModal');
    if (modal) modal.classList.add('active');
    const qtSide = document.getElementById('qtSide');
    if (qtSide) qtSide.value = side;
    const qtSymbol = document.getElementById('qtSymbol');
    if (qtSymbol) qtSymbol.value = this.currentAsset;
    const qtQuantity = document.getElementById('qtQuantity');
    if (qtQuantity) qtQuantity.value = '';
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  async searchSymbols(query) {
    if (!query || query.length < 1) return;
    const results = this.assets.filter(a =>
      (a.symbol && a.symbol.toLowerCase().includes(query.toLowerCase())) ||
      (a.name && a.name.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 10);
    
    const container = document.getElementById('qtSymbolResults');
    if (!container) return;

    if (results.length === 0) {
      container.classList.remove('active');
      return;
    }

    container.innerHTML = results.map(a => `
      <div class="symbol-result-item" data-symbol="${a.symbol}" data-id="${a.id}">
        <div class="symbol-result-main">
          <span class="symbol-result-symbol">${a.symbol}</span>
          <span class="symbol-result-name">${a.name}</span>
        </div>
        <span class="symbol-result-type">${a.type || 'stock'}</span>
      </div>
    `).join('');
    container.classList.add('active');

    container.querySelectorAll('.symbol-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const symbolInput = document.getElementById('qtSymbol');
        if (symbolInput) symbolInput.value = item.dataset.symbol;
        container.classList.remove('active');
      });
    });
  }

  async submitQuickTrade() {
    const symbolEl = document.getElementById('qtSymbol');
    const symbol = symbolEl ? symbolEl.value.toUpperCase() : '';
    const sideEl = document.getElementById('qtSide');
    const side = sideEl ? sideEl.value : 'buy';
    const qtyEl = document.getElementById('qtQuantity');
    const quantity = qtyEl ? parseFloat(qtyEl.value) : 0;

    const asset = this.assets.find(a => a.symbol === symbol);
    if (!asset) {
      this.showToast('Asset not found', 'error');
      return;
    }
    if (!quantity || quantity <= 0) {
      this.showToast('Invalid quantity', 'error');
      return;
    }

    try {
      const endpoint = side === 'buy' ? '/api/trading/buy' : '/api/trading/sell';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assetId: asset.id, quantity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quick trade failed');
      
      this.showToast('Quick trade executed successfully!', 'success');
      this.closeModal('quickTradeModal');
      await this.loadDashboardData();
    } catch (err) {
      console.error('Quick trade error:', err);
      this.showToast(err.message, 'error');
    }
  }

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/';
    }
  }

  updateMarketData(assets) {
    // Optional market grid sync handler
  }

  loadTradingDesk() {
    this.updateTradingChart();
    this.loadOrderBook();
  }

  loadPortfolioPage() { this.showToast('Portfolio overview active', 'info'); }
  loadMarketsPage() { this.showToast('Markets feed active', 'info'); }
  loadTransactionsPage() { this.showToast('Transactions history synced', 'info'); }
  loadTierPage() { this.showToast('Tier benefits overview active', 'info'); }

  startTickerDisplay() {
    setInterval(() => this.renderTicker(), 30000);
    this.renderTicker();
  }

  renderTicker() {
    const container = document.getElementById('tickerContent');
    if (!container) return;
    if (this.tickerMessages.length === 0) {
      container.innerHTML = '📈 Trading desk active • Live market environment • © 2026 Crainee';
      return;
    }
    container.innerHTML = this.tickerMessages.join(' • ') + ' • ';
  }

  formatCurrency(val, showSign = false) {
    const num = Number(val) || 0;
    const sign = num >= 0 && showSign ? '+' : '';
    return `${sign}$${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatQuantity(val) {
    return Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 });
  }

  formatNumber(val) {
    const num = Number(val) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icons[type] || 'ℹ'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Dismiss">&times;</button>
      </div>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    const dismiss = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    };
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 5000);
  }

  showSettingsModal() {
    this.showToast('Settings panel available via profile menu', 'info');
  }

  toggleChartFullscreen() {
    const chartCard = document.getElementById('tradingChart')?.closest('.card');
    if (!chartCard) return;
    chartCard.classList.toggle('fullscreen');
    document.body.style.overflow = chartCard.classList.contains('fullscreen') ? 'hidden' : '';
  }

  destroy() {
    if (this.orderBookUpdateTimer) clearInterval(this.orderBookUpdateTimer);
    this.unsubscribers.forEach(u => { if (typeof u === 'function') u(); });
    if (window.chartManager && typeof window.chartManager.destroyAll === 'function') {
      window.chartManager.destroyAll();
    }
  }
}

// Initialize dashboard safely on DOM content load
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardApp = new DashboardApp();
});

// Cleanup hook on unload
window.addEventListener('beforeunload', () => {
  if (window.dashboardApp) window.dashboardApp.destroy();
});

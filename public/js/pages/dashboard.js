// public/js/pages/dashboard.js - Dashboard page for crainee
export class Dashboard {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }
  
  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Portfolio Dashboard</h1>
          <p class="page-subtitle">Real-time overview of your institutional assets and positions</p>
        </div>
        <div class="page-actions">
          <a href="/trading" class="btn btn-primary" data-page="trading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            Open Trading Terminal
          </a>
        </div>
      </div>
      
      <!-- Stats Grid -->
      <div class="grid grid-4" id="dashboard-stats">
        <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
        <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
        <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
        <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
      </div>
      
      <!-- Main Content Grid -->
      <div class="grid grid-2" style="margin-top: 24px;">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Portfolio Allocation</h2>
          </div>
          <div class="card-content">
            <div id="portfolio-allocation" style="min-height: 240px; display: flex; align-items: center; justify-content: center; color: var(--gray-500);">
              Loading allocation data...
            </div>
          </div>
        </section>
        
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Active Positions</h2>
          </div>
          <div class="card-content" style="padding: 0;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Avg Price</th>
                    <th class="text-right">Current</th>
                    <th class="text-right">P&L</th>
                  </tr>
                </thead>
                <tbody id="positions-body">
                  <tr><td colspan="5" class="text-center" style="padding: 40px; color: var(--gray-500);">No active positions</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      
      <!-- Recent Transactions -->
      <section class="card" style="margin-top: 24px;">
        <div class="card-header">
          <h2 class="card-title">Recent Transactions</h2>
        </div>
        <div class="card-content" style="padding: 0;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Asset</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody id="dashboard-transactions-body">
                <tr><td colspan="6" class="text-center" style="padding: 40px; color: var(--gray-500);">Loading recent transactions...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }
  
  bindEvents() {
    if (!this.container) return;
    const tradingLink = this.container.querySelector('a[data-page="trading"]');
    if (tradingLink && window.dashboardApp && typeof window.dashboardApp.switchPage === 'function') {
      tradingLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.dashboardApp.switchPage('trading');
      });
    }
  }
  
  async onShow() {
    await this.loadDashboardData();
  }
  
  async loadDashboardData() {
    try {
      let overviewRes = null;
      try {
        const response = await fetch('/api/dashboard/overview', { credentials: 'include' });
        if (response.ok) {
          overviewRes = await response.json();
        }
      } catch (err) {
        console.warn('Network request for overview failed, falling back to API layer.', err);
      }

      let balance = 0;
      let tier = 'Bronze';
      let holdings = [];
      let totalValue = 0;
      let dayPnl = 0;
      let dayPnlPct = 0;
      let txns = [];

      if (overviewRes && overviewRes.portfolio) {
        balance = overviewRes.portfolio.cashBalance || 0;
        totalValue = overviewRes.portfolio.totalValue || balance;
        holdings = overviewRes.portfolio.holdings || [];
        dayPnl = overviewRes.portfolio.dayPnl || 0;
        dayPnlPct = overviewRes.portfolio.dayPnlPct || 0;
        txns = overviewRes.portfolio.recentTransactions || [];
      } else {
        try {
          const balanceRes = window.API?.getBalance ? await window.API.getBalance() : { balance: 0, tier: 'Bronze' };
          balance = balanceRes.balance || 0;
          tier = balanceRes.tier || 'Bronze';
          totalValue = balance;
        } catch (err) {
          console.warn('API fallback failed', err);
        }
      }

      if (overviewRes && overviewRes.tierInfo && overviewRes.tierInfo.tier) {
        tier = overviewRes.tierInfo.tier;
      }

      if (!this.container) return;

      const statsGrid = this.container.querySelector('#dashboard-stats');
      if (statsGrid) {
        statsGrid.innerHTML = `
          <article class="card stat-card">
            <div class="stat-label">Total Portfolio Value</div>
            <div class="stat-value mono">$${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="stat-change ${dayPnl >= 0 ? 'positive' : 'negative'}" style="font-size: 12px; margin-top: 4px;">
              ${dayPnl >= 0 ? '+' : ''}$${dayPnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${dayPnlPct >= 0 ? '+' : ''}${dayPnlPct.toFixed(2)}%)
            </div>
          </article>
          <article class="card stat-card">
            <div class="stat-label">Cash Liquidity</div>
            <div class="stat-value mono">$${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          </article>
          <article class="card stat-card">
            <div class="stat-label">Account Tier</div>
            <div class="stat-value"><span class="badge badge-${tier.toLowerCase()}">${tier}</span></div>
          </article>
          <article class="card stat-card">
            <div class="stat-label">Active Positions</div>
            <div class="stat-value mono">${holdings.length}</div>
          </article>
        `;
      }
      
      const allocationEl = this.container.querySelector('#portfolio-allocation');
      if (allocationEl) {
        const cashPct = totalValue > 0 ? ((balance / totalValue) * 100).toFixed(1) : 100;
        const investedPct = (100 - parseFloat(cashPct)).toFixed(1);
        const investedValue = totalValue - balance;

        allocationEl.innerHTML = `
          <div style="display: flex; flex-direction: column; width: 100%; gap: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
              <span>Cash Liquidity (${cashPct}%)</span>
              <span class="mono">$${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div style="width: 100%; height: 10px; background: var(--gray-200); border-radius: 5px; overflow: hidden; display: flex;">
              <div style="width: ${cashPct}%; height: 100%; background: var(--primary);"></div>
              <div style="width: ${investedPct}%; height: 100%; background: var(--accent, #10b981);"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
              <span>Invested Assets (${investedPct}%)</span>
              <span class="mono">$${investedValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        `;
      }

      // Render Positions Table
      const positionsBody = this.container.querySelector('#positions-body');
      if (positionsBody) {
        if (holdings.length === 0) {
          positionsBody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px; color: var(--gray-500);">No active positions</td></tr>';
        } else {
          positionsBody.innerHTML = holdings.map(h => {
            const currentPrice = h.currentPrice || h.current_price || 0;
            const avgPrice = h.avgBuyPrice || h.avg_price || 0;
            const qty = h.quantity || 0;
            const pnl = (currentPrice - avgPrice) * qty;
            const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
            return `
              <tr>
                <td>
                  <div style="font-weight: 600;">${h.symbol || 'ASSET'}</div>
                  <div style="font-size: 11px; color: var(--gray-500);">${h.name || ''}</div>
                </td>
                <td class="text-right mono">${qty.toLocaleString(undefined, {maximumFractionDigits: 4})}</td>
                <td class="text-right mono">$${avgPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right mono">$${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right mono ${pnl >= 0 ? 'positive text-success' : 'negative text-error'}">
                  ${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString(undefined, {minimumFractionDigits: 2})} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)
                </td>
              </tr>
            `;
          }).join('');
        }
      }
      
      const txnsBody = this.container.querySelector('#dashboard-transactions-body');
      if (txnsBody) {
        if (txns.length === 0 && window.API && typeof window.API.getTransactions === 'function') {
          try {
            const txnsResData = await window.API.getTransactions(10);
            txns = txnsResData.transactions || [];
          } catch (e) {
            // ignore fallback error
          }
        }

        if (txns.length === 0) {
          txnsBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px; color: var(--gray-500);">No recent transactions</td></tr>';
        } else {
          txnsBody.innerHTML = txns.slice(0, 10).map(t => {
            const timeStr = t.created_at ? new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--';
            const type = (t.type || 'TRADE').toUpperCase();
            const badgeClass = ['BUY', 'DEPOSIT'].includes(type) ? 'badge-success' : 'badge-error';
            return `
              <tr>
                <td>${timeStr}</td>
                <td><span class="badge ${badgeClass}">${type}</span></td>
                <td><strong>${t.symbol || 'N/A'}</strong></td>
                <td class="text-right mono">${t.quantity ? t.quantity.toLocaleString(undefined, {maximumFractionDigits: 8}) : '--'}</td>
                <td class="text-right mono">${t.price ? '$' + t.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '--'}</td>
                <td class="text-right mono">$${(t.total || t.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            `;
          }).join('');
        }
      }
      
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
      if (window.Toast && typeof window.Toast.error === 'function') {
        window.Toast.error('Failed to load portfolio data');
      }
    }
  }
}

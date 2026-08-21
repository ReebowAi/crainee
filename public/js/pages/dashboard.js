// public/js/pages/dashboard.js - Dashboard page for crainee
export class Dashboard {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Portfolio Dashboard</h1>
          <p class="page-subtitle">Real-time overview of your institutional assets and positions</p>
        </div>
        <div class="page-actions">
          <a href="/trading" class="btn btn-primary">
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
                    <th>Qty</th>
                    <th>Avg Price</th>
                    <th>Current</th>
                    <th>P&L</th>
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
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
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
    // Interactivity bindings for dashboard components
  }
  
  async onShow() {
    await this.loadDashboardData();
  }
  
  async loadDashboardData() {
    try {
      const [balanceRes, txnsRes] = await Promise.all([
        window.API.getBalance(),
        window.API.getTransactions(10)
      ]);
      
      const balance = balanceRes.balance || 0;
      const tier = balanceRes.tier || 'Bronze';
      
      const statsGrid = this.container.querySelector('#dashboard-stats');
      statsGrid.innerHTML = `
        <article class="card stat-card">
          <div class="stat-label">Total Balance</div>
          <div class="stat-value mono">$${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </article>
        <article class="card stat-card">
          <div class="stat-label">Account Tier</div>
          <div class="stat-value"><span class="badge badge-${tier.toLowerCase()}">${tier}</span></div>
        </article>
        <article class="card stat-card">
          <div class="stat-label">Total Volume</div>
          <div class="stat-value mono">$0.00</div>
        </article>
        <article class="card stat-card">
          <div class="stat-label">Active Orders</div>
          <div class="stat-value mono">0</div>
        </article>
      `;
      
      const allocationEl = this.container.querySelector('#portfolio-allocation');
      allocationEl.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; gap: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
            <span>Cash Liquidity</span>
            <span class="mono">100% ($${balance.toLocaleString(undefined, {minimumFractionDigits: 2})})</span>
          </div>
          <div style="width: 100%; height: 10px; background: var(--gray-200); border-radius: 5px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background: var(--primary);"></div>
          </div>
        </div>
      `;
      
      const txnsBody = this.container.querySelector('#dashboard-transactions-body');
      const txns = txnsRes.transactions || [];
      
      if (txns.length === 0) {
        txnsBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px; color: var(--gray-500);">No recent transactions</td></tr>';
        return;
      }
      
      txnsBody.innerHTML = txns.slice(0, 10).map(t => `
        <tr>
          <td>${new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</td>
          <td><span class="badge ${t.type === 'buy' ? 'badge-success' : 'badge-error'}">${t.type.toUpperCase()}</span></td>
          <td>${t.symbol || 'N/A'}</td>
          <td class="mono">${t.quantity ? t.quantity.toLocaleString(undefined, {maximumFractionDigits: 8}) : '--'}</td>
          <td class="mono">${t.price ? '$' + t.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '--'}</td>
          <td class="mono">$${(t.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('');
      
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
      window.Toast.error('Failed to load portfolio data');
    }
  }
}

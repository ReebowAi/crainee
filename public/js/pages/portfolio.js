// public/js/pages/portfolio.js - Portfolio page (Crainee Institutional)
export class Portfolio {
  constructor(container) {
    this.container = container;
    this.holdings = [];
    this.transactions = [];
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Portfolio</h1>
          <p class="page-subtitle">Track your holdings, performance & transaction history</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="refresh-portfolio">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15A9 9 0 1 1 18.5 4.5"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      <!-- Portfolio Summary -->
      <div class="grid grid-4" id="portfolio-summary">
        <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
        <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
        <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
        <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
      </div>
      
      <!-- Holdings Table -->
      <section class="card" style="margin-top: 24px;">
        <div class="card-header">
          <h2 class="card-title">Holdings</h2>
          <span class="badge badge-info" id="holdings-count">0 positions</span>
        </div>
        <div class="card-content" style="padding: 0;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Quantity</th>
                  <th>Avg Price</th>
                  <th>Current Price</th>
                  <th>Market Value</th>
                  <th>P/L</th>
                  <th>P/L %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="holdings-body">
                <tr><td colspan="8" class="text-center" style="padding: 60px; color: var(--gray-500);">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      <!-- Transaction History -->
      <section class="card" style="margin-top: 24px;">
        <div class="card-header">
          <h2 class="card-title">Transaction History</h2>
          <div style="display: flex; gap: 8px;">
            <select class="form-input form-select" id="txn-filter" style="width: auto; padding: 6px 32px 6px 12px; font-size: var(--text-xs);">
              <option value="all">All</option>
              <option value="buy">Buys</option>
              <option value="sell">Sells</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="withdrawal_blocked">Blocked</option>
            </select>
          </div>
        </div>
        <div class="card-content" style="padding: 0;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Asset</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="transactions-body">
                <tr><td colspan="7" class="text-center" style="padding: 60px; color: var(--gray-500);">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }
  
  bindEvents() {
    this.container.querySelector('#refresh-portfolio')?.addEventListener('click', () => this.loadPortfolio());
    
    this.container.querySelector('#txn-filter')?.addEventListener('change', (e) => {
      this.filterTransactions(e.target.value);
    });
  }
  
  async onShow() {
    await this.loadPortfolio();
  }
  
  async loadPortfolio() {
    try {
      const [balanceRes, holdingsRes, txnsRes] = await Promise.all([
        window.API.getBalance(),
        window.API.getHoldings(),
        window.API.getTransactions(200)
      ]);
      
      this.holdings = holdingsRes.holdings || [];
      this.transactions = txnsRes.transactions || [];
      
      this.updateSummary(balanceRes);
      this.renderHoldings();
      this.renderTransactions(this.transactions);
      
    } catch (e) {
      console.error('Portfolio load error:', e);
      window.Toast.error('Failed to load portfolio');
    }
  }
  
  updateSummary(balanceRes) {
    const balance = balanceRes.balance || 0;
    const tier = balanceRes.tier || 'Bronze';
    
    let holdingsValue = 0;
    let totalCost = 0;
    let totalPnl = 0;
    
    this.holdings.forEach(h => {
      const marketValue = h.current_price * h.quantity;
      const cost = h.avg_buy_price * h.quantity;
      holdingsValue += marketValue;
      totalCost += cost;
      totalPnl += marketValue - cost;
    });
    
    const totalValue = balance + holdingsValue;
    const totalReturnPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    
    const summaryGrid = this.container.querySelector('#portfolio-summary');
    summaryGrid.innerHTML = `
      <article class="card stat-card">
        <div class="stat-label">Total Portfolio</div>
        <div class="stat-value">$${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        <div class="stat-change ${totalPnl >= 0 ? 'positive' : 'negative'}">
          ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString(undefined, {minimumFractionDigits: 2})} (${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%)
        </div>
      </article>
      <article class="card stat-card">
        <div class="stat-label">Cash Balance</div>
        <div class="stat-value">$${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        <div class="stat-label">Available to trade</div>
      </article>
      <article class="card stat-card">
        <div class="stat-label">Holdings Value</div>
        <div class="stat-value">$${holdingsValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        <div class="stat-label">${this.holdings.length} positions</div>
      </article>
      <article class="card stat-card">
        <div class="stat-label">Tier</div>
        <div class="stat-value">
          <span class="badge badge-${tier.toLowerCase()}" style="font-size: var(--text-base); padding: 6px 16px;">${tier}</span>
        </div>
        <div class="stat-label">Withdrawal limits apply</div>
      </article>
    `;
  }
  
  renderHoldings() {
    const tbody = this.container.querySelector('#holdings-body');
    const countEl = this.container.querySelector('#holdings-count');
    
    countEl.textContent = `${this.holdings.length} position${this.holdings.length !== 1 ? 's' : ''}`;
    
    if (!this.holdings.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="padding: 60px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--gray-300); margin-bottom: 16px;">
              <path d="M21 12V7H5V21H17A5 5 0 0 0 21 12Z"></path>
            </svg>
            <p style="color: var(--gray-500);">No holdings yet</p>
            <button class="btn btn-primary mt-4" onclick="window.App.router.navigate('/markets')">Browse Markets</button>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = this.holdings.map(h => {
      const marketValue = h.current_price * h.quantity;
      const cost = h.avg_buy_price * h.quantity;
      const pnl = marketValue - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      const isPositive = pnl >= 0;
      
      return `
        <tr data-asset-id="${h.asset_id}">
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge badge-gray">${h.symbol}</span>
              <div>
                <div style="font-weight: 500;">${h.name}</div>
                <div style="font-size: var(--text-xs); color: var(--gray-500);">${h.type}</div>
              </div>
            </div>
          </td>
          <td class="mono">${h.quantity.toLocaleString(undefined, {maximumFractionDigits: 8})}</td>
          <td class="mono">$${h.avg_buy_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td class="mono">$${h.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td class="mono" style="font-weight: 600;">$${marketValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td class="mono ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}$${pnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td class="${isPositive ? 'positive' : 'negative'}" style="font-weight: 600;">${isPositive ? '+' : ''}${pnlPct.toFixed(2)}%</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.App.router.navigate('/trading?asset=${h.asset_id}')">Trade</button>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  renderTransactions(transactions) {
    const tbody = this.container.querySelector('#transactions-body');
    
    if (!transactions.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 60px; color: var(--gray-500);">No transactions yet</td></tr>';
      return;
    }
    
    tbody.innerHTML = transactions.map(txn => {
      const isBlocked = txn.status === 'blocked';
      const isBuy = txn.type === 'buy';
      const isSell = txn.type === 'sell';
      const isWithdrawal = txn.type === 'withdrawal';
      const isDeposit = txn.type === 'deposit';
      
      let badgeClass = 'badge-info';
      if (isBuy) badgeClass = 'badge-success';
      else if (isSell) badgeClass = 'badge-error';
      else if (isWithdrawal) badgeClass = 'badge-warning';
      else if (isDeposit) badgeClass = 'badge-info';
      else if (isBlocked) badgeClass = 'badge-error';
      
      return `
        <tr style="${isBlocked ? 'background: var(--error-bg);' : ''}">
          <td>${this.formatDate(txn.created_at)}</td>
          <td>
            <span class="badge ${badgeClass}">${txn.type.toUpperCase()}${isBlocked ? ' (BLOCKED)' : ''}</span>
          </td>
          <td>${txn.symbol || 'N/A'}</td>
          <td class="mono">${txn.quantity ? txn.quantity.toLocaleString(undefined, {maximumFractionDigits: 8}) : '--'}</td>
          <td class="mono">${txn.price ? '$' + txn.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '--'}</td>
          <td class="mono ${isBuy || isDeposit ? 'positive' : isBlocked ? '' : 'negative'}">
            ${isBuy || isDeposit ? '+' : isBlocked ? '' : '-'}$${(txn.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td>
            <span class="badge ${isBlocked ? 'badge-error' : 'badge-success'}">${txn.status}</span>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  filterTransactions(filter) {
    let filtered = this.transactions;
    if (filter !== 'all') {
      filtered = this.transactions.filter(t => t.type === filter);
    }
    this.renderTransactions(filtered);
  }
  
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }
}

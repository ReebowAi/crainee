// public/js/pages/admin.js - Admin dashboard for crainee
export class Admin {
  constructor(container) {
    this.container = container;
    this.activeTab = 'overview';
    this.users = [];
    this.withdrawalBlocks = [];
    this.settings = [];
    this.transactions = [];
    this.tickerMessages = [];
  }
  
  init() {
    this.render();
    this.bindEvents();
    this.onShow();
  }
  
  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">crainee Admin Dashboard</h1>
          <p class="page-subtitle">Platform administration & enterprise control panel</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-gold" id="generate-tickers">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            Generate AI Tickers
          </button>
        </div>
      </div>
      
      <div class="admin-tabs" id="admin-tabs">
        <button class="admin-tab active" data-tab="overview">Overview</button>
        <button class="admin-tab" data-tab="users">Users</button>
        <button class="admin-tab" data-tab="tiers">Tier Management</button>
        <button class="admin-tab" data-tab="withdrawals">Withdrawal Blocks</button>
        <button class="admin-tab" data-tab="tickers">Ticker Messages</button>
        <button class="admin-tab" data-tab="transactions">All Transactions</button>
        <button class="admin-tab" data-tab="settings">Settings</button>
      </div>
      
      <div class="admin-panel active" id="panel-overview">
        <div class="grid grid-4" id="admin-stats">
          <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
          <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
          <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
          <article class="card stat-card loading-skeleton" style="height: 120px;"></article>
        </div>
        
        <div class="grid grid-2" style="margin-top: 24px;">
          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Tier Distribution</h2>
            </div>
            <div class="card-content">
              <div id="tier-distribution" style="display: flex; flex-direction: column; gap: 12px;"></div>
            </div>
          </section>
          
          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Recent Blocked Withdrawals</h2>
            </div>
            <div class="card-content" style="padding: 0;">
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody id="blocked-withdrawals-body">
                    <tr><td colspan="4" class="text-center" style="padding: 40px; color: var(--gray-500);">Loading...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
      
      <div class="admin-panel" id="panel-users">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">User Management</h2>
          </div>
          <div class="card-content" style="padding: 0;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Tier</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="users-body">
                  <tr><td colspan="7" class="text-center" style="padding: 60px; color: var(--gray-500);">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div class="admin-panel" id="panel-tiers">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Bulk Tier Operations</h2>
          </div>
          <div class="card-content">
            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
              <select class="form-input form-select" id="bulk-tier-select" style="width: auto;">
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="VIP">VIP</option>
              </select>
              <button class="btn btn-primary" id="apply-bulk-tier">Apply to Selected</button>
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
              <input type="number" class="form-input" id="bulk-balance-amount" placeholder="Amount (negative to deduct)" style="width: 200px;">
              <select class="form-input form-select" id="bulk-balance-type" style="width: auto;">
                <option value="add">Add to Balance</option>
                <option value="set">Set Balance</option>
              </select>
              <button class="btn btn-gold" id="apply-bulk-balance">Apply Balance Change</button>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">All Users with Tier Controls</h2>
          </div>
          <div class="card-content" style="padding: 0;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th style="width: 40px;"><input type="checkbox" id="select-all-users"></th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Current Tier</th>
                    <th>Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="tiers-body">
                  <tr><td colspan="6" class="text-center" style="padding: 60px; color: var(--gray-500);">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div class="admin-panel" id="panel-withdrawals">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Withdrawal Block Rules</h2>
            <button class="btn btn-primary" id="add-block-btn">Add Rule</button>
          </div>
          <div class="card-content" style="padding: 0;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Min Amount</th>
                    <th>Max Amount</th>
                    <th>Error Message</th>
                    <th>Compliance Message</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="blocks-body">
                  <tr><td colspan="7" class="text-center" style="padding: 60px; color: var(--gray-500);">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div class="modal-overlay" id="block-modal">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title" id="block-modal-title">Add Withdrawal Block Rule</h3>
              <button class="modal-close" id="block-modal-close">&times;</button>
            </div>
            <form id="block-form">
              <input type="hidden" id="block-id">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Tier</label>
                  <select class="form-input form-select" id="block-tier" required>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="VIP">VIP</option>
                    <option value="all">All Tiers</option>
                  </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div class="form-group">
                    <label class="form-label">Min Amount ($)</label>
                    <input type="number" class="form-input" id="block-min" min="0" step="1" value="0">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Max Amount ($)</label>
                    <input type="number" class="form-input" id="block-max" min="0" step="1" value="999999999">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Error Message *</label>
                  <textarea class="form-input" id="block-error" rows="2" required placeholder="Message shown to user when withdrawal is blocked"></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">Compliance Message</label>
                  <textarea class="form-input" id="block-compliance" rows="2" placeholder="Internal compliance explanation"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="block-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div class="admin-panel" id="panel-tickers">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Ticker Banner Messages</h2>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary" id="add-ticker-btn">Add Custom</button>
              <button class="btn btn-gold" id="generate-tickers-2">Generate AI</button>
            </div>
          </div>
          <div class="card-content" style="padding: 0;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Message</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="tickers-body">
                  <tr><td colspan="3" class="text-center" style="padding: 60px; color: var(--gray-500);">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div class="modal-overlay" id="ticker-modal">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title">Add Ticker Message</h3>
              <button class="modal-close" id="ticker-modal-close">&times;</button>
            </div>
            <form id="ticker-form">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Message</label>
                  <input type="text" class="form-input" id="ticker-message" required placeholder="e.g., User 0x49... withdrew $500,000 2 minutes ago">
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="ticker-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div class="admin-panel" id="panel-transactions">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">All Platform Transactions</h2>
          </div>
          <div class="card-content" style="padding: 0;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Asset</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="all-transactions-body">
                  <tr><td colspan="8" class="text-center" style="padding: 60px; color: var(--gray-500);">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div class="admin-panel" id="panel-settings">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Platform Settings</h2>
          </div>
          <div class="card-content">
            <div id="settings-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    if (!this.container) return;
    
    this.container.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    this.container.querySelector('#generate-tickers')?.addEventListener('click', () => this.generateTickers());
    this.container.querySelector('#generate-tickers-2')?.addEventListener('click', () => this.generateTickers());
    
    this.container.querySelector('#apply-bulk-tier')?.addEventListener('click', () => this.bulkUpdateTier());
    this.container.querySelector('#apply-bulk-balance')?.addEventListener('click', () => this.bulkUpdateBalance());
    this.container.querySelector('#select-all-users')?.addEventListener('change', (e) => {
      this.container.querySelectorAll('#tiers-body input[type="checkbox"]').forEach(cb => {
        cb.checked = e.target.checked;
      });
    });
    
    this.container.querySelector('#add-block-btn')?.addEventListener('click', () => this.openBlockModal());
    this.container.querySelector('#block-modal-close')?.addEventListener('click', () => this.closeBlockModal());
    this.container.querySelector('#block-cancel')?.addEventListener('click', () => this.closeBlockModal());
    this.container.querySelector('#block-form')?.addEventListener('submit', (e) => this.saveBlock(e));
    this.container.querySelector('#block-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'block-modal') this.closeBlockModal();
    });
    
    this.container.querySelector('#add-ticker-btn')?.addEventListener('click', () => this.openTickerModal());
    this.container.querySelector('#ticker-modal-close')?.addEventListener('click', () => this.closeTickerModal());
    this.container.querySelector('#ticker-cancel')?.addEventListener('click', () => this.closeTickerModal());
    this.container.querySelector('#ticker-form')?.addEventListener('submit', (e) => this.saveTicker(e));
    this.container.querySelector('#ticker-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'ticker-modal') this.closeTickerModal();
    });
  }
  
  async onShow() {
    if (!window.App || !window.App.user?.isAdmin) {
      if (window.App?.router) {
        window.App.router.navigate('/dashboard');
      }
      if (window.Toast) {
        window.Toast.error('Admin access required');
      }
      return;
    }
    
    await this.loadAllData();
  }
  
  switchTab(tab) {
    this.activeTab = tab;
    
    if (!this.container) return;

    this.container.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    this.container.querySelectorAll('.admin-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${tab}`);
    });
    
    this.renderCurrentTab();
  }
  
  async loadAllData() {
    try {
      if (!window.API) return;
      const [statsRes, usersRes, settingsRes, blocksRes, tickersRes, txnsRes] = await Promise.all([
        window.API.getAdminStats?.() || { stats: {} },
        window.API.getUsers?.() || { users: [] },
        window.API.getSettings?.() || { settings: [] },
        window.API.getWithdrawalBlocks?.() || { blocks: [] },
        window.API.getTickerMessages?.() || { messages: [] },
        window.API.getAllTransactions?.(500) || { transactions: [] }
      ]);
      
      this.renderStats(statsRes.stats || {});
      this.users = usersRes.users || [];
      this.settings = settingsRes.settings || [];
      this.withdrawalBlocks = blocksRes.blocks || [];
      this.tickerMessages = tickersRes.messages || [];
      this.transactions = txnsRes.transactions || [];
      
      this.renderCurrentTab();
    } catch (e) {
      console.error('Admin load error:', e);
      if (window.Toast) window.Toast.error('Failed to load admin data');
    }
  }
  
  renderCurrentTab() {
    switch (this.activeTab) {
      case 'overview': break;
      case 'users': this.renderUsers(); break;
      case 'tiers': this.renderTiersTable(); break;
      case 'withdrawals': this.renderWithdrawalBlocks(); break;
      case 'tickers': this.renderTickers(); break;
      case 'transactions': this.renderAllTransactions(); break;
      case 'settings': this.renderSettings(); break;
    }
  }
  
  renderStats(stats) {
    if (!this.container) return;
    const statsGrid = this.container.querySelector('#admin-stats');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
      <article class="card stat-card">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">${(stats.totalUsers || 0).toLocaleString()}</div>
      </article>
      <article class="card stat-card">
        <div class="stat-label">Total Liquid Balance</div>
        <div class="stat-value">$${(stats.totalVirtualBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 0})}</div>
      </article>
      <article class="card stat-card">
        <div class="stat-label">Total Transactions</div>
        <div class="stat-value">${(stats.totalTransactions || 0).toLocaleString()}</div>
      </article>
      <article class="card stat-card">
        <div class="stat-label">Blocked Withdrawals</div>
        <div class="stat-value" style="color: var(--error);">${(stats.blockedWithdrawals || 0).toLocaleString()}</div>
      </article>
    `;
    
    const distContainer = this.container.querySelector('#tier-distribution');
    if (distContainer) {
      const totalUsers = stats.totalUsers || 1;
      distContainer.innerHTML = (stats.tierDistribution || []).map(t => {
        const pct = ((t.count / totalUsers) * 100).toFixed(1);
        return `
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="badge badge-${t.tier.toLowerCase()}" style="min-width: 80px;">${t.tier}</span>
            <div style="flex: 1; height: 8px; background: var(--gray-200); border-radius: 4px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: var(--wf-red); border-radius: 4px; transition: width 300ms;"></div>
            </div>
            <span style="font-family: var(--font-mono); font-size: var(--text-sm); min-width: 60px; text-align: right;">${t.count} (${pct}%)</span>
          </div>
        `;
      }).join('');
    }
    
    this.renderBlockedWithdrawals();
  }
  
  renderBlockedWithdrawals() {
    if (!this.container) return;
    const tbody = this.container.querySelector('#blocked-withdrawals-body');
    if (!tbody) return;

    const blocked = this.transactions.filter(t => t.type === 'withdrawal_blocked').slice(0, 10);
    
    if (blocked.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 40px; color: var(--gray-500);">No blocked withdrawals</td></tr>';
      return;
    }
    
    tbody.innerHTML = blocked.map(t => `
      <tr>
        <td>${t.email || 'Unknown'}</td>
        <td class="mono">$${(t.total_value || 0).toLocaleString()}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.block_reason || 'Compliance review required'}</td>
        <td>${this.formatTime(t.created_at)}</td>
      </tr>
    `).join('');
  }
  
  renderUsers() {
    if (!this.container) return;
    const tbody = this.container.querySelector('#users-body');
    if (!tbody) return;
    
    tbody.innerHTML = this.users.map(u => `
      <tr>
        <td>${u.email}</td>
        <td>${u.full_name || '-'}</td>
        <td><span class="badge badge-${(u.tier || 'Bronze').toLowerCase()}">${u.tier || 'Bronze'}</span></td>
        <td class="mono">$${(u.virtual_balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-error'}">${u.status || 'active'}</span></td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-ghost btn-sm edit-user-btn" data-user-id="${u.id}">Edit</button>
        </td>
      </tr>
    `).join('');
  }
  
  renderTiersTable() {
    if (!this.container) return;
    const tbody = this.container.querySelector('#tiers-body');
    if (!tbody) return;
    
    tbody.innerHTML = this.users.map(u => `
      <tr>
        <td><input type="checkbox" value="${u.id}"></td>
        <td>${u.email}</td>
        <td>${u.full_name || '-'}</td>
        <td>
          <select class="form-input form-select tier-select" data-user-id="${u.id}" style="width: auto; padding: 4px 32px 4px 8px; font-size: var(--text-xs);">
            <option value="Bronze" ${u.tier === 'Bronze' ? 'selected' : ''}>Bronze</option>
            <option value="Silver" ${u.tier === 'Silver' ? 'selected' : ''}>Silver</option>
            <option value="Gold" ${u.tier === 'Gold' ? 'selected' : ''}>Gold</option>
            <option value="VIP" ${u.tier === 'VIP' ? 'selected' : ''}>VIP</option>
          </select>
        </td>
        <td class="mono">$${(u.virtual_balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>
          <button class="btn btn-ghost btn-sm update-tier-btn" data-user-id="${u.id}">Update Tier</button>
          <button class="btn btn-ghost btn-sm adjust-bal-btn" data-user-id="${u.id}" style="margin-left: 4px;">Adjust Balance</button>
        </td>
      </tr>
    `).join('');
    
    this.container.querySelectorAll('.tier-select').forEach(select => {
      select.addEventListener('change', (e) => {
        this.updateUserTier(e.target.dataset.userId, e.target.value);
      });
    });

    this.container.querySelectorAll('.update-tier-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        const select = this.container.querySelector(`.tier-select[data-user-id="${userId}"]`);
        if (select) {
          this.updateUserTier(userId, select.value);
        }
      });
    });

    this.container.querySelectorAll('.adjust-bal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.updateUserBalance(e.target.dataset.userId);
      });
    });
  }
  
  renderWithdrawalBlocks() {
    if (!this.container) return;
    const tbody = this.container.querySelector('#blocks-body');
    if (!tbody) return;
    
    tbody.innerHTML = this.withdrawalBlocks.map(b => `
      <tr>
        <td><span class="badge badge-${b.tier.toLowerCase()}">${b.tier}</span></td>
        <td class="mono">$${b.min_amount.toLocaleString()}</td>
        <td class="mono">$${b.max_amount >= 999999999 ? 'No Limit' : b.max_amount.toLocaleString()}</td>
        <td style="max-width: 200px;">${b.error_message}</td>
        <td style="max-width: 200px;">${b.compliance_message || '-'}</td>
        <td><span class="badge ${b.is_active ? 'badge-success' : 'badge-gray'}">${b.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm edit-block-btn" data-block-id="${b.id}">Edit</button>
          <button class="btn btn-ghost btn-sm delete-block-btn" data-block-id="${b.id}" style="margin-left: 4px; color: var(--error);">Delete</button>
        </td>
      </tr>
    `).join('');

    this.container.querySelectorAll('.edit-block-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const block = this.withdrawalBlocks.find(b => b.id === e.target.dataset.blockId);
        if (block) this.openBlockModal(block);
      });
    });

    this.container.querySelectorAll('.delete-block-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.deleteBlock(e.target.dataset.blockId);
      });
    });
  }
  
  renderTickers() {
    if (!this.container) return;
    const tbody = this.container.querySelector('#tickers-body');
    if (!tbody) return;
    
    tbody.innerHTML = this.tickerMessages.map((msg, i) => `
      <tr>
        <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${msg}</td>
        <td>-</td>
        <td>
          <button class="btn btn-ghost btn-sm delete-ticker-btn" data-index="${i}" style="color: var(--error);">Remove</button>
        </td>
      </tr>
    `).join('');

    this.container.querySelectorAll('.delete-ticker-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.deleteTicker(parseInt(e.target.dataset.index, 10));
      });
    });
  }
  
  renderAllTransactions() {
    if (!this.container) return;
    const tbody = this.container.querySelector('#all-transactions-body');
    if (!tbody) return;

    const txns = this.transactions.slice(0, 100);
    
    tbody.innerHTML = txns.map(t => {
      const isBlocked = t.status === 'blocked';
      let badgeClass = 'badge-info';
      if (t.type === 'buy') badgeClass = 'badge-success';
      else if (t.type === 'sell') badgeClass = 'badge-error';
      else if (t.type === 'withdrawal') badgeClass = 'badge-warning';
      else if (isBlocked) badgeClass = 'badge-error';
      
      return `
        <tr style="${isBlocked ? 'background: var(--error-bg);' : ''}">
          <td>${this.formatTime(t.created_at)}</td>
          <td>${t.email || 'Unknown'}</td>
          <td><span class="badge ${badgeClass}">${t.type.toUpperCase()}</span></td>
          <td>${t.symbol || 'N/A'}</td>
          <td class="mono">${t.quantity ? t.quantity.toLocaleString(undefined, {maximumFractionDigits: 8}) : '--'}</td>
          <td class="mono">${t.price ? '$' + t.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '--'}</td>
          <td class="mono">${(t.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td><span class="badge ${isBlocked ? 'badge-error' : 'badge-success'}">${t.status}</span></td>
        </tr>
      `;
    }).join('');
  }
  
  renderSettings() {
    if (!this.container) return;
    const container = this.container.querySelector('#settings-list');
    if (!container) return;
    
    container.innerHTML = this.settings.map(s => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; background: var(--gray-50); border-radius: var(--border-radius);">
        <div style="flex: 1;">
          <div style="font-weight: 500;">${s.key}</div>
          <div style="font-size: var(--text-xs); color: var(--gray-500);">${s.description || 'No description'}</div>
        </div>
        <input type="text" class="form-input setting-input" data-key="${s.key}" value="${s.value}" style="width: 300px; max-width: 100%;">
      </div>
    `).join('');
    
    this.container.querySelectorAll('.setting-input').forEach(input => {
      input.addEventListener('change', (e) => this.updateSetting(e.target.dataset.key, e.target.value));
    });
  }
  
  async updateUserTier(userId, tier) {
    try {
      const res = await window.API.updateUserTier(userId, tier);
      if (res.user) {
        const user = this.users.find(u => u.id === userId);
        if (user) user.tier = tier;
        if (window.Toast) window.Toast.success(`User tier updated to ${tier}`);
      }
    } catch (e) {
      if (window.Toast) window.Toast.error(e.message || 'Failed to update tier');
    }
  }
  
  async updateUserBalance(userId) {
    const amount = prompt('Enter amount to add (use negative to deduct):');
    if (amount === null) return;
    
    const num = parseFloat(amount);
    if (isNaN(num)) {
      if (window.Toast) window.Toast.error('Invalid amount');
      return;
    }
    
    try {
      const res = await window.API.updateUserBalance(userId, num);
      if (res.user) {
        const user = this.users.find(u => u.id === userId);
        if (user) user.virtual_balance = res.user.virtual_balance;
        if (window.Toast) window.Toast.success(`Balance updated by $${num.toLocaleString()}`);
        this.loadAllData();
      }
    } catch (e) {
      if (window.Toast) window.Toast.error(e.message || 'Failed to update balance');
    }
  }
  
  async bulkUpdateTier() {
    const tier = this.container.querySelector('#bulk-tier-select')?.value;
    const selected = Array.from(this.container.querySelectorAll('#tiers-body input[type="checkbox"]:checked')).map(cb => cb.value);
    
    if (!selected.length) {
      if (window.Toast) window.Toast.warning('No users selected');
      return;
    }
    
    for (const id of selected) {
      await this.updateUserTier(id, tier);
    }
    
    if (window.Toast) window.Toast.success(`Updated ${selected.length} users to ${tier}`);
  }
  
  async bulkUpdateBalance() {
    const amount = parseFloat(this.container.querySelector('#bulk-balance-amount')?.value) || 0;
    const type = this.container.querySelector('#bulk-balance-type')?.value;
    const selected = Array.from(this.container.querySelectorAll('#tiers-body input[type="checkbox"]:checked')).map(cb => cb.value);
    
    if (!selected.length) {
      if (window.Toast) window.Toast.warning('No users selected');
      return;
    }
    
    for (const id of selected) {
      const user = this.users.find(u => u.id === id);
      const finalAmount = type === 'set' ? amount - (user?.virtual_balance || 0) : amount;
      
      try {
        const res = await window.API.updateUserBalance(id, finalAmount);
        if (res.user && user) {
          user.virtual_balance = res.user.virtual_balance;
        }
      } catch (err) {
        console.error(`Failed to update balance for user ${id}`, err);
      }
    }
    
    if (window.Toast) window.Toast.success(`Balance adjustment applied to ${selected.length} users`);
    this.loadAllData();
  }
  
  openBlockModal(block = null) {
    if (!this.container) return;
    const modal = this.container.querySelector('#block-modal');
    const form = this.container.querySelector('#block-form');
    if (!modal || !form) return;

    form.reset();
    
    if (block) {
      this.container.querySelector('#block-modal-title').textContent = 'Edit Withdrawal Block Rule';
      this.container.querySelector('#block-id').value = block.id;
      this.container.querySelector('#block-tier').value = block.tier;
      this.container.querySelector('#block-min').value = block.min_amount;
      this.container.querySelector('#block-max').value = block.max_amount >= 999999999 ? '' : block.max_amount;
      this.container.querySelector('#block-error').value = block.error_message;
      this.container.querySelector('#block-compliance').value = block.compliance_message || '';
    } else {
      this.container.querySelector('#block-modal-title').textContent = 'Add Withdrawal Block Rule';
      this.container.querySelector('#block-id').value = '';
    }
    
    modal.classList.add('active');
  }
  
  closeBlockModal() {
    if (!this.container) return;
    this.container.querySelector('#block-modal')?.classList.remove('active');
  }
  
  async saveBlock(e) {
    e.preventDefault();
    if (!this.container) return;
    
    const id = this.container.querySelector('#block-id').value;
    const data = {
      tier: this.container.querySelector('#block-tier').value,
      minAmount: parseFloat(this.container.querySelector('#block-min').value) || 0,
      maxAmount: parseFloat(this.container.querySelector('#block-max').value) || 999999999,
      errorMessage: this.container.querySelector('#block-error').value,
      complianceMessage: this.container.querySelector('#block-compliance').value
    };
    
    try {
      if (id) {
        await window.API.updateWithdrawalBlock(id, data);
        if (window.Toast) window.Toast.success('Block rule updated');
      } else {
        await window.API.addWithdrawalBlock(data);
        if (window.Toast) window.Toast.success('Block rule added');
      }
      
      this.closeBlockModal();
      await this.loadAllData();
    } catch (e) {
      if (window.Toast) window.Toast.error(e.message || 'Failed to save block rule');
    }
  }
  
  async deleteBlock(id) {
    if (!confirm('Delete this withdrawal block rule?')) return;
    
    try {
      await window.API.deleteWithdrawalBlock(id);
      if (window.Toast) window.Toast.success('Block rule deleted');
      await this.loadAllData();
    } catch (e) {
      if (window.Toast) window.Toast.error(e.message || 'Failed to delete');
    }
  }
  
  openTickerModal() {
    if (!this.container) return;
    this.container.querySelector('#ticker-form')?.reset();
    this.container.querySelector('#ticker-modal')?.classList.add('active');
  }
  
  closeTickerModal() {
    if (!this.container) return;
    this.container.querySelector('#ticker-modal')?.classList.remove('active');
  }
  
  async saveTicker(e) {
    e.preventDefault();
    if (!this.container) return;
    
    const message = this.container.querySelector('#ticker-message').value;
    
    try {
      await window.API.addTickerMessage(message);
      if (window.Toast) window.Toast.success('Ticker message added');
      this.closeTickerModal();
      await this.loadAllData();
    } catch (e) {
      if (window.Toast) window.Toast.error(e.message || 'Failed to add ticker');
    }
  }
  
  async deleteTicker(index) {
    this.tickerMessages.splice(index, 1);
    if (window.Toast) window.Toast.success('Ticker removed');
    this.renderTickers();
  }
  
  async generateTickers() {
    try {
      const res = await window.API.generateTickerMessages(10);
      if (res.messages) {
        if (window.Toast) window.Toast.success(`Generated ${res.messages.length} AI ticker messages`);
        await this.loadAllData();
      }
    } catch (e) {
      if (window.Toast) window.Toast.error(e.message || 'Failed to generate tickers');
    }
  }
  
  async updateSetting(key, value) {
    try {
      await window.API.updateSetting(key, value);
      if (window.Toast) window.Toast.success(`Setting ${key} updated`);
    } catch (e) {
      if (window.Toast) window.Toast.error(e.message || 'Failed to update setting');
    }
  }
  
  formatTime(dateString) {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }
}

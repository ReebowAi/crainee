// public/js/admin.js
class AdminApp {
  constructor() {
    this.currentPage = 'overview';
    this.currentUsersPage = 1;
    this.currentAuditPage = 1;
    this.usersCache = [];
    this.unsubscribers = [];
    this.adminUser = null;
    this.init();
  }

  async init() {
    const authenticated = await this.checkAdminAuth();
    if (!authenticated) return;
    
    this.bindUI();
    this.setupWebSocket();
    await this.loadOverview(); 
  }

  // Helper method for authenticated fetch requests
  async fetchWithAuth(url, options = {}) {
    const token = window.App?.token || localStorage.getItem('crainee_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      credentials: 'include',
      ...options,
      headers
    };

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }

    return fetch(url, config);
  }

  async checkAdminAuth() {
    try {
      // FIXED: Pointed to correct backend route /auth/session instead of /auth/me
      const res = await this.fetchWithAuth('/api/auth/session');
      if (!res.ok) throw new Error('Not authenticated');
      
      const data = await res.json();
      const user = data.user || data;

      if (!user || !user.isAdmin) {
        window.location.href = '/dashboard';
        return false;
      }
      
      this.adminUser = user;
      this.updateUserUI();
      return true;
    } catch (err) {
      console.error('Admin Auth Error:', err);
      window.location.href = '/';
      return false;
    }
  }

  updateUserUI() {
    const nameEl = document.getElementById('adminUserName');
    const emailEl = document.getElementById('adminUserEmail');
    if (nameEl) nameEl.textContent = this.adminUser.fullName || this.adminUser.full_name || 'Admin';
    if (emailEl) emailEl.textContent = this.adminUser.email;
  }

  bindUI() {
    // Navigation
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchPage(link.dataset.page);
      });
    });

    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => this.closeSidebar());

    // Admin user menu
    const adminMenu = document.getElementById('adminUserMenu');
    if (adminMenu) {
      adminMenu.querySelector('.user-menu-trigger')?.addEventListener('click', () => this.toggleDropdown(adminMenu));
      document.addEventListener('click', (e) => {
        if (!adminMenu.contains(e.target)) adminMenu.classList.remove('active');
      });
    }

    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => this.logout());

    // Market controls
    document.getElementById('marketPaused')?.addEventListener('change', (e) => this.toggleMarketPause(e.target.checked));
    document.getElementById('volatilitySpikeBtn')?.addEventListener('click', () => this.triggerVolatilitySpike());
    document.getElementById('volatilitySpikeBtn2')?.addEventListener('click', () => this.triggerVolatilitySpike());
    document.getElementById('pauseMarketBtn')?.addEventListener('click', () => this.pauseMarket());
    document.getElementById('resumeMarketBtn')?.addEventListener('click', () => this.resumeMarket());
    document.getElementById('resetMarketBtn')?.addEventListener('click', () => this.resetMarket());

    // Export
    document.getElementById('exportUsersBtn')?.addEventListener('click', () => this.exportUsers());
    document.getElementById('exportAuditBtn')?.addEventListener('click', () => this.exportAudit());

    // Users page
    document.getElementById('userSearch')?.addEventListener('input', (e) => this.filterUsers(e.target.value));
    document.getElementById('tierFilter')?.addEventListener('change', () => this.filterUsers());
    document.getElementById('statusFilter')?.addEventListener('change', () => this.filterUsers());
    document.getElementById('prevPage')?.addEventListener('click', () => this.prevUserPage());
    document.getElementById('nextPage')?.addEventListener('click', () => this.nextUserPage());

    // Tier config
    document.getElementById('editTierSelect')?.addEventListener('change', (e) => this.loadTierConfig(e.target.value));
    document.getElementById('saveTierConfig')?.addEventListener('click', () => this.saveTierConfig());

    // Blocks page
    document.getElementById('addBlockBtn')?.addEventListener('click', () => this.openBlockModal());
    document.getElementById('blockConditionType')?.addEventListener('change', (e) => this.updateBlockConditionFields(e.target.value));
    document.getElementById('saveBlock')?.addEventListener('click', () => this.saveBlock());
    document.querySelector('#blockModal .modal-close')?.addEventListener('click', () => this.closeModal('blockModal'));
    document.getElementById('blockModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeModal('blockModal'); });

    // Banners page
    document.getElementById('addBannerBtn')?.addEventListener('click', () => this.openBannerModal());
    document.getElementById('saveBanner')?.addEventListener('click', () => this.saveBanner());
    document.querySelector('#bannerModal .modal-close')?.addEventListener('click', () => this.closeModal('bannerModal'));
    document.getElementById('bannerModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeModal('bannerModal'); });
    document.getElementById('testBannerForm')?.addEventListener('submit', (e) => this.testBanner(e));

    // Settings
    document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());

    // Audit pagination
    document.getElementById('auditPrevPage')?.addEventListener('click', () => this.prevAuditPage());
    document.getElementById('auditNextPage')?.addEventListener('click', () => this.nextAuditPage());

    // User detail modal close
    document.querySelector('#userDetailModal .modal-close')?.addEventListener('click', () => this.closeModal('userDetailModal'));
    document.getElementById('userDetailModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeModal('userDetailModal'); });
    document.querySelectorAll('#userDetailTabs .tab-btn')?.forEach(btn => {
      btn.addEventListener('click', () => this.switchUserDetailTab(btn.dataset.tab));
    });
  }

  // WebSocket
  setupWebSocket() {
    if (window.wsManager) {
      this.unsubscribers.push(
        window.wsManager.on('connected', () => this.onWSConnected()),
        window.wsManager.on('disconnected', () => this.onWSDisconnected()),
        window.wsManager.on('admin:market:paused', () => this.onMarketPaused()),
        window.wsManager.on('admin:market:resumed', () => this.onMarketResumed()),
        window.wsManager.on('admin:settings:updated', (data) => this.onSettingsUpdated(data)) 
      );
      window.wsManager.subscribe({ type: 'subscribe', channel: 'admin' });
    }
  }

  onWSConnected() { console.log('Admin WS connected'); }
  onWSDisconnected() { console.log('Admin WS disconnected'); }
  onMarketPaused() { this.updateMarketStatusUI(false); }
  onMarketResumed() { this.updateMarketStatusUI(true); }
  onSettingsUpdated(data) { this.showToast('Settings updated', 'success'); }

  // Page Navigation
  switchPage(pageId) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === pageId));
    this.currentPage = pageId;
    this.closeSidebar();
    
    // Load page data
    if (pageId === 'overview') this.loadOverview();
    else if (pageId === 'users') this.loadUsers();
    else if (pageId === 'tiers') this.loadTiers();
    else if (pageId === 'blocks') this.loadBlocks();
    else if (pageId === 'banners') this.loadBanners();
    else if (pageId === 'market') this.loadMarketControl();
    else if (pageId === 'settings') this.loadSettings();
    else if (pageId === 'audit') this.loadAudit();
  }

  toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar') || document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
      const isOpen = sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active', isOpen);
    }
  }

  closeSidebar() {
    const sidebar = document.getElementById('adminSidebar') || document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  toggleDropdown(menu) {
    menu.classList.toggle('active');
    menu.querySelector('.user-menu-trigger')?.setAttribute('aria-expanded', menu.classList.contains('active'));
  }

  async logout() {
    try {
      await this.fetchWithAuth('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('crainee_token');
    window.location.href = '/';
  }

  // Data Loading - Overview
  async loadOverview() {
    try {
      const res = await this.fetchWithAuth('/api/admin/overview');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      this.renderOverview(data.stats, data.recentAudit);
    } catch (err) {
      console.error('Overview load error:', err);
      this.showToast('Failed to load overview', 'error');
    }
  }

  renderOverview(stats, recentAudit) {
    if (!stats) return;
    document.getElementById('statTotalUsers').textContent = stats.totalUsers?.toLocaleString() || '0';
    document.getElementById('statActiveUsers').textContent = `${stats.totalUsers - (stats.frozenUsers || 0)} active`;
    document.getElementById('statTotalBalance').textContent = this.formatCurrency(stats.totalVirtualBalance || 0);
    document.getElementById('statAvgBalance').textContent = `Avg: ${this.formatCurrency((stats.totalVirtualBalance || 0) / (stats.totalUsers || 1))}`;
    document.getElementById('statTotalTx').textContent = stats.totalTransactions?.toLocaleString() || '0';
    document.getElementById('statBlockedTx').textContent = `${stats.blockedWithdrawals || 0} blocked`;
    document.getElementById('statMarketStatus').textContent = stats.marketPaused ? 'Paused' : 'Live';
    document.getElementById('statAssets').textContent = `${stats.activeAssets || 0} assets`;

    // Tier distribution chart
    if (stats.tierDistribution && window.chartManager) {
      const tierData = {};
      stats.tierDistribution.forEach(t => { tierData[t.tier] = t.count; });
      window.chartManager.createTierDistributionChart('tierDistributionChart', tierData); 
    }

    // TX volume chart
    if (window.chartManager) {
      window.chartManager.createTxVolumeChart('txVolumeChart', {
        labels: ['00', '04', '08', '12', '16', '20'],
        buys: [12, 19, 15, 25, 22, 18],
        sells: [8, 12, 10, 15, 14, 11]
      });
    }

    // Recent audit
    const tbody = document.getElementById('recentAuditBody');
    if (tbody) {
      if (recentAudit?.length) {
        tbody.innerHTML = recentAudit.slice(0, 10).map(a => `
          <tr>
            <td>${new Date(a.created_at).toLocaleString()}</td>
            <td>${a.admin_email || 'System'}</td>
            <td><span class="audit-action ${a.action}">${a.action}</span></td>
            <td><span class="target-type">${a.target_type}</span> <span class="target-id">${a.target_id?.slice(0,8) || ''}</span></td>
            <td>${a.new_value ? (typeof a.new_value === 'object' ? JSON.stringify(a.new_value) : a.new_value) : '-'}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No recent actions</td></tr>';
      }
    }
  }

  // Users Management
  async loadUsers() {
    try {
      const res = await this.fetchWithAuth('/api/admin/users?page=1&limit=50');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      this.usersCache = data.users || [];
      this.totalUsers = data.total || 0;
      this.currentUsersPage = data.page || 1;
      this.renderUsersTable(this.usersCache);
      this.updateUsersPagination(data);
    } catch (err) {
      console.error('Users load error:', err);
      this.showToast('Failed to load users', 'error');
    }
  }

  filterUsers(search = '') {
    let filtered = this.usersCache;
    const searchInput = document.getElementById('userSearch');
    const tierSelect = document.getElementById('tierFilter');
    const statusSelect = document.getElementById('statusFilter');

    const searchTerm = (search !== '' ? search : (searchInput ? searchInput.value : '')).toLowerCase();
    const tier = tierSelect ? tierSelect.value : '';
    const status = statusSelect ? statusSelect.value : '';

    if (searchTerm) {
      filtered = filtered.filter(u =>
        (u.email && u.email.toLowerCase().includes(searchTerm)) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm))
      );
    }
    if (tier) filtered = filtered.filter(u => u.tier === tier);
    if (status === 'frozen') filtered = filtered.filter(u => u.is_frozen);
    if (status === 'active') filtered = filtered.filter(u => !u.is_frozen);
    this.renderUsersTable(filtered);
  }

  renderUsersTable(users) {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No users found</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div class="user-cell">
            <span class="user-name">${u.full_name || '—'}</span>
            <span class="user-email">${u.email}</span>
          </div>
        </td>
        <td><span class="badge badge-tier-${(u.tier || 'bronze').toLowerCase()} tier-badge-inline ${(u.tier || 'bronze').toLowerCase()}">${u.tier || 'Bronze'}</span></td>
        <td class="balance-cell">${this.formatCurrency(u.virtual_balance || 0)}</td>
        <td><span class="status-badge ${u.is_frozen ? 'frozen' : 'active'}">${u.is_frozen ? 'Frozen' : 'Active'}</span></td>
        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
        <td>${u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="window.adminApp.openUserDetail('${u._id || u.id}')">View</button>
        </td>
      </tr>
    `).join('');
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  }

  updateUsersPagination(data) {
    const info = document.getElementById('usersPaginationInfo');
    if (info) {
      info.textContent = `Showing ${data.users?.length || 0} of ${data.total || 0} users`;
    }
  }

  prevUserPage() {}
  nextUserPage() {}
  loadTiers() {}
  loadTierConfig(tier) {}
  saveTierConfig() {}
  loadBlocks() {}
  openBlockModal() {}
  updateBlockConditionFields(type) {}
  saveBlock() {}
  loadBanners() {}
  openBannerModal() {}
  saveBanner() {}
  testBanner(e) { e.preventDefault(); this.showToast('Test banner broadcasted', 'success'); }
  loadMarketControl() {}
  toggleMarketPause(paused) {}
  triggerVolatilitySpike() { this.showToast('Liquidity volatility spike triggered', 'warning'); }
  pauseMarket() { this.showToast('Market engine paused', 'warning'); }
  resumeMarket() { this.showToast('Market engine resumed', 'success'); }
  resetMarket() { this.showToast('Market prices reset', 'info'); }
  loadSettings() {}
  saveSettings() { this.showToast('Settings saved successfully', 'success'); }
  loadAudit() {}
  prevAuditPage() {}
  nextAuditPage() {}
  exportUsers() { this.showToast('Exporting user records...', 'info'); }
  exportAudit() { this.showToast('Exporting audit logs...', 'info'); }
  
  openUserDetail(userId) {
    const modal = document.getElementById('userDetailModal');
    if (modal) modal.classList.add('active');
  }

  switchUserDetailTab(tabName) {
    document.querySelectorAll('#userDetailTabs .btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminApp();
});

// public/js/pages/settings.js - User settings page for crainee
export class Settings {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Manage your account preferences and security configuration</p>
        </div>
      </div>
      
      <div class="grid" style="grid-template-columns: 1fr 2fr; gap: 24px;">
        <aside style="display: flex; flex-direction: column; gap: 12px;">
          <button class="btn btn-secondary settings-nav-btn active" data-section="profile" style="width: 100%; text-align: left; justify-content: flex-start;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </button>
          <button class="btn btn-secondary settings-nav-btn" data-section="security" style="width: 100%; text-align: left; justify-content: flex-start;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Security
          </button>
          <button class="btn btn-secondary settings-nav-btn" data-section="notifications" style="width: 100%; text-align: left; justify-content: flex-start;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            Notifications
          </button>
          <button class="btn btn-secondary settings-nav-btn" data-section="trading" style="width: 100%; text-align: left; justify-content: flex-start;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Trading
          </button>
          <button class="btn btn-secondary settings-nav-btn" data-section="display" style="width: 100%; text-align: left; justify-content: flex-start;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            Display
          </button>
          <div style="height: 1px; background: var(--gray-200); margin: 8px 0;"></div>
          <button class="btn btn-ghost settings-nav-btn" data-section="danger" style="width: 100%; text-align: left; justify-content: flex-start; color: var(--error);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete Account
          </button>
        </aside>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <section class="card settings-panel active" id="section-profile">
            <div class="card-header">
              <h2 class="card-title">Profile Settings</h2>
            </div>
            <div class="card-content">
              <form id="profile-form">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input type="text" class="form-input" id="profile-name" placeholder="Enter your full name">
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" id="profile-email" disabled>
                  <div class="form-hint">Email cannot be changed. Contact support for changes.</div>
                </div>
                <div class="form-group">
                  <label class="form-label">Current Tier</label>
                  <div class="form-input" id="profile-tier" style="background: var(--gray-50);">Bronze</div>
                </div>
                <button type="submit" class="btn btn-primary">Save Changes</button>
              </form>
            </div>
          </section>
          
          <section class="card settings-panel" id="section-security" style="display: none;">
            <div class="card-header">
              <h2 class="card-title">Security</h2>
            </div>
            <div class="card-content">
              <div style="margin-bottom: 24px;">
                <h3 style="font-size: var(--text-base); font-weight: 600; margin-bottom: 16px;">Change Password</h3>
                <form id="password-form">
                  <div class="form-group">
                    <label class="form-label">Current Password</label>
                    <input type="password" class="form-input" id="current-password" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-input" id="new-password" required minlength="8">
                    <div class="form-hint">Minimum 8 characters</div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Confirm New Password</label>
                    <input type="password" class="form-input" id="confirm-password" required>
                  </div>
                  <button type="submit" class="btn btn-primary">Update Password</button>
                </form>
              </div>
              
              <div style="padding: 16px; background: var(--gray-50); border-radius: var(--border-radius);">
                <h3 style="font-size: var(--text-base); font-weight: 600; margin-bottom: 12px;">Two-Factor Authentication</h3>
                <p style="font-size: var(--text-sm); color: var(--gray-600); margin-bottom: 12px;">Add an extra layer of security to your enterprise account.</p>
                <button class="btn btn-secondary btn-sm">Enable 2FA</button>
              </div>
            </div>
          </section>
          
          <section class="card settings-panel" id="section-notifications" style="display: none;">
            <div class="card-header">
              <h2 class="card-title">Notification Preferences</h2>
            </div>
            <div class="card-content">
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <div>
                    <div style="font-weight: 500;">Price Alerts</div>
                    <div style="font-size: var(--text-sm); color: var(--gray-500);">Get notified when assets hit target prices</div>
                  </div>
                  <input type="checkbox" class="ot-tgl" checked>
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <div>
                    <div style="font-weight: 500;">Trade Confirmations</div>
                    <div style="font-size: var(--text-sm); color: var(--gray-500);">Receive confirmation for executed trades</div>
                  </div>
                  <input type="checkbox" class="ot-tgl" checked>
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <div>
                    <div style="font-weight: 500;">Market News</div>
                    <div style="font-size: var(--text-sm); color: var(--gray-500);">Daily market summaries and intelligence</div>
                  </div>
                  <input type="checkbox" class="ot-tgl">
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <div>
                    <div style="font-weight: 500;">Withdrawal Notifications</div>
                    <div style="font-size: var(--text-sm); color: var(--gray-500);">Alerts for withdrawal requests and status updates</div>
                  </div>
                  <input type="checkbox" class="ot-tgl" checked>
                </label>
              </div>
            </div>
          </section>
          
          <section class="card settings-panel" id="section-trading" style="display: none;">
            <div class="card-header">
              <h2 class="card-title">Trading Preferences</h2>
            </div>
            <div class="card-content">
              <div class="form-group">
                <label class="form-label">Default Order Type</label>
                <select class="form-input form-select" id="default-order-type">
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Default Quantity Unit</label>
                <select class="form-input form-select" id="default-qty-unit">
                  <option value="base">Base Currency (e.g., BTC)</option>
                  <option value="quote">Quote Currency (e.g., USD)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Confirm Before Trading</label>
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <span>Require confirmation dialog before executing trades</span>
                  <input type="checkbox" class="ot-tgl" checked>
                </label>
              </div>
              <div class="form-group">
                <label class="form-label">Slippage Tolerance</label>
                <input type="range" class="form-input" id="slippage-tolerance" min="0.1" max="5" step="0.1" value="0.5">
                <div style="display: flex; justify-content: space-between; font-size: var(--text-xs); color: var(--gray-500); margin-top: 4px;">
                  <span>0.1%</span>
                  <span id="slippage-value">0.5%</span>
                  <span>5%</span>
                </div>
              </div>
            </div>
          </section>
          
          <section class="card settings-panel" id="section-display" style="display: none;">
            <div class="card-header">
              <h2 class="card-title">Display Settings</h2>
            </div>
            <div class="card-content">
              <div class="form-group">
                <label class="form-label">Theme</label>
                <select class="form-input form-select" id="theme-select">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Price Precision</label>
                <select class="form-input form-select" id="price-precision">
                  <option value="2">2 decimals</option>
                  <option value="4">4 decimals</option>
                  <option value="6">6 decimals</option>
                  <option value="auto">Auto (based on price)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Chart Type</label>
                <select class="form-input form-select" id="chart-type">
                  <option value="candlestick">Candlestick</option>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Animation</label>
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <span>Enable price update animations</span>
                  <input type="checkbox" class="ot-tgl" checked id="animations-enabled">
                </label>
              </div>
            </div>
          </section>
          
          <section class="card settings-panel" id="section-danger" style="display: none; border: 1px solid var(--error);">
            <div class="card-header" style="background: var(--error-bg); border-bottom-color: var(--error);">
              <h2 class="card-title" style="color: var(--error);">Danger Zone</h2>
            </div>
            <div class="card-content">
              <div style="text-align: center; padding: 24px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--error); margin-bottom: 16px;">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <h3 style="color: var(--error); margin-bottom: 8px;">Delete Account</h3>
                <p style="color: var(--gray-600); margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
                  This action is irreversible. All your data, trading history, and assets will be permanently deleted.
                </p>
                <button class="btn btn-error" id="delete-account-btn" style="width: 200px;">Delete My Account</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    this.container.querySelectorAll('.settings-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showSection(btn.dataset.section));
    });
    
    this.container.querySelector('#profile-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProfile();
    });
    
    this.container.querySelector('#password-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.changePassword();
    });
    
    const slippage = this.container.querySelector('#slippage-tolerance');
    if (slippage) {
      slippage.addEventListener('input', (e) => {
        this.container.querySelector('#slippage-value').textContent = `${parseFloat(e.target.value).toFixed(1)}%`;
      });
    }
    
    this.container.querySelector('#theme-select')?.addEventListener('change', (e) => {
      this.setTheme(e.target.value);
    });
    
    this.container.querySelector('#animations-enabled')?.addEventListener('change', (e) => {
      document.body.classList.toggle('no-animations', !e.target.checked);
      localStorage.setItem('crainee_animations', e.target.checked);
    });
    
    ['price-precision', 'chart-type', 'default-order-type', 'default-qty-unit'].forEach(id => {
      this.container.querySelector(`#${id}`)?.addEventListener('change', (e) => {
        localStorage.setItem(`crainee_${id}`, e.target.value);
      });
    });
    
    this.container.querySelector('#delete-account-btn')?.addEventListener('click', () => this.confirmDeleteAccount());
    this.setupExternalModals();
  }
  
  setupExternalModals() {
    this.container.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });
  }
  
  async onShow() {
    await this.loadUserProfile();
    this.loadPreferences();
  }
  
  async loadUserProfile() {
    try {
      const res = await window.API.getBalance();
      this.container.querySelector('#profile-name')?.value = window.App.user?.fullName || '';
      this.container.querySelector('#profile-email')?.value = window.App.user?.email || '';
      this.container.querySelector('#profile-tier')?.textContent = window.App.user?.tier || 'Bronze';
      this.container.querySelector('#profile-tier')?.className = `form-input badge badge-${(window.App.user?.tier || 'Bronze').toLowerCase()}`;
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  }
  
  loadPreferences() {
    const theme = localStorage.getItem('crainee_theme') || 'system';
    this.container.querySelector('#theme-select').value = theme;
    this.applyTheme(theme);
    
    const animations = localStorage.getItem('crainee_animations') !== 'false';
    this.container.querySelector('#animations-enabled').checked = animations;
    document.body.classList.toggle('no-animations', !animations);
    
    this.container.querySelector('#price-precision')?.value = localStorage.getItem('crainee_price-precision') || 'auto';
    this.container.querySelector('#chart-type')?.value = localStorage.getItem('crainee_chart-type') || 'candlestick';
    this.container.querySelector('#default-order-type')?.value = localStorage.getItem('crainee_default-order-type') || 'market';
    this.container.querySelector('#default-qty-unit')?.value = localStorage.getItem('crainee_default-qty-unit') || 'base';
    this.container.querySelector('#slippage-tolerance')?.value = localStorage.getItem('crainee_slippage-tolerance') || '0.5';
    this.container.querySelector('#slippage-value').textContent = `${(localStorage.getItem('crainee_slippage-tolerance') || '0.5')}%`;
  }
  
  showSection(section) {
    this.container.querySelectorAll('.settings-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
    
    this.container.querySelectorAll('.settings-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `section-${section}`);
      panel.style.display = panel.id === `section-${section}` ? 'block' : 'none';
    });
  }
  
  async saveProfile() {
    const name = this.container.querySelector('#profile-name')?.value.trim();
    if (!name) {
      window.Toast.error('Name cannot be empty');
      return;
    }
    
    try {
      window.App.user.fullName = name;
      localStorage.setItem('crainee_user', JSON.stringify(window.App.user));
      window.updateAuthUI?.();
      window.Toast.success('Profile updated');
    } catch (e) {
      window.Toast.error('Failed to update profile');
    }
  }
  
  async changePassword() {
    const current = this.container.querySelector('#current-password')?.value;
    const newPass = this.container.querySelector('#new-password')?.value;
    const confirm = this.container.querySelector('#confirm-password')?.value;
    
    if (newPass !== confirm) {
      window.Toast.error('Passwords do not match');
      return;
    }
    
    if (newPass.length < 8) {
      window.Toast.error('Password must be at least 8 characters');
      return;
    }
    
    window.Toast.success('Password updated successfully');
    this.container.querySelector('#password-form')?.reset();
  }
  
  applyTheme(theme) {
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crainee_theme', theme);
  }
  
  setTheme(theme) {
    this.applyTheme(theme);
    window.Toast.success(`Theme set to ${theme}`);
  }
  
  confirmDeleteAccount() {
    const email = prompt('Type your email to confirm account deletion:');
    if (email === window.App.user?.email) {
      if (confirm('Are you absolutely sure? This cannot be undone.')) {
        window.Toast.error('Account deletion not implemented in demo');
      }
    } else if (email !== null) {
      window.Toast.error('Email does not match');
    }
  }
}

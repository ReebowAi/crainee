// public/js/main.js - Main application entry point for Crainee Enterprise Platform
import { Auth } from './auth.js';
import { Router } from './router.js';
import { Dashboard } from './pages/dashboard.js';
import { Markets } from './pages/markets.js';
import { Portfolio } from './pages/portfolio.js';
import { Trading } from './pages/trading.js';
import { Admin } from './pages/admin.js';
import { Settings } from './pages/settings.js';
import { Login } from './pages/login.js';
import { Register } from './pages/register.js';
import { TickerBanner } from './components/TickerBanner.js';
import { Toast } from './components/Toast.js';
import { WSClient } from './services/ws-client.js';
import { API } from './services/api.js';

// Global app state
window.App = {
  user: null,
  token: null,
  ws: null,
  tickerBanner: null,
  currentPage: null,
  components: {}
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize toast container
  window.Toast = new Toast();
  
  // Check for stored auth
  const storedToken = localStorage.getItem('crainee_token');
  const storedUser = localStorage.getItem('crainee_user');
  
  if (storedToken && storedUser) {
    window.App.token = storedToken;
    window.App.user = JSON.parse(storedUser);
    API.setToken(storedToken);
  }
  
  // Initialize WebSocket
  window.App.ws = new WSClient();
  await window.App.ws.connect();
  
  // Initialize ticker banner
  window.App.tickerBanner = new TickerBanner();
  await window.App.tickerBanner.start();
  
  // Initialize router
  window.App.router = new Router({
    '/': () => showPage('dashboard'),
    '/dashboard': () => showPage('dashboard'),
    '/markets': () => showPage('markets'),
    '/portfolio': () => showPage('portfolio'),
    '/trading': () => showPage('trading'),
    '/admin': () => showPage('admin'),
    '/settings': () => showPage('settings'),
    '/login': () => showAuthPage('login'),
    '/register': () => showAuthPage('register')
  });
  
  // Load initial page
  if (window.App.user) {
    window.App.router.navigate('/dashboard');
    // Load user data
    await loadUserData();
  } else {
    window.App.router.navigate('/login');
  }
  
  // Render app shell
  renderAppShell();
});

function renderAppShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app">
      <header class="header" id="header">
        <div class="header-left">
          <a href="/" class="logo" data-link>
            <svg class="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="currentColor"/>
              <path d="M8 20L14 14L18 17.5L24 9" stroke="#D97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 20L22 20" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4 2"/>
            </svg>
            <span class="logo-text">Crainee</span>
            <span class="logo-tagline">Enterprise</span>
          </a>
          <nav class="nav-tabs" id="main-nav" style="display: none;">
            <button class="nav-tab" data-page="dashboard">Dashboard</button>
            <button class="nav-tab" data-page="markets">Markets</button>
            <button class="nav-tab" data-page="portfolio">Portfolio</button>
            <button class="nav-tab" data-page="trading">Trading</button>
            <button class="nav-tab" data-page="admin" id="admin-tab" style="display: none;">Admin</button>
          </nav>
        </div>
        <div class="header-right">
          <div class="header-actions" id="header-actions">
            <!-- User menu or auth buttons rendered here -->
          </div>
        </div>
      </header>
      
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Navigation</span>
          <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav class="sidebar-nav" id="sidebar-nav">
          <div class="nav-section">
            <div class="nav-section-title">Operations</div>
            <a href="/dashboard" class="nav-item" data-page="dashboard">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span class="nav-label">Dashboard</span>
            </a>
            <a href="/markets" class="nav-item" data-page="markets">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span class="nav-label">Markets</span>
              <span class="nav-badge" id="markets-badge" style="display:none;">Live</span>
            </a>
            <a href="/portfolio" class="nav-item" data-page="portfolio">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12V7H5V21H17A5 5 0 0 0 21 12Z"></path>
              </svg>
              <span class="nav-label">Portfolio</span>
            </a>
            <a href="/trading" class="nav-item" data-page="trading">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15A9 9 0 1 1 18.5 4.5"></path>
              </svg>
              <span class="nav-label">Execution</span>
            </a>
          </div>
          <div class="nav-section">
            <div class="nav-section-title">Administration</div>
            <a href="/settings" class="nav-item" data-page="settings">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"></path>
              </svg>
              <span class="nav-label">Settings</span>
            </a>
          </div>
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-user" id="sidebar-user" style="display: none;">
            <div class="user-avatar" id="sidebar-avatar"></div>
            <div class="user-info" style="align-items: flex-start; text-align: left;">
              <span class="user-name" id="sidebar-name"></span>
              <span class="user-tier" id="sidebar-tier"></span>
            </div>
          </div>
        </div>
      </aside>
      
      <main class="main-content" id="main-content">
        <!-- Page content injected here -->
      </main>
    </div>
  `;
}

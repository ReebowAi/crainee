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

      <!-- Ticker Banner -->
      <div class="ticker-banner" id="ticker-banner" style="display: none;">
        <div class="ticker-track" id="ticker-track"></div>
      </div>
      
      <!-- Toast Container -->
      <div class="toast-container" id="toast-container"></div>
      
      <!-- Mobile sidebar backdrop -->
      <div class="sidebar-overlay" id="sidebar-backdrop"></div>
    </div>
  `;
  
  // Initialize event listeners after render
  initializeShellEvents();
  
  // Show/hide auth UI based on login state
  updateAuthUI();
}

function initializeShellEvents() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarBackdrop.classList.toggle('active');
    });
  }
  
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    });
  }
  
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      window.App.router.navigate(`/${page}`);
      
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    });
  });
  
  document.querySelector('.logo[data-link]')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.App.router.navigate('/dashboard');
  });
  
  document.querySelectorAll('.nav-tab[data-page]').forEach(tab => {
    tab.addEventListener('click', () => {
      window.App.router.navigate(`/${tab.dataset.page}`);
    });
  });
  
  const userMenu = document.querySelector('.user-menu');
  if (userMenu) {
    userMenu.addEventListener('click', (e) => {
      if (e.target.closest('.dropdown-item')) {
        const action = e.target.closest('.dropdown-item').dataset.action;
        handleUserAction(action);
      }
    });
  }
}

function updateAuthUI() {
  const headerActions = document.getElementById('header-actions');
  const sidebarUser = document.getElementById('sidebar-user');
  const mainNav = document.getElementById('main-nav');
  const adminTab = document.getElementById('admin-tab');
  
  if (window.App.user) {
    headerActions.innerHTML = `
      <div class="user-menu">
        <button class="user-btn" aria-expanded="false" aria-haspopup="true">
          <div class="user-avatar" id="header-avatar">${getInitials(window.App.user.fullName || window.App.user.email)}</div>
          <div class="user-info">
            <span class="user-name">${window.App.user.fullName || window.App.user.email}</span>
            <span class="user-tier tier-${window.App.user.tier.toLowerCase()}">${window.App.user.tier}</span>
          </div>
        </button>
        <div class="user-dropdown">
          <button class="dropdown-item" data-action="settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"></path>
            </svg>
            Settings
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" data-action="logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    `;
    
    sidebarUser.style.display = 'flex';
    document.getElementById('sidebar-avatar').textContent = getInitials(window.App.user.fullName || window.App.user.email);
    document.getElementById('sidebar-name').textContent = window.App.user.fullName || window.App.user.email;
    document.getElementById('sidebar-tier').textContent = window.App.user.tier;
    document.getElementById('sidebar-tier').className = `user-tier tier-${window.App.user.tier.toLowerCase()}`;
    
    mainNav.style.display = 'flex';
    
    if (window.App.user.isAdmin) {
      adminTab.style.display = 'block';
    }
    
    document.getElementById('ticker-banner').style.display = 'block';
    updateActiveNav();
  } else {
    headerActions.innerHTML = `
      <a href="/login" class="btn btn-ghost" data-link>Sign In</a>
      <a href="/register" class="btn btn-primary" data-link>Get Started</a>
    `;
    sidebarUser.style.display = 'none';
    mainNav.style.display = 'none';
    adminTab.style.display = 'none';
    document.getElementById('ticker-banner').style.display = 'none';
    
    document.querySelectorAll('[data-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.App.router.navigate(link.getAttribute('href'));
      });
    });
  }
}

function updateActiveNav() {
  const currentPath = window.location.pathname;
  const page = currentPath.split('/')[1] || 'dashboard';
  
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === page);
  });
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function handleUserAction(action) {
  switch (action) {
    case 'settings':
      window.App.router.navigate('/settings');
      break;
    case 'logout':
      logout();
      break;
  }
}

async function logout() {
  localStorage.removeItem('crainee_token');
  localStorage.removeItem('crainee_user');
  window.App.user = null;
  window.App.token = null;
  API.setToken(null);
  
  if (window.App.ws) {
    window.App.ws.disconnect();
  }
  
  window.Toast.success('Signed out successfully');
  window.App.router.navigate('/login');
}

async function loadUserData() {
  try {
    const response = await API.get('/auth/me');
    if (response.user) {
      window.App.user = { ...window.App.user, ...response.user };
      localStorage.setItem('crainee_user', JSON.stringify(window.App.user));
      updateAuthUI();
    }
  } catch (e) {
    console.error('Failed to load user data:', e);
  }
}

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  let pageComponent = window.App.components[pageName];
  const mainContent = document.getElementById('main-content');
  
  if (!pageComponent) {
    pageComponent = createPageComponent(pageName);
    window.App.components[pageName] = pageComponent;
    mainContent.appendChild(pageComponent.element);
  }
  
  pageComponent.element.classList.add('active');
  window.App.currentPage = pageName;
  
  if (pageComponent.onShow) {
    pageComponent.onShow();
  }
  
  updateActiveNav();
}

function showAuthPage(pageName) {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = '';
  
  let pageComponent = window.App.components[pageName];
  if (!pageComponent) {
    pageComponent = createPageComponent(pageName);
    window.App.components[pageName] = pageComponent;
  }
  
  mainContent.appendChild(pageComponent.element);
  pageComponent.element.classList.add('active');
  window.App.currentPage = pageName;
  
  if (pageComponent.onShow) {
    pageComponent.onShow();
  }
}

function createPageComponent(pageName) {
  const container = document.createElement('div');
  container.className = 'page';
  
  let component;
  switch (pageName) {
    case 'dashboard':
      component = new Dashboard(container);
      break;
    case 'markets':
      component = new Markets(container);
      break;
    case 'portfolio':
      component = new Portfolio(container);
      break;
    case 'trading':
      component = new Trading(container);
      break;
    case 'admin':
      component = new Admin(container);
      break;
    case 'settings':
      component = new Settings(container);
      break;
    case 'login':
      component = new Login(container);
      break;
    case 'register':
      component = new Register(container);
      break;
    default:
      component = { element: container, onShow: () => {} };
  }
  
  return { element: container, ...component };
}

// Make functions globally available
window.showPage = showPage;
window.showAuthPage = showAuthPage;
window.logout = logout;
window.updateAuthUI = updateAuthUI;

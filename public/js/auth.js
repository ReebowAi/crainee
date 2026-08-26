// public/js/auth.js
class AuthManager {
  constructor() {
    this.baseURL = '/api/auth';
    this.toastContainer = document.getElementById('toastContainer');
    this.init();
  }

  init() {
    this.bindForms();
    this.checkAuth();
  }

  bindForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  }

  async checkAuth() {
    try {
      // FIXED: Pointed to the correct backend route /auth/session instead of /auth/me
      const res = await fetch(`${this.baseURL}/session`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const user = data.user || data;
        
        // Save token if provided
        if (data.token) {
          localStorage.setItem('crainee_token', data.token);
          if (!window.App) window.App = {};
          window.App.token = data.token;
        }

        // Already logged in, redirect safely based on role
        const currentPath = window.location.pathname;
        if ((currentPath === '/' || currentPath === '/index.html' || currentPath === '/login.html' || currentPath === '/register.html') && user) {
          window.location.href = user.isAdmin ? '/admin' : '/dashboard';
        }
      }
    } catch (e) {
      // Not logged in, stay on login page
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    this.clearErrors(form);
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing on...';
    
    const formData = new FormData(form);
    const data = {
      email: formData.get('email'),
      password: formData.get('password') 
    };
    
    try {
      const res = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) {
        this.showFieldErrors(form, result);
        throw new Error(result.error || 'Login failed');
      }

      // Save token securely on successful login
      if (result.token) {
        localStorage.setItem('crainee_token', result.token);
        if (!window.App) window.App = {};
        window.App.token = result.token;
      }

      this.showToast('Welcome back! Redirecting...', 'success');
      setTimeout(() => {
        const user = result.user || result;
        const isAdmin = user && user.isAdmin;
        window.location.href = isAdmin ? '/admin' : '/dashboard';
      }, 800);
    } catch (err) {
      console.error('Login error:', err);
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    this.clearErrors(form);
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account...'; 
    
    const formData = new FormData(form);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      fullName: formData.get('fullName')
    };
    
    if (data.password !== data.confirmPassword) {
      this.showToast('Passwords do not match', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      return;
    }
    delete data.confirmPassword;
    
    try {
      const res = await fetch(`${this.baseURL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) {
        this.showFieldErrors(form, result);
        throw new Error(result.error || 'Registration failed');
      }

      // Save token securely on successful registration
      if (result.token) {
        localStorage.setItem('crainee_token', result.token);
        if (!window.App) window.App = {};
        window.App.token = result.token;
      }

      this.showToast('Account created! Redirecting...', 'success');
      setTimeout(() => {
        const user = result.user || result;
        const isAdmin = user && user.isAdmin;
        window.location.href = isAdmin ? '/admin' : '/dashboard';
      }, 800);
    } catch (err) {
      console.error('Registration error:', err);
      this.showToast(err.message, 'error');
    } finally { 
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  clearErrors(form) {
    form.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
    form.querySelectorAll('.form-text.error').forEach(el => el.textContent = '');
  }

  showFieldErrors(form, result) {
    if (result.errors) {
      Object.entries(result.errors).forEach(([field, message]) => {
        const input = form.querySelector(`[name="${field}"]`);
        const errorEl = document.getElementById(`${field}-error`);
        if (input) input.classList.add('error');
        if (errorEl) errorEl.textContent = message;
      });
    } else if (result.error) {
      const firstInput = form.querySelector('.form-control');
      if (firstInput) firstInput.classList.add('error');
    }
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${this.getToastIcon(type)}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Dismiss">&times;</button>
      </div>
    `;
    this.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    
    const dismiss = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    };
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, 5000);
  }

  getToastIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  static showToast(message, type) {
    if (window.authManager) {
      window.authManager.showToast(message, type);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});

// Spinner CSS (injected)
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: var(--wf-white, #ffffff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px; 
}
@keyframes spin { to { transform: rotate(360deg); } }
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
}
.toast {
  background: var(--wf-white, #ffffff);
  border: 1px solid var(--wf-gray-200, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-lg, 0 20px 25px -5px rgba(0, 0, 0, 0.5));
  transform: translateX(120%);
  opacity: 0;
  transition: all 0.3s ease;
}
.toast.show { transform: translateX(0); opacity: 1; }
.toast-content { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
.toast-icon { font-size: 1.25rem; flex-shrink: 0; }
.toast-success .toast-icon { color: var(--color-success, #10b981); }
.toast-error .toast-icon { color: var(--color-error, #ef4444); }
.toast-warning .toast-icon { color: var(--color-warning, #f59e0b); }
.toast-info .toast-icon { color: var(--color-info, #3b82f6); }
.toast-message { flex: 1; font-size: 0.875rem; color: #111; }
.toast-close { background: none; border: none; font-size: 1.25rem; color: #9ca3af; cursor: pointer; line-height: 1; }
.toast-close:hover { color: #374151; }
`;
document.head.appendChild(spinnerStyle);

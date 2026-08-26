// public/js/pages/login.js - Login page for crainee
export class Login {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }
  
  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="auth-container">
        <div class="auth-branding">
          <a href="/" class="logo" data-page="home">
            <svg class="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="currentColor"/>
              <path d="M8 20L14 14L18 17.5L24 9" stroke="#F0B90B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 20L22 20" stroke="#F0B90B" stroke-width="1.5" stroke-dasharray="4 2"/>
            </svg>
            <span class="logo-text" style="color: white;">crainee</span>
            <span class="logo-tagline" style="background: rgba(255,255,255,0.2); color: #F0B90B;">Enterprise</span>
          </a>
          <h1>Welcome Back</h1>
          <p>Sign in to your crainee institutional portfolio and continue asset management.</p>
          
          <div style="margin-top: 40px; padding: 24px; background: rgba(255,255,255,0.1); border-radius: var(--border-radius);">
            <h3 style="margin-bottom: 16px; font-size: var(--text-base);">Demo Credentials</h3>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: var(--text-sm); font-family: var(--font-mono);">
              <div><strong>Admin:</strong> admin@crainee.io / admin123</div>
              <div><strong>User:</strong> Register any account below</div>
            </div>
          </div>
        </div>
        
        <div class="auth-form-container">
          <div class="auth-form">
            <a href="/" class="logo" style="justify-content: center; margin-bottom: 24px;" data-page="home">
              <svg class="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="6" fill="currentColor"/>
                <path d="M8 20L14 14L18 17.5L24 9" stroke="#F0B90B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 20L22 20" stroke="#F0B90B" stroke-width="1.5" stroke-dasharray="4 2"/>
              </svg>
              <span class="logo-text">crainee</span>
              <span class="logo-tagline">Enterprise</span>
            </a>
            
            <h2>Sign In</h2>
            <p>Enter your credentials to access your financial portfolio</p>
            
            <form id="login-form" novalidate>
              <div class="form-group">
                <label class="form-label" for="login-email">Email</label>
                <input type="email" class="form-input" id="login-email" name="email" required autocomplete="email" placeholder="you@example.com">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="login-password">Password</label>
                <input type="password" class="form-input" id="login-password" name="password" required autocomplete="current-password" placeholder="Enter your password">
              </div>
              
              <div class="form-group" style="display: flex; align-items: center; justify-content: space-between;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: var(--text-sm);">
                  <input type="checkbox" name="remember" id="remember-me">
                  <span>Remember me</span>
                </label>
                <a href="/forgot-password" class="btn btn-ghost btn-sm" style="text-decoration: none;" data-page="forgot-password">Forgot password?</a>
              </div>
              
              <button type="submit" class="btn btn-primary w-full" style="margin-top: 8px;">
                <span class="btn-text">Sign In</span>
                <span class="btn-loader" style="display: none; align-items: center; gap: 8px;">
                  <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
                  </svg>
                  Signing in...
                </span>
              </button>
            </form>
            
            <div class="auth-divider">
              <span>or</span>
            </div>
            
            <button type="button" class="btn btn-secondary w-full" id="passkey-login">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="8" width="20" height="12" rx="2"></rect>
                <path d="M8 12v8"></path>
                <path d="M12 12v8"></path>
                <path d="M16 12v8"></path>
              </svg>
              Use Passkey
            </button>
            
            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--gray-200);">
              <p style="color: var(--gray-600); font-size: var(--text-sm);">
                Don't have an account? 
                <a href="/register" class="btn btn-ghost btn-sm" style="text-decoration: none; padding: 0; font-weight: 600;" data-page="register">Sign Up</a>
              </p>
            </div>
            
            <div style="margin-top: 24px; padding: 16px; background: var(--gray-50); border-radius: var(--border-radius); font-size: var(--text-xs); color: var(--gray-600);">
              <strong>Investment Products Disclosure:</strong>
              <ul style="margin: 8px 0 0 20px; line-height: 1.8;">
                <li>Protected under institutional risk-management policies.</li>
                <li>Direct obligation of crainee Global Liquidity Systems.</li>
                <li>Subject to standard market volatility and tier limits.</li>
              </ul>
              <p style="margin-top: 12px;">Copyright © 2026 crainee. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }
  
  bindEvents() {
    if (!this.container) return;

    this.container.querySelector('#login-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
    this.container.querySelector('#passkey-login')?.addEventListener('click', () => this.handlePasskey());

    this.container.querySelectorAll('a[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        const page = link.dataset.page;
        if (window.App && window.App.router && typeof window.App.router.navigate === 'function') {
          e.preventDefault();
          window.App.router.navigate('/' + (page === 'home' ? '' : page));
        }
      });
    });
  }
  
  onShow() {
    if (!this.container) return;
    setTimeout(() => {
      this.container.querySelector('#login-email')?.focus();
    }, 100);
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    if (!this.container) return;
    
    const form = e.target;
    const email = form.querySelector('#login-email').value.trim();
    const password = form.querySelector('#login-password').value;
    
    if (!email || !password) {
      if (window.Toast && typeof window.Toast.error === 'function') {
        window.Toast.error('Please fill in all fields');
      } else {
        alert('Please fill in all fields');
      }
      return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline-flex';
    
    try {
      let result = null;
      if (window.Auth && typeof window.Auth.login === 'function') {
        result = await window.Auth.login(email, password);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        result = { success: true, user: data.user };
      }

      if (result && result.success) {
        const userName = result.user?.fullName || result.user?.email || 'User';
        if (window.Toast && typeof window.Toast.success === 'function') {
          window.Toast.success(`Welcome back, ${userName}!`);
        }
        
        if (window.App && window.App.router && typeof window.App.router.navigate === 'function') {
          window.App.router.navigate('/dashboard');
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        throw new Error(result?.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (window.Toast && typeof window.Toast.error === 'function') {
        window.Toast.error(err.message || 'An error occurred during sign in');
      } else {
        alert(err.message || 'An error occurred during sign in');
      }
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  }
  
  handlePasskey() {
    if (window.PublicKeyCredential) {
      if (window.Toast && typeof window.Toast.info === 'function') {
        window.Toast.info('Passkey authentication active');
      } else {
        alert('Passkey authentication active');
      }
    } else {
      if (window.Toast && typeof window.Toast.error === 'function') {
        window.Toast.error('Passkeys not supported in this browser');
      } else {
        alert('Passkeys not supported in this browser');
      }
    }
  }
}

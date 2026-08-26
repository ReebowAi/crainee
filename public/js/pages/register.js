// public/js/pages/register.js - Registration page for crainee
export class Register {
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
          <h1>Initialize Your crainee Account</h1>
          <p>Join elite institutional traders utilizing high-performance liquidity markets with complete security.</p>
          
          <div style="margin-top: 40px;">
            <h3 style="margin-bottom: 16px; font-size: var(--text-base);">What you get:</h3>
            <ul style="display: flex; flex-direction: column; gap: 10px; font-size: var(--text-sm);">
              <li style="display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                $10,000 baseline liquidity allocation
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Real-time crypto, stock & forex markets
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Advanced order books & precision charts
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Tier-based progression (Bronze → VIP)
              </li>
            </ul>
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
            
            <h2>Create Account</h2>
            <p>Deploy your profile onto the crainee network</p>
            
            <form id="register-form" novalidate>
              <div class="form-group">
                <label class="form-label" for="reg-name">Full Name</label>
                <input type="text" class="form-input" id="reg-name" name="fullName" required autocomplete="name" placeholder="John Doe">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="reg-email">Email</label>
                <input type="email" class="form-input" id="reg-email" name="email" required autocomplete="email" placeholder="you@example.com">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="reg-password">Password</label>
                <input type="password" class="form-input" id="reg-password" name="password" required autocomplete="new-password" placeholder="Create a password" minlength="8">
                <div class="form-hint">Minimum 8 characters</div>
                <div id="password-strength"></div>
              </div>
              
              <button type="submit" class="btn btn-primary w-full" style="margin-top: 12px;">
                <span class="btn-text">Create Account</span>
                <span class="btn-loader" style="display: none; align-items: center; gap: 8px;">
                  <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
                  </svg>
                  Creating account...
                </span>
              </button>
            </form>
            
            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--gray-200);">
              <p style="color: var(--gray-600); font-size: var(--text-sm);">
                Already have an account? 
                <a href="/login" class="btn btn-ghost btn-sm" style="text-decoration: none; padding: 0; font-weight: 600;" data-page="login">Sign In</a>
              </p>
            </div>
            
            <div style="margin-top: 24px; text-align: center; font-size: var(--text-xs); color: var(--gray-500);">
              Copyright © 2026 crainee. All rights reserved.
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

    this.container.querySelector('#register-form')?.addEventListener('submit', (e) => this.handleSubmit(e));

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
      this.container.querySelector('#reg-name')?.focus();
    }, 100);
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    if (!this.container) return;
    
    const form = e.target;
    const fullName = form.querySelector('#reg-name').value.trim();
    const email = form.querySelector('#reg-email').value.trim();
    const password = form.querySelector('#reg-password').value;
    
    if (!fullName || !email || !password) {
      if (window.Toast && typeof window.Toast.error === 'function') {
        window.Toast.error('Please fill in all fields');
      } else {
        alert('Please fill in all fields');
      }
      return;
    }

    if (password.length < 8) {
      if (window.Toast && typeof window.Toast.error === 'function') {
        window.Toast.error('Password must be at least 8 characters long');
      } else {
        alert('Password must be at least 8 characters long');
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
      if (window.Auth && typeof window.Auth.register === 'function') {
        result = await window.Auth.register({ fullName, email, password });
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fullName, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        result = { success: true, user: data.user };
      }

      if (result && result.success) {
        if (window.Toast && typeof window.Toast.success === 'function') {
          window.Toast.success('Account created successfully!');
        }
        
        if (window.App && window.App.router && typeof window.App.router.navigate === 'function') {
          window.App.router.navigate('/dashboard');
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        throw new Error(result?.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (window.Toast && typeof window.Toast.error === 'function') {
        window.Toast.error(err.message || 'An error occurred during registration');
      } else {
        alert(err.message || 'An error occurred during registration');
      }
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  }
}

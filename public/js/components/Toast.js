// public/js/components/Toast.js - Toast notification system
export class Toast {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  }
  
  show(message, type = 'info', title = '', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };
    
    toast.innerHTML = `
      <div class="toast-icon" style="color: var(--${type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'});">${icons[type]}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    
    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.remove(toast);
    });
    
    // Auto remove
    let autoRemoveTimer = setTimeout(() => this.remove(toast), duration);
    
    // Pause on hover
    toast.addEventListener('mouseenter', () => clearTimeout(autoRemoveTimer));
    toast.addEventListener('mouseleave', () => {
      autoRemoveTimer = setTimeout(() => this.remove(toast), 2000);
    });
    
    this.container.appendChild(toast);
    
    // Limit to 5 toasts
    const toasts = this.container.querySelectorAll('.toast');
    if (toasts.length > 5) {
      this.remove(toasts[0]);
    }
    
    return toast;
  }
  
  remove(toast) {
    if (!toast || !toast.parentElement) return;
    
    toast.style.animation = 'slideIn 300ms ease reverse';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }
  
  success(message, title = 'Success') {
    return this.show(message, 'success', title);
  }
  
  error(message, title = 'Error') {
    return this.show(message, 'error', title, 8000);
  }
  
  warning(message, title = 'Warning') {
    return this.show(message, 'warning', title);
  }
  
  info(message, title = 'Info') {
    return this.show(message, 'info', title);
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

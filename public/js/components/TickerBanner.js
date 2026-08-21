// public/js/components/TickerBanner.js - Scrolling ticker banner
export class TickerBanner {
  constructor() {
    this.track = null;
    this.messages = [];
    this.isRunning = false;
    this.animationId = null;
    this.position = 0;
    this.speed = 0.5; // pixels per frame
  }
  
  async start() {
    this.track = document.getElementById('ticker-track');
    if (!this.track) return;
    
    // Load initial messages
    await this.loadMessages();
    
    // Start animation
    this.isRunning = true;
    this.animate();
    
    // Listen for new messages from WebSocket
    if (window.App.ws) {
      this.unsubscribe = window.App.ws.on('ticker', (data) => {
        this.addMessage(data.message);
      });
    }
    
    // Periodically refresh messages
    this.refreshInterval = setInterval(() => this.loadMessages(), 60000);
  }
  
  async loadMessages() {
    try {
      const response = await window.API.getTickerMessages();
      if (response.messages && response.messages.length > 0) {
        this.messages = response.messages;
        this.render();
      }
    } catch (e) {
      console.error('Failed to load ticker messages:', e);
    }
  }
  
  addMessage(message) {
    // Add to front of array
    this.messages.unshift(message);
    // Keep only latest 50
    this.messages = this.messages.slice(0, 50);
    this.render();
  }
  
  render() {
    if (!this.track) return;
    
    // Duplicate messages for seamless looping
    const allMessages = [...this.messages, ...this.messages];
    
    this.track.innerHTML = allMessages.map(msg => `
      <div class="ticker-item">
        <span>${this.escapeHtml(msg)}</span>
      </div>
    `).join('');
  }
  
  animate() {
    if (!this.isRunning || !this.track) return;
    
    const trackWidth = this.track.scrollWidth / 2; // Half because we duplicate
    const containerWidth = this.track.parentElement.offsetWidth;
    
    this.position -= this.speed;
    
    if (Math.abs(this.position) >= trackWidth) {
      this.position = 0;
    }
    
    this.track.style.transform = `translateX(${this.position}px)`;
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  setSpeed(speed) {
    this.speed = speed;
  }
  
  pause() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  resume() {
    this.isRunning = true;
    this.animate();
  }
  
  stop() {
    this.pause();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

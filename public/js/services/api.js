// public/js/services/api.js - API client for Crainee platform
class APIClient {
  constructor() {
    this.baseURL = '/api';
    this.token = null;
  }
  
  setToken(token) {
    this.token = token;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const config = {
      ...options,
      headers
    };
    
    if (options.body && typeof options.body !== 'string') {
      config.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }
  
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }
  
  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  }
  
  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  }
  
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
  
  // Auth
  login(email, password) {
    return this.post('/auth/login', { email, password });
  }
  
  register(email, password, fullName) {
    return this.post('/auth/register', { email, password, fullName });
  }
  
  me() {
    return this.get('/auth/me');
  }
  
  // Market data
  getAssets() {
    return this.get('/market/assets');
  }
  
  getAsset(id) {
    return this.get(`/market/assets/${id}`);
  }
  
  getOrderBook(assetId, limit = 50) {
    return this.get(`/market/orderbook/${assetId}?limit=${limit}`);
  }
  
  // Portfolio
  getHoldings() {
    return this.get('/portfolio/holdings');
  }
  
  getBalance() {
    return this.get('/portfolio/balance');
  }
  
  getTransactions(limit = 100) {
    return this.get(`/portfolio/transactions?limit=${limit}`);
  }
  
  // Trading
  buy(assetId, quantity) {
    return this.post('/trading/buy', { assetId, quantity });
  }
  
  sell(assetId, quantity) {
    return this.post('/trading/sell', { assetId, quantity });
  }
  
  // Withdrawal
  requestWithdrawal(amount, bankName) {
    return this.post('/withdrawal/request', { amount, bankName });
  }
  
  // Admin
  getUsers() {
    return this.get('/admin/users');
  }
  
  getAdminStats() {
    return this.get('/admin/dashboard/stats');
  }
  
  updateUserTier(userId, tier) {
    return this.post(`/admin/users/${userId}/tier`, { tier });
  }
  
  updateUserBalance(userId, amount) {
    return this.post(`/admin/users/${userId}/balance`, { amount });
  }
  
  getSettings() {
    return this.get('/admin/settings');
  }
  
  updateSetting(key, value) {
    return this.put(`/admin/settings/${key}`, { value });
  }
  
  getWithdrawalBlocks() {
    return this.get('/admin/withdrawal-blocks');
  }
  
  addWithdrawalBlock(data) {
    return this.post('/admin/withdrawal-blocks', data);
  }
  
  updateWithdrawalBlock(id, data) {
    return this.put(`/admin/withdrawal-blocks/${id}`, data);
  }
  
  deleteWithdrawalBlock(id) {
    return this.delete(`/admin/withdrawal-blocks/${id}`);
  }
  
  getTickerMessages() {
    return this.get('/ticker/messages');
  }
  
  addTickerMessage(message) {
    return this.post('/admin/ticker/add', { message });
  }
  
  generateTickerMessages(count = 5) {
    return this.post('/admin/ticker/generate', { count });
  }
  
  getAllTransactions(limit = 500) {
    return this.get(`/admin/transactions?limit=${limit}`);
  }
}

// Export singleton
export const API = new APIClient();
window.API = API;

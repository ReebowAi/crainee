// public/js/dashboard.js
class DashboardApp {
constructor() {
this.currentPage = 'overview';
this.currentAsset = 'AAPL';
this.currentAssetId = null;
this.assets = [];
this.user = null;
this.orderBookUpdateTimer = null;
this.tickerMessages = [];
this.unsubscribers = [];
this.init();
}
async init() {
await this.loadUser();
this.bindUI();
this.setupWebSocket();
await this.loadDashboardData();
await this.loadAssets();
this.startOrderBookUpdates();
this.startTickerDisplay();
}
// Authentication & User
async loadUser() {
try {
const res = await fetch('/api/auth/me', { credentials: 'include' });
if (!res.ok) throw new Error('Not authenticated'); const data = await res.json();
this.user = data.user;
this.updateUserUI();
} catch (err) {
window.location.href = '/';
}
}
updateUserUI() {
document.getElementById('userName').textContent = this.user.fullName ||
this.user.email.split('@')[0];
document.getElementById('dropdownUserEmail').textContent = this.user.email;
document.getElementById('dropdownUserTier').textContent = this.user.tier;
document.getElementById('dropdownUserTier').className = `badge
badge-tier-${this.user.tier.toLowerCase()}`;
document.getElementById('sidebarTier').textContent = this.user.tier;
document.getElementById('sidebarTier').className = `tier-current badge
badge-tier-${this.user.tier.toLowerCase()}`;
const tierOrder = ['Bronze', 'Silver', 'Gold', 'VIP'];
const currentIdx = tierOrder.indexOf(this.user.tier);
if (currentIdx < tierOrder.length - 1) {
document.getElementById('sidebarNextTier').textContent = tierOrder[currentIdx + 1];
} else {
document.getElementById('sidebarNextTier').textContent = 'MAX';
}
}
// UI Binding
bindUI() {
// Sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', () =>
this.toggleSidebar());
document.getElementById('sidebarOverlay').addEventListener('click', () =>
this.closeSidebar());
// Navigation
document.querySelectorAll('.nav-link[data-page]').forEach(link => {
link.addEventListener('click', (e) => {
e.preventDefault();
this.switchPage(link.dataset.page);
});
}); // Quick Trade Modal
document.getElementById('quickBuyBtn').addEventListener('click', () =>
this.openQuickTrade('buy'));
document.getElementById('quickTradeModal').querySelector('.modal-close').addEventListener('
click', () => this.closeModal('quickTradeModal'));
document.getElementById('quickTradeModal').addEventListener('click', (e) => {
if (e.target === e.currentTarget) this.closeModal('quickTradeModal');
});
document.getElementById('submitQuickTrade').addEventListener('click', () =>
this.submitQuickTrade());
document.getElementById('qtOrderType').addEventListener('change', (e) => {
document.getElementById('qtLimitPriceGroup').style.display = e.target.value === 'limit' ?
'block' : 'none';
});
document.getElementById('qtSymbol').addEventListener('input', (e) =>
this.searchSymbols(e.target.value));
// User menu dropdown
const userMenu = document.getElementById('userMenu');
document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
userMenu.querySelector('.user-menu-trigger').addEventListener('click', () =>
this.toggleDropdown(userMenu));
document.addEventListener('click', (e) => {
if (!userMenu.contains(e.target)) userMenu.classList.remove('active');
});
// Portfolio chart range buttons
document.querySelectorAll('[data-range]').forEach(btn => {
btn.addEventListener('click', () => this.setPortfolioRange(btn.dataset.range));
});
// Trading desk asset type tabs
document.querySelectorAll('#assetTypeTabs [data-type]').forEach(btn => {
btn.addEventListener('click', () => this.switchAssetType(btn.dataset.type));
});
// Trading chart controls
document.getElementById('chartTimeframe').addEventListener('change', (e) =>
this.updateTradingChart());
document.getElementById('chartType').addEventListener('change', (e) =>
this.updateTradingChart());
document.getElementById('chartFullscreen').addEventListener('click', () =>
this.toggleChartFullscreen()); // Order form
document.getElementById('orderType').addEventListener('change', (e) =>
this.updateOrderForm());
document.getElementById('orderForm').addEventListener('submit', (e) => this.placeOrder(e));
document.querySelectorAll('.qty-btn').forEach(btn => {
btn.addEventListener('click', () => this.setQuantityPercent(btn.dataset.qty));
});
document.querySelectorAll('#orderSideTabs .tab-btn').forEach(btn => {
btn.addEventListener('click', () => this.switchOrderSide(btn.dataset.side));
});
document.getElementById('quantity').addEventListener('input', () =>
this.updateEstimatedTotal());
// Market movers tabs
document.querySelectorAll('#moversTabs .tab-btn').forEach(btn => {
btn.addEventListener('click', () => this.switchMoversTab(btn.dataset.mover));
});
// Order book depth
document.getElementById('orderBookDepth').addEventListener('change', () =>
this.updateOrderBook());
// Settings link
document.getElementById('settingsLink').addEventListener('click', (e) => {
e.preventDefault();
this.showSettingsModal();
});
}
// WebSocket Setup
setupWebSocket() {
this.unsubscribers.push(
window.wsManager.on('connected', () => this.onWSConnected()),
window.wsManager.on('disconnected', () => this.onWSDisconnected()),
window.wsManager.on('market:update', (data) => this.onMarketUpdate(data)),
window.wsManager.on('notification:banner', (data) => this.onNotificationBanner(data)),
window.wsManager.on('orderbook:update', (data) => this.onOrderBookUpdate(data)),
window.wsManager.on('portfolio:update', (data) => this.onPortfolioUpdate(data))
);
// Subscribe to channels
window.wsManager.subscribe({ type: 'subscribe', channel: 'market' });
window.wsManager.subscribe({ type: 'subscribe', channel: 'notifications' }); }
onWSConnected() {
document.getElementById('marketStatus').classList.add('connected');
this.loadDashboardData();
}
onWSDisconnected() {
document.getElementById('marketStatus').classList.remove('connected');
}
onMarketUpdate(data) {
if (data.assets) {
this.assets = data.assets;
this.updateMarketData(data.assets);
}
if (data.portfolio) {
this.updatePortfolioSummary(data.portfolio);
}
}
onNotificationBanner(data) {
this.tickerMessages.unshift(data.message);
if (this.tickerMessages.length > 20) this.tickerMessages.pop();
this.renderTicker();
}
onOrderBookUpdate(data) {
if (data.assetId === this.currentAssetId) {
this.renderOrderBook(data);
}
}
onPortfolioUpdate(data) {
this.updatePortfolioSummary(data);
}
// Page Navigation
switchPage(pageId) {
// Update nav links
document.querySelectorAll('.nav-link').forEach(l => {
l.classList.toggle('active', l.dataset.page === pageId);
}); // Update pages
document.querySelectorAll('.page').forEach(p => {
p.classList.toggle('active', p.dataset.page === pageId);
});
this.currentPage = pageId;
this.closeSidebar();
// Update header
const titles = {
overview: { title: 'Overview', subtitle: 'Your trading dashboard at a glance' },
trading: { title: 'Trading Desk', subtitle: 'Real-time charts & order entry' },
portfolio: { title: 'Portfolio', subtitle: 'Holdings, performance & analytics' },
markets: { title: 'Markets', subtitle: 'Browse all available instruments' },
transactions: { title: 'Transaction History', subtitle: 'Complete trading history' },
tier: { title: 'Tier Status', subtitle: 'Your progression & benefits' }
};
const t = titles[pageId] || { title: pageId, subtitle: '' };
document.getElementById('pageTitle').textContent = t.title;
document.getElementById('pageSubtitle').textContent = t.subtitle;
// Load page-specific data
if (pageId === 'trading') this.loadTradingDesk();
else if (pageId === 'portfolio') this.loadPortfolioPage();
else if (pageId === 'markets') this.loadMarketsPage();
else if (pageId === 'transactions') this.loadTransactionsPage();
else if (pageId === 'tier') this.loadTierPage();
}
toggleSidebar() {
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const toggle = document.getElementById('sidebarToggle');
const isOpen = sidebar.classList.toggle('open');
overlay.classList.toggle('active', isOpen);
toggle.setAttribute('aria-expanded', isOpen);
}
closeSidebar() {
document.getElementById('sidebar').classList.remove('open');
document.getElementById('sidebarOverlay').classList.remove('active');
document.getElementById('sidebarToggle').setAttribute('aria-expanded', 'false');
} toggleDropdown(menu) {
menu.classList.toggle('active');
menu.querySelector('.user-menu-trigger').setAttribute('aria-expanded',
menu.classList.contains('active'));
}
// Data Loading
async loadDashboardData() {
try {
const res = await fetch('/api/dashboard/overview', { credentials: 'include' });
if (!res.ok) throw new Error('Failed to load');
const data = await res.json();
this.renderDashboard(data);
} catch (err) {
console.error('Dashboard load error:', err);
this.showToast('Failed to load dashboard data', 'error');
}
}
async loadAssets() {
try {
const res = await fetch('/api/dashboard/market', { credentials: 'include' });
if (!res.ok) throw new Error('Failed to load');
const data = await res.json();
this.assets = data.assets;
this.populateAssetSelectors();
this.updateMarketData(this.assets);
} catch (err) {
console.error('Assets load error:', err);
}
}
renderDashboard(data) {
// Update header balance
this.updatePortfolioSummary(data.portfolio);
// Update tier progress
this.updateTierProgress(data.tierInfo);
// Portfolio chart
this.renderPortfolioChart(data.portfolio.history || []);
// Allocation chart
this.renderAllocationChart(data.portfolio.holdings); // Holdings table
this.renderHoldingsTable(data.portfolio.holdings);
// Market movers
this.renderMovers(data.marketMovers || {});
// Recent activity
this.renderActivity(data.portfolio.recentTransactions || []);
}
updatePortfolioSummary(portfolio) {
const totalValue = portfolio.totalValue || 0;
const cashBalance = portfolio.cashBalance || 0;
const investedValue = portfolio.investedValue || 0;
const dayPnl = portfolio.dayPnl || 0;
const dayPnlPct = portfolio.dayPnlPct || 0;
document.getElementById('totalPortfolio').textContent = this.formatCurrency(totalValue);
document.getElementById('cashBalance').textContent = this.formatCurrency(cashBalance);
document.getElementById('investedValue').textContent = this.formatCurrency(investedValue);
document.getElementById('positionsCount').textContent = `${portfolio.holdings?.length || 0}
positions`;
document.getElementById('dayPnl').textContent = this.formatCurrency(dayPnl, true);
document.getElementById('dayPnlPct').textContent = `(${dayPnlPct >= 0 ? '+' :
''}${dayPnlPct.toFixed(2)}%)`;
document.getElementById('headerBalance').textContent = this.formatCurrency(cashBalance);
document.getElementById('headerChange').textContent = this.formatCurrency(dayPnl, true)
+ ` (${dayPnlPct >= 0 ? '+' : ''}${dayPnlPct.toFixed(2)}%)`;
document.getElementById('headerChange').className = `balance-change ${dayPnl >= 0 ?
'positive' : 'negative'}`;
document.getElementById('buyingPower').textContent = this.formatCurrency(cashBalance);
document.getElementById('cashAvailable').textContent = this.formatCurrency(cashBalance);
document.getElementById('portfolioVal').textContent = this.formatCurrency(totalValue);
}
updateTierProgress(tierInfo) {
if (!tierInfo) return;
const progress = tierInfo.progress || 0;
document.getElementById('tierProgressBar').style.width = `${progress}%`; document.getElementById('sidebarCurrentBalance').textContent =
this.formatCurrency(tierInfo.balance);
document.getElementById('sidebarRequiredBalance').textContent =
this.formatCurrency(tierInfo.nextTier?.required || 0);
}
// Portfolio Chart
renderPortfolioChart(history) {
if (history.length === 0) {
// Generate internal data history
history = this.generateMockHistory(24);
}
const labels = history.map(h => {
const d = new Date(h.timestamp || h.time);
return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});
const values = history.map(h => h.value || h.totalValue);
window.chartManager.createPortfolioChart('portfolioChart', { labels, values });
}
setPortfolioRange(range) {
document.querySelectorAll('[data-range]').forEach(b => {
b.classList.toggle('active', b.dataset.range === range);
b.setAttribute('aria-pressed', b.dataset.range === range);
});
// In real app, fetch data for this range
const hours = { '1D': 24, '1W': 168, '1M': 720, '3M': 2160, 'ALL': 8760 };
const history = this.generateMockHistory(hours[range] || 24);
this.renderPortfolioChart(history);
}
generateMockHistory(hours) {
const now = Date.now();
const msPerHour = 3600000;
let value = 10000;
return Array.from({ length: Math.min(hours, 100) }, (_, i) => {
const time = now - (hours - i) * msPerHour;
value *= 1 + (Math.random() - 0.5) * 0.02;
return { time, value: Math.max(1000, value) };
});
} // Allocation Chart
renderAllocationChart(holdings) {
if (!holdings || holdings.length === 0) {
window.chartManager.createAllocationChart('allocationChart', 'allocationLegend', {
labels: ['Cash'],
values: [10000]
});
return;
}
const typeTotals = {};
for (const h of holdings) {
const type = h.type || 'stock';
typeTotals[type] = (typeTotals[type] || 0) + h.value;
}
const labels = Object.keys(typeTotals).map(t => t.charAt(0).toUpperCase() + t.slice(1));
const values = Object.values(typeTotals);
window.chartManager.createAllocationChart('allocationChart', 'allocationLegend', { labels,
values });
}
// Holdings Table
renderHoldingsTable(holdings) {
const tbody = document.querySelector('#holdingsTable tbody');
if (!holdings || holdings.length === 0) {
tbody.innerHTML = '<tr class="empty-row"><td colspan="7" class="text-center py-5">No
holdings yet. Start trading to build your portfolio.</td></tr>';
return;
}
tbody.innerHTML = holdings.map(h => {
const pnl = (h.currentPrice - h.avgBuyPrice) * h.quantity;
const pnlPct = h.avgBuyPrice > 0 ? ((h.currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100
: 0;
return `
<tr>
<td>
<div class="asset-cell">
<span class="asset-symbol">${h.symbol}</span>
<span class="asset-name">${h.name}</span>
</div> </td>
<td class="text-right">${this.formatQuantity(h.quantity)}</td>
<td class="text-right">${this.formatCurrency(h.avgBuyPrice)}</td>
<td class="text-right">${this.formatCurrency(h.currentPrice)}</td>
<td class="text-right">${this.formatCurrency(h.value)}</td>
<td class="text-right ${pnl >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(pnl,
true)}</td>
<td class="text-right ${pnlPct >= 0 ? 'positive' : 'negative'}">${pnlPct >= 0 ? '+' :
''}${pnlPct.toFixed(2)}%</td>
</tr>
`;
}).join('');
}
// Market Movers
renderMovers(movers) {
this.currentMoversType = 'gainers';
this.marketMovers = movers;
this.renderMoversTab('gainers');
}
switchMoversTab(type) {
document.querySelectorAll('#moversTabs .tab-btn').forEach(b => {
b.classList.toggle('active', b.dataset.mover === type);
b.setAttribute('aria-selected', b.dataset.mover === type);
});
this.currentMoversType = type;
this.renderMoversTab(type);
}
renderMoversTab(type) {
const movers = this.marketMovers[type] || [];
const tbody = document.getElementById('moversBody');
if (movers.length === 0) {
tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No data
available</td></tr>';
return;
}
tbody.innerHTML = movers.map(m => `
<tr class="mover-row">
<td><span class="mover-symbol">${m.symbol}</span></td>
<td><span class="mover-price">${this.formatCurrency(m.currentPrice)}</span></td> <td class="text-right"><span class="mover-change ${m.change24h >= 0 ? 'positive' :
'negative'}">${m.change24h >= 0 ? '+' : ''}${m.change24h.toFixed(2)}%</span></td>
<td class="text-right"><span
class="mover-volume">${this.formatNumber(m.volume24h)}</span></td>
</tr>
`).join('');
}
// Activity
renderActivity(transactions) {
const tbody = document.getElementById('activityBody');
if (!transactions || transactions.length === 0) {
tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No recent
activity</td></tr>';
return;
}
tbody.innerHTML = transactions.slice(0, 20).map(t => {
const time = new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const typeClass = t.type || 'unknown';
const amountClass = ['buy', 'deposit'].includes(t.type) ? 'positive' : 'negative';
return `
<tr>
<td class="activity-time">${time}</td>
<td><span class="activity-type ${typeClass}">${t.type?.toUpperCase() ||
'N/A'}</span></td>
<td class="activity-asset">${t.symbol || '-'}</td>
<td class="activity-details">${t.quantity ? `${t.quantity} @ ${this.formatCurrency(t.price)}` :
''}</td>
<td class="text-right activity-amount ${amountClass}">${this.formatCurrency(t.total || 0,
true)}</td>
<td><span class="activity-status ${t.status || 'completed'}">${t.status ||
'completed'}</span></td>
</tr>
`;
}).join('');
}
// Asset Selectors
populateAssetSelectors() {
const tradingSymbol = document.getElementById('tradingSymbol');
const tradingName = document.getElementById('tradingName');
// Find first asset const firstAsset = this.assets.find(a => a.type === 'stock') || this.assets[0];
if (firstAsset) {
this.currentAsset = firstAsset.symbol;
this.currentAssetId = firstAsset.id;
tradingSymbol.textContent = firstAsset.symbol;
tradingName.textContent = firstAsset.name;
}
}
switchAssetType(type) {
document.querySelectorAll('#assetTypeTabs [data-type]').forEach(b => {
b.classList.toggle('active', b.dataset.type === type);
b.setAttribute('aria-selected', b.dataset.type === type);
});
const assetsOfType = this.assets.filter(a => a.type === type);
if (assetsOfType.length > 0) {
this.selectAsset(assetsOfType[0]);
}
}
selectAsset(asset) {
this.currentAsset = asset.symbol;
this.currentAssetId = asset.id;
document.getElementById('tradingSymbol').textContent = asset.symbol;
document.getElementById('tradingName').textContent = asset.name;
this.updateTradingChart();
this.updateOrderBook();
this.updateQuoteDisplay(asset);
this.updateEstimatedTotal();
}
updateQuoteDisplay(asset) {
document.getElementById('quotePrice').textContent =
this.formatCurrency(asset.currentPrice);
const changeClass = asset.change24h >= 0 ? 'positive' : 'negative';
document.getElementById('quoteChange').textContent = `${asset.change24h >= 0 ? '+' :
''}${asset.change24h.toFixed(2)} (${asset.change24h.toFixed(2)}%)`;
document.getElementById('quoteChange').className = `quote-change ${changeClass}`;
document.getElementById('quoteBid').textContent = this.formatCurrency(asset.bid);
document.getElementById('quoteAsk').textContent = this.formatCurrency(asset.ask);
document.getElementById('quoteSpread').textContent =
this.formatCurrency(Math.abs(asset.ask - asset.bid));
} // Trading Chart
async updateTradingChart() {
const timeframe = document.getElementById('chartTimeframe').value;
const type = document.getElementById('chartType').value;
try {
const res = await fetch(`/api/dashboard/history/${this.currentAssetId}?limit=200`, {
credentials: 'include' });
if (!res.ok) return;
const data = await res.json();
if (type === 'candlestick' && data.history) {
window.chartManager.createCandlestickChart('tradingChart', data.history);
} else {
const labels = data.history.map(h => new Date(h.timestamp).toLocaleTimeString());
const values = data.history.map(h => h.close);
window.chartManager.createLineChart('tradingChart', { labels, values }, { type });
}
} catch (err) {
console.error('Chart load error:', err);
}
}
// Order Book
async loadOrderBook() {
try {
const depth = document.getElementById('orderBookDepth').value;
const res = await fetch(`/api/dashboard/orderbook/${this.currentAssetId}?depth=${depth}`, {
credentials: 'include' });
if (!res.ok) return;
const data = await res.json();
this.renderOrderBook(data);
} catch (err) {
console.error('Order book error:', err);
}
}
renderOrderBook(data) {
const asksContainer = document.getElementById('obAsks');
const bidsContainer = document.getElementById('obBids');
const spreadContainer = document.getElementById('obSpread');
if (!data.bids || !data.asks) return; let askTotal = 0;
asksContainer.innerHTML = [...data.asks].reverse().map(a => {
askTotal += a.size;
return `
<div class="ob-row" style="opacity: ${a.size / (data.asks[0]?.size || 1)}">
<div class="ob-price">${this.formatCurrency(a.price)}</div>
<div class="ob-size">${this.formatQuantity(a.size)}</div>
<div class="ob-total">${this.formatQuantity(askTotal)}</div>
</div>
`;
}).join('');
let bidTotal = 0;
bidsContainer.innerHTML = data.bids.map(b => {
bidTotal += b.size;
return `
<div class="ob-row" style="opacity: ${b.size / (data.bids[0]?.size || 1)}">
<div class="ob-price">${this.formatCurrency(b.price)}</div>
<div class="ob-size">${this.formatQuantity(b.size)}</div>
<div class="ob-total">${this.formatQuantity(bidTotal)}</div>
</div>
`;
}).join('');
const spread = data.asks[0]?.price - data.bids[0]?.price;
spreadContainer.innerHTML = `
<div class="ob-row" style="background: linear-gradient(90deg, rgba(206,17,38,0.1),
rgba(40,167,69,0.1)); font-weight: 600;">
<div class="ob-price">SPREAD</div>
<div class="ob-size">${this.formatCurrency(spread)}</div>
<div class="ob-total">${((spread / data.bids[0].price) * 10000).toFixed(1)} bps</div>
</div>
`;
}
startOrderBookUpdates() {
// Update every 500ms
this.orderBookUpdateTimer = setInterval(() => {
if (this.currentAssetId && document.getElementById('autoRefreshOB')?.checked) {
this.loadOrderBook();
}
}, 500);
} updateOrderBook() {
this.loadOrderBook();
}
// Order Form
updateOrderForm() {
const orderType = document.getElementById('orderType').value;
document.getElementById('limitPriceGroup').style.display = ['limit',
'stop_limit'].includes(orderType) ? 'block' : 'none';
document.getElementById('stopPriceGroup').style.display = ['stop',
'stop_limit'].includes(orderType) ? 'block' : 'none';
this.updateEstimatedTotal();
}
switchOrderSide(side) {
document.querySelectorAll('#orderSideTabs .tab-btn').forEach(b => {
b.classList.toggle('active', b.dataset.side === side);
b.setAttribute('aria-selected', b.dataset.side === side);
});
document.getElementById('placeOrderText').textContent = side === 'buy' ? 'Buy Market' :
'Sell Market';
const btn = document.getElementById('placeOrderBtn');
btn.classList.toggle('btn-buy', side === 'buy');
btn.classList.toggle('btn-sell', side === 'sell');
this.updateEstimatedTotal();
}
setQuantityPercent(percent) {
const cash = this.user?.virtualBalance || 0;
const asset = this.assets.find(a => a.id === this.currentAssetId);
if (!asset) return;
const maxQty = (cash * percent / 100) / asset.currentPrice;
document.getElementById('quantity').value = maxQty.toFixed(asset.decimalPlaces || 8);
this.updateEstimatedTotal();
}
updateEstimatedTotal() {
const qty = parseFloat(document.getElementById('quantity').value) || 0;
const orderType = document.getElementById('orderType').value;
const limitPrice = parseFloat(document.getElementById('limitPrice').value) || 0;
const asset = this.assets.find(a => a.id === this.currentAssetId);
const tierConfig = this.getTierConfig(); if (!asset || qty <= 0) {
document.getElementById('estimatedTotal').textContent = '$0.00';
document.getElementById('commissionInfo').textContent = 'Commission: $0.00';
return;
}
const price = ['limit', 'stop_limit'].includes(orderType) && limitPrice > 0 ? limitPrice :
asset.currentPrice;
const total = price * qty;
const commission = total * tierConfig.commissionRate;
const grandTotal = total + commission;
document.getElementById('estimatedTotal').textContent = this.formatCurrency(grandTotal);
document.getElementById('commissionInfo').textContent = `Commission:
${this.formatCurrency(commission)} (${(tierConfig.commissionRate * 10000).toFixed(0)} bps)`;
// Check tier warning
const side = document.querySelector('#orderSideTabs .tab-btn.active')?.dataset.side || 'buy';
if (side === 'buy' && grandTotal > this.user.virtualBalance) {
document.getElementById('tierWarning').style.display = 'block';
document.getElementById('tierWarning').textContent = `Insufficient funds. Available:
${this.formatCurrency(this.user.virtualBalance)}`;
} else {
document.getElementById('tierWarning').style.display = 'none';
}
}
getTierConfig() {
const configs = {
Bronze: { maxLeverage: 2, dailyLimit: 5000, maxPositions: 5, commissionRate: 0.0025 },
Silver: { maxLeverage: 5, dailyLimit: 25000, maxPositions: 15, commissionRate: 0.0015 },
Gold: { maxLeverage: 10, dailyLimit: 100000, maxPositions: 50, commissionRate: 0.0008 },
VIP: { maxLeverage: 20, dailyLimit: 1000000, maxPositions: 200, commissionRate: 0.0002 }
};
return configs[this.user?.tier] || configs.Bronze;
}
async placeOrder(e) {
e.preventDefault();
const side = document.querySelector('#orderSideTabs .tab-btn.active')?.dataset.side;
const assetId = this.currentAssetId;
const quantity = parseFloat(document.getElementById('quantity').value); const orderType = document.getElementById('orderType').value;
const price = orderType === 'limit' ? parseFloat(document.getElementById('limitPrice').value)
: undefined;
const stopPrice = ['stop', 'stop_limit'].includes(orderType) ?
parseFloat(document.getElementById('stopPrice').value) : undefined;
if (!assetId || !quantity || quantity <= 0) {
this.showToast('Invalid order parameters', 'error');
return;
}
const btn = document.getElementById('placeOrderBtn');
btn.disabled = true;
btn.innerHTML = '<span class="spinner"></span> Placing...';
try {
const res = await fetch('/api/dashboard/order', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
credentials: 'include',
body: JSON.stringify({ assetId, type: side, quantity, orderType, price, stopPrice })
});
const data = await res.json();
if (!res.ok) {
if (data.blocked) {
this.showToast(`Order blocked: ${data.error}`, 'error');
} else {
this.showToast(data.error || 'Order failed', 'error');
}
return;
}
this.showToast(`${side.toUpperCase()} order placed successfully!`, 'success');
this.loadDashboardData();
this.loadOrderBook();
// Reset form
document.getElementById('quantity').value = '';
this.updateEstimatedTotal();
} catch (err) {
console.error('Order error:', err); this.showToast('Order failed', 'error');
} finally {
btn.disabled = false;
btn.innerHTML = side === 'buy' ? 'Buy Market' : 'Sell Market';
}
}
// Quick Trade Modal
openQuickTrade(side) {
const modal = document.getElementById('quickTradeModal');
modal.classList.add('active');
document.getElementById('qtSide').value = side;
document.getElementById('qtSymbol').value = this.currentAsset;
document.getElementById('qtQuantity').value = '';
}
closeModal(id) {
document.getElementById(id).classList.remove('active');
}
async searchSymbols(query) {
if (query.length < 1) return;
const results = this.assets.filter(a =>
a.symbol.toLowerCase().includes(query.toLowerCase()) ||
a.name.toLowerCase().includes(query.toLowerCase())
).slice(0, 10);
const container = document.getElementById('qtSymbolResults');
if (results.length === 0) {
container.classList.remove('active');
return;
}
container.innerHTML = results.map(a => `
<div class="symbol-result-item" data-symbol="${a.symbol}" data-id="${a.id}">
<div class="symbol-result-main">
<span class="symbol-result-symbol">${a.symbol}</span>
<span class="symbol-result-name">${a.name}</span>
</div>
<span class="symbol-result-type">${a.type}</span>
</div>
`).join('');
container.classList.add('active'); container.querySelectorAll('.symbol-result-item').forEach(item => {
item.addEventListener('click', () => {
document.getElementById('qtSymbol').value = item.dataset.symbol;
container.classList.remove('active');
});
});
}
async submitQuickTrade() {
const symbol = document.getElementById('qtSymbol').value.toUpperCase();
const side = document.getElementById('qtSide').value;
const quantity = parseFloat(document.getElementById('qtQuantity').value);
const orderType = document.getElementById('qtOrderType').value;
const price = orderType === 'limit' ?
parseFloat(document.getElementById('qtLimitPrice').value) : undefined;
const asset = this.assets.find(a => a.symbol === symbol);
if (!asset) {
this.showToast('Asset not found', 'error');
return;
}
if (!quantity || quantity <= 0) {
this.showToast('Invalid quantity', 'error');
return;
}
try {
const res = await fetch('/api/dashboard/order', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
credentials: 'include',
body: JSON.stringify({ assetId: asset.id, type: side, quantity, orderType, price })
});
const data = await res.json();
if (!res.ok) throw new Error(data.error || 'Order failed');
this.showToast('Quick trade executed!', 'success');
this.closeModal('quickTradeModal');
this.loadDashboardData();
} catch (err) {
console.error('Quick trade error:', err); this.showToast(err.message, 'error');
}
}
}
// Trading desk load
loadTradingDesk() {
this.updateTradingChart();
this.loadOrderBook();
}
// Placeholder pages
loadPortfolioPage() { this.showToast('Portfolio page coming soon', 'info'); }
loadMarketsPage() { this.showToast('Markets page coming soon', 'info'); }
loadTransactionsPage() { this.showToast('Transactions page coming soon', 'info'); }
loadTierPage() { this.showToast('Tier page coming soon', 'info'); }
// Ticker banner
startTickerDisplay() {
setInterval(() => this.renderTicker(), 30000);
this.renderTicker();
}
renderTicker() {
const container = document.getElementById('tickerContent');
if (this.tickerMessages.length === 0) {
container.innerHTML = '📈 Trading desk active • Live market environment • &copy; 2026 crainee';
return;
}
container.innerHTML = this.tickerMessages.join(' • ') + ' • ';
}
// Formatters
formatCurrency(val, showSign = false) {
const sign = val >= 0 && showSign ? '+' : '';
return `${sign}$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2,
maximumFractionDigits: 2 })}`;
}
formatQuantity(val) {
return Number(val).toLocaleString(undefined, { minimumFractionDigits: 0,
maximumFractionDigits: 8 });
} formatNumber(val) {
if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
return val.toLocaleString();
}
// Toast notifications
showToast(message, type = 'info') {
const container = document.getElementById('toastContainer');
if (!container) return;
const toast = document.createElement('div');
toast.className = `toast toast-${type}`;
const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
toast.innerHTML = `
<div class="toast-content">
<span class="toast-icon">${icons[type]}</span>
<span class="toast-message">${message}</span>
<button class="toast-close" aria-label="Dismiss">&times;</button>
</div>
`;
container.appendChild(toast);
requestAnimationFrame(() => toast.classList.add('show'));
const dismiss = () => {
toast.classList.remove('show');
setTimeout(() => toast.remove(), 300);
};
toast.querySelector('.toast-close').addEventListener('click', dismiss);
setTimeout(dismiss, 5000);
}
// Settings modal (placeholder)
showSettingsModal() {
this.showToast('Settings panel coming soon', 'info');
}
// Chart fullscreen
toggleChartFullscreen() {
const chartCard = document.getElementById('tradingChart').closest('.card');
chartCard.classList.toggle('fullscreen'); document.body.style.overflow = chartCard.classList.contains('fullscreen') ? 'hidden' : '';
}
// Cleanup
destroy() {
clearInterval(this.orderBookUpdateTimer);
this.unsubscribers.forEach(u => u());
window.chartManager.destroyAll();
}
}
// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
window.dashboardApp = new DashboardApp();
});
// Cleanup on unload
window.addEventListener('beforeunload', () => {
if (window.dashboardApp) window.dashboardApp.destroy();
});

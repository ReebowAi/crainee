// public/js/pages/trading.js - Trading page with full order entry (Crainee Institutional)
export class Trading {
  constructor(container) {
    this.container = container;
    this.asset = null;
    this.orderbook = null;
    this.priceUnsubscriber = null;
    this.orderbookUnsubscriber = null;
    this.side = 'buy';
    this.orderType = 'market';
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Trade</h1>
          <p class="page-subtitle">Execute trades with real-time market data</p>
        </div>
      </div>
      
      <div class="grid" style="grid-template-columns: 1fr 420px; gap: 24px;">
        <!-- Left: Chart & Order Book -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Asset Selector & Price -->
          <section class="card" id="trading-header" style="display: none;">
            <div class="card-content">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="badge badge-gray" id="trade-symbol" style="font-size: var(--text-base);">---</span>
                    <h2 id="trade-name" style="margin: 0; font-size: var(--text-xl);"></h2>
                    <span class="badge badge-gray" id="trade-type"></span>
                  </div>
                  <div style="display: flex; gap: 24px;">
                    <div>
                      <div class="stat-label">Mark Price</div>
                      <div class="stat-value mono" id="trade-mark-price">--</div>
                    </div>
                    <div>
                      <div class="stat-label">24h Change</div>
                      <div class="stat-change" id="trade-change">--</div>
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" id="trade-buy-tab" data-side="buy">Buy</button>
                  <button class="btn btn-secondary btn-sm" id="trade-sell-tab" data-side="sell">Sell</button>
                </div>
              </div>
            </div>
          </section>
          
          <!-- Chart Placeholder -->
          <section class="card" style="flex: 1; min-height: 350px;">
            <div class="card-header">
              <h2 class="card-title">Chart</h2>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-ghost btn-sm" data-timeframe="1m">1m</button>
                <button class="btn btn-ghost btn-sm active" data-timeframe="5m">5m</button>
                <button class="btn btn-ghost btn-sm" data-timeframe="15m">15m</button>
                <button class="btn btn-ghost btn-sm" data-timeframe="1h">1h</button>
                <button class="btn btn-ghost btn-sm" data-timeframe="4h">4h</button>
                <button class="btn btn-ghost btn-sm" data-timeframe="1d">1d</button>
              </div>
            </div>
            <div class="card-content" style="padding: 0; height: 350px;">
              <div class="chart-placeholder" id="trading-chart">
                <span>TradingView Lightweight Charts or Chart.js integration ready</span>
              </div>
            </div>
          </section>
          
          <!-- Order Book Depth -->
          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Order Book Depth</h2>
            </div>
            <div class="card-content" style="padding: 0; height: 280px;">
              <div class="orderbook" style="height: 100%;">
                <div class="orderbook-side buys" style="height: 100%; overflow-y: auto;">
                  <div class="orderbook-header buys" style="position: sticky; top: 0; z-index: 1;">
                    <span>BIDS</span>
                    <span id="depth-buy-total">0.00</span>
                  </div>
                  <div id="depth-buys"></div>
                </div>
                <div class="orderbook-side sells" style="height: 100%; overflow-y: auto;">
                  <div class="orderbook-header sells" style="position: sticky; top: 0; z-index: 1;">
                    <span>ASKS</span>
                    <span id="depth-sell-total">0.00</span>
                  </div>
                  <div id="depth-sells"></div>
                </div>
              </div>
            </div>
          </section>
        </div>
        
        <!-- Right: Order Entry Panel -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Order Form -->
          <section class="card" style="position: sticky; top: 24px;">
            <div class="card-header">
              <h2 class="card-title">Place Order</h2>
            </div>
            <div class="card-content">
              <form id="trade-form">
                <!-- Order Type -->
                <div class="form-group">
                  <label class="form-label">Order Type</label>
                  <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-secondary flex-1" id="type-market" data-type="market">Market</button>
                    <button type="button" class="btn btn-secondary flex-1" id="type-limit" data-type="limit">Limit</button>
                    <button type="button" class="btn btn-secondary flex-1" id="type-stop" data-type="stop">Stop</button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    // Event bindings for trading page will go here
  }
}

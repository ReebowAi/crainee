// public/js/charts.js
class ChartManager {
constructor() {
this.charts = new Map();
this.defaultColors = {
primary: '#CE1126',
success: '#28A745',
warning: '#FFC107',
info: '#17A2B8',
gold: '#FFB81C',
gray: ['#F1F3F5', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD', '#6C757D']
};
// Chart.js defaults
Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#6C757D';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.elements.line.tension = 0.3;
Chart.defaults.animation.duration = 300; }
// Portfolio Value Chart
createPortfolioChart(canvasId, data, options = {}) {
const ctx = document.getElementById(canvasId);
if (!ctx) return null;
this.destroy(canvasId);
const chart = new Chart(ctx, {
type: 'line',
data: {
labels: data.labels || [],
datasets: [{
label: 'Portfolio Value',
data: data.values || [],
borderColor: this.defaultColors.primary,
backgroundColor: 'rgba(206, 17, 38, 0.08)',
fill: true,
borderWidth: 2,
pointRadius: 0,
pointHoverRadius: 5,
pointBackgroundColor: this.defaultColors.primary,
pointBorderColor: '#fff',
pointBorderWidth: 2,
tension: 0.4
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
interaction: { mode: 'index', intersect: false },
plugins: {
legend: { display: false },
tooltip: {
backgroundColor: '#1A1A1A',
titleFont: { size: 12, weight: '600' },
bodyFont: { size: 11, family: 'var(--font-mono)' },
padding: 12,
cornerRadius: 8,
callbacks: {
label: (ctx) => ` $${ctx.parsed.y.toLocaleString()}`,
title: (ctx) => ctx[0].label
} }
},
scales: {
x: {
grid: { display: false, drawBorder: false },
ticks: { maxTicksLimit: 6, color: '#ADB5BD', font: { size: 10 } }
},
y: {
grid: { color: '#E9ECEF', drawBorder: false },
ticks: {
color: '#ADB5BD',
font: { size: 10, family: 'var(--font-mono)' },
callback: (val) => '$' + val.toLocaleString()
}
}
},
...options
}
});
this.charts.set(canvasId, chart);
return chart;
}
// Allocation Doughnut Chart
createAllocationChart(canvasId, legendId, data) {
const ctx = document.getElementById(canvasId);
if (!ctx) return null;
this.destroy(canvasId);
const colors = ['#CE1126', '#FFB81C', '#28A745', '#17A2B8', '#6C757D', '#ADB5BD'];
const chart = new Chart(ctx, {
type: 'doughnut',
data: {
labels: data.labels || [],
datasets: [{
data: data.values || [],
backgroundColor: colors.slice(0, data.values.length),
borderWidth: 0,
hoverOffset: 8
}]
}, options: {
responsive: true,
maintainAspectRatio: false,
cutout: '70%',
plugins: {
legend: { display: false },
tooltip: {
backgroundColor: '#1A1A1A',
callbacks: {
label: (ctx) => {
const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
const pct = ((ctx.parsed / total) * 100).toFixed(1);
return `${ctx.label}: $${ctx.parsed.toLocaleString()} (${pct}%)`;
}
}
}
}
}
});
this.charts.set(canvasId, chart);
// Render custom legend
this.renderAllocationLegend(legendId, data.labels, data.values, colors);
return chart;
}
renderAllocationLegend(legendId, labels, values, colors) {
const container = document.getElementById(legendId);
if (!container) return;
const total = values.reduce((a, b) => a + b, 0);
container.innerHTML = labels.map((label, i) => {
const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
return `
<div class="allocation-legend-item">
<div class="allocation-legend-color" style="background: ${colors[i]}"></div>
<span class="allocation-legend-label">${label}</span>
<span class="allocation-legend-value">$${values[i].toLocaleString()}</span>
<span class="allocation-legend-pct">${pct}%</span>
</div>
`;
}).join('');
} // Candlestick Chart (using custom Chart.js financial plugin approach)
createCandlestickChart(canvasId, data, options = {}) {
const ctx = document.getElementById(canvasId);
if (!ctx) return null;
this.destroy(canvasId);
// Convert OHLC data for Chart.js
const ohlcData = data.map(d => ({
x: d.time,
o: d.open,
h: d.high,
l: d.low,
c: d.close
}));
const chart = new Chart(ctx, {
type: 'candlestick',
data: { datasets: [{ label: 'Price', data: ohlcData }] },
options: {
responsive: true,
maintainAspectRatio: false,
interaction: { mode: 'index', intersect: false },
plugins: {
legend: { display: false },
tooltip: {
backgroundColor: '#1A1A1A',
callbacks: {
title: (ctx) => new Date(ctx[0].parsed.x).toLocaleString(),
label: (ctx) => [
`Open: $${ctx.parsed.o.toFixed(2)}`,
`High: $${ctx.parsed.h.toFixed(2)}`,
`Low: $${ctx.parsed.l.toFixed(2)}`,
`Close: $${ctx.parsed.c.toFixed(2)}`
]
}
}
},
scales: {
x: { type: 'time', time: { unit: 'hour' }, grid: { display: false } },
y: { grid: { color: '#E9ECEF' }, ticks: { callback: (val) => '$' + val.toFixed(2) } }
},
...options }
});
this.charts.set(canvasId, chart);
return chart;
}
// Line/Area Chart (fallback for candlestick)
createLineChart(canvasId, data, options = {}) {
const ctx = document.getElementById(canvasId);
if (!ctx) return null;
this.destroy(canvasId);
const isArea = options.type === 'area';
const chart = new Chart(ctx, {
type: 'line',
data: {
labels: data.labels || data.map(d => d.time),
datasets: [{
label: 'Price',
data: data.values || data.map(d => d.close || d.c),
borderColor: this.defaultColors.primary,
backgroundColor: isArea ? 'rgba(206, 17, 38, 0.1)' : 'transparent',
fill: isArea,
borderWidth: 1.5,
pointRadius: 0,
tension: 0.3
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
interaction: { mode: 'index', intersect: false },
plugins: { legend: { display: false } },
scales: {
x: { grid: { display: false }, ticks: { maxTicksLimit: 6, color: '#ADB5BD', font: { size: 10 } } },
y: { grid: { color: '#E9ECEF' }, ticks: { callback: (val) => '$' + val.toFixed(2), color:
'#ADB5BD', font: { size: 10 } } }
},
...options
}
}); this.charts.set(canvasId, chart);
return chart;
}
// Tier Distribution Bar Chart
createTierDistributionChart(canvasId, data) {
const ctx = document.getElementById(canvasId);
if (!ctx) return null;
this.destroy(canvasId);
const tierColors = {
Bronze: '#CD7F32',
Silver: '#C0C0C0',
Gold: '#FFD700',
VIP: '#1a1a1a'
};
const chart = new Chart(ctx, {
type: 'bar',
data: {
labels: Object.keys(data),
datasets: [{
label: 'Users',
data: Object.values(data),
backgroundColor: Object.keys(data).map(k => tierColors[k]),
borderWidth: 0,
borderRadius: 6,
maxBarThickness: 60
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
indexAxis: 'y',
plugins: { legend: { display: false } },
scales: {
x: { grid: { display: false }, ticks: { color: '#ADB5BD', font: { size: 10 } } },
y: { grid: { display: false }, ticks: { color: '#495057', font: { size: 11, weight: '600' } } }
}
}
}); this.charts.set(canvasId, chart);
return chart;
}
// Transaction Volume Chart
createTxVolumeChart(canvasId, data) {
const ctx = document.getElementById(canvasId);
if (!ctx) return null;
this.destroy(canvasId);
const chart = new Chart(ctx, {
type: 'bar',
data: {
labels: data.labels || [],
datasets: [
{
label: 'Buy',
data: data.buys || [],
backgroundColor: 'rgba(40, 167, 69, 0.7)',
borderWidth: 0,
borderRadius: 4
},
{
label: 'Sell',
data: data.sells || [],
backgroundColor: 'rgba(206, 17, 38, 0.7)',
borderWidth: 0,
borderRadius: 4
}
]
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
scales: {
x: { grid: { display: false }, ticks: { color: '#ADB5BD', font: { size: 10 } } },
y: { grid: { color: '#E9ECEF' }, stacked: true, ticks: { color: '#ADB5BD', font: { size: 10 } } }
}
}
});
this.charts.set(canvasId, chart); return chart;
}
updateChart(canvasId, newData) {
const chart = this.charts.get(canvasId);
if (!chart) return;
if (chart.config.type === 'line' || chart.config.type === 'candlestick') {
chart.data.labels = newData.labels || chart.data.labels;
chart.data.datasets[0].data = newData.values || newData.data || chart.data.datasets[0].data;
} else if (chart.config.type === 'doughnut') {
chart.data.labels = newData.labels || chart.data.labels;
chart.data.datasets[0].data = newData.values || chart.data.datasets[0].data;
} else if (chart.config.type === 'bar') {
chart.data.labels = newData.labels || chart.data.labels;
chart.data.datasets.forEach((ds, i) => {
ds.data = newData[ds.label.toLowerCase()] || ds.data;
});
}
chart.update('none');
}
destroy(canvasId) {
const chart = this.charts.get(canvasId);
if (chart) {
chart.destroy();
this.charts.delete(canvasId);
}
}
destroyAll() {
for (const [id, chart] of this.charts) {
chart.destroy();
}
this.charts.clear();
}
}
// Export singleton
window.chartManager = new ChartManager();

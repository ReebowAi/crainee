// public/js/charts.js
class ChartManager {
    constructor() {
        this.charts = {};
    }

    // Create or update Tier Distribution Chart (Doughnut/Pie)
    createTierDistributionChart(canvasId, tierData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart instance if it already exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = Object.keys(tierData);
        const data = Object.values(tierData);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.length ? labels : ['Bronze', 'Silver', 'Gold'],
                datasets: [{
                    data: data.length ? data : [1, 1, 1],
                    backgroundColor: [
                        '#cd7f32', // Bronze
                        '#c0c0c0', // Silver
                        '#ffd700', // Gold
                        '#8a2be2', // Platinum / Other
                        '#00ffff'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#a0aec0', boxWidth: 12 }
                    }
                }
            }
        });
    }

    // Create or update Transaction Volume Chart (Line/Bar)
    createTxVolumeChart(canvasId, volumeData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: volumeData.labels || [],
                datasets: [
                    {
                        label: 'Buys',
                        data: volumeData.buys || [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Sells',
                        data: volumeData.sells || [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#a0aec0', boxWidth: 12 }
                    }
                },
                scales: {
                    x: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                }
            }
        });
    }
}

// Export singleton to global scope
window.chartManager = new ChartManager();

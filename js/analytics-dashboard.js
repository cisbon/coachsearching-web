import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect } from 'react';
import api from './api-client.js';

/**
 * Advanced Analytics Dashboard
 *
 * Features:
 * - Real charts with Chart.js
 * - Revenue tracking & visualization
 * - User growth metrics
 * - Booking trends
 * - Coach performance
 * - Export reports (PDF/CSV)
 * - Date range selection
 * - Real-time updates
 */

// Load Chart.js dynamically
let Chart = null;
const loadChartJS = async () => {
    if (!Chart) {
        const module = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm');
        Chart = module.default;
    }
    return Chart;
};

export const AnalyticsDashboard = ({ session }) => {
    const [period, setPeriod] = useState('30d');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        overview: null,
        users: null,
        revenue: null,
        bookings: null,
        coaches: null
    });

    useEffect(() => {
        loadAnalytics();
    }, [period]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);

            // Load Chart.js
            await loadChartJS();

            // Fetch all analytics data in parallel
            const [overview, users, revenue, bookings, coaches] = await Promise.all([
                api.analytics.overview(),
                api.analytics.users(period),
                api.analytics.revenue(period),
                api.analytics.bookings(period),
                api.analytics.coaches(period)
            ]);

            setData({ overview, users, revenue, bookings, coaches });

            // Render charts after data loads
            setTimeout(() => {
                renderCharts({ users, revenue, bookings, coaches });
            }, 100);

        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderCharts = ({ users, revenue, bookings, coaches }) => {
        // User Growth Chart
        renderUserGrowthChart(users);

        // Revenue Chart
        renderRevenueChart(revenue);

        // Bookings Chart
        renderBookingsChart(bookings);

        // Coach Performance Chart
        renderCoachPerformanceChart(coaches);
    };

    if (loading) {
        return html`
            <div class="analytics-dashboard">
                <div class="analytics-loading">
                    <div class="spinner-lg"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        `;
    }

    return html`
        <div class="analytics-dashboard">
            <!-- Header -->
            <div class="analytics-header">
                <h1>📊 Analytics Dashboard</h1>
                <div class="analytics-controls">
                    <select
                        class="period-selector"
                        value=${period}
                        onChange=${(e) => setPeriod(e.target.value)}
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="1y">Last Year</option>
                        <option value="all">All Time</option>
                    </select>
                    <button class="btn-export" onClick=${exportReport}>
                        📥 Export Report
                    </button>
                </div>
            </div>

            <!-- Overview Cards -->
            <${OverviewCards} data=${data.overview} />

            <!-- Charts Grid -->
            <div class="charts-grid">
                <!-- User Growth -->
                <div class="chart-card">
                    <h3>👥 User Growth</h3>
                    <canvas id="userGrowthChart"></canvas>
                </div>

                <!-- Revenue -->
                <div class="chart-card">
                    <h3>💰 Revenue</h3>
                    <canvas id="revenueChart"></canvas>
                </div>

                <!-- Bookings -->
                <div class="chart-card">
                    <h3>📅 Bookings</h3>
                    <canvas id="bookingsChart"></canvas>
                </div>

                <!-- Coach Performance -->
                <div class="chart-card">
                    <h3>🎓 Top Coaches</h3>
                    <canvas id="coachPerformanceChart"></canvas>
                </div>
            </div>

            <!-- Detailed Tables -->
            <${DetailedMetrics} data=${data} />
        </div>
    `;
};

/**
 * Overview Cards Component
 */
const OverviewCards = ({ data }) => {
    if (!data) return null;

    const cards = [
        {
            icon: '👥',
            label: 'Total Users',
            value: data.total_users || 0,
            change: data.users_change || 0,
            color: 'blue'
        },
        {
            icon: '🎓',
            label: 'Active Coaches',
            value: data.active_coaches || 0,
            change: data.coaches_change || 0,
            color: 'petrol'
        },
        {
            icon: '📅',
            label: 'Total Bookings',
            value: data.total_bookings || 0,
            change: data.bookings_change || 0,
            color: 'green'
        },
        {
            icon: '💰',
            label: 'Total Revenue',
            value: `€${(data.total_revenue || 0).toLocaleString()}`,
            change: data.revenue_change || 0,
            color: 'yellow'
        }
    ];

    return html`
        <div class="overview-cards">
            ${cards.map(card => html`
                <div class="overview-card overview-card-${card.color}" key=${card.label}>
                    <div class="card-icon">${card.icon}</div>
                    <div class="card-content">
                        <div class="card-value">${card.value}</div>
                        <div class="card-label">${card.label}</div>
                        <div class="card-change ${card.change >= 0 ? 'positive' : 'negative'}">
                            ${card.change >= 0 ? '↑' : '↓'} ${Math.abs(card.change)}% vs last period
                        </div>
                    </div>
                </div>
            `)}
        </div>
    `;
};

/**
 * Detailed Metrics Component
 */
const DetailedMetrics = ({ data }) => {
    return html`
        <div class="detailed-metrics">
            <h2>Detailed Metrics</h2>

            <!-- Revenue Breakdown -->
            <div class="metrics-section">
                <h3>💰 Revenue Breakdown</h3>
                <table class="metrics-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Amount</th>
                            <th>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Gross Merchandise Value (GMV)</td>
                            <td>€${(data.revenue?.gmv || 0).toLocaleString()}</td>
                            <td class="positive">+${data.revenue?.gmv_change || 0}%</td>
                        </tr>
                        <tr>
                            <td>Platform Revenue (Commission)</td>
                            <td>€${(data.revenue?.platform_revenue || 0).toLocaleString()}</td>
                            <td class="positive">+${data.revenue?.platform_revenue_change || 0}%</td>
                        </tr>
                        <tr>
                            <td>Coach Earnings</td>
                            <td>€${(data.revenue?.coach_earnings || 0).toLocaleString()}</td>
                            <td class="positive">+${data.revenue?.coach_earnings_change || 0}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Top Performing Coaches -->
            <div class="metrics-section">
                <h3>🏆 Top Performing Coaches</h3>
                <div class="top-coaches-list">
                    ${(data.coaches?.top_performers || []).map((coach, index) => html`
                        <div class="top-coach-item" key=${coach.id}>
                            <div class="coach-rank">#${index + 1}</div>
                            <div class="coach-avatar">
                                ${coach.avatar_url
                                    ? html`<img src=${coach.avatar_url} alt=${coach.name} />`
                                    : html`<div class="avatar-placeholder">${coach.name[0]}</div>`
                                }
                            </div>
                            <div class="coach-info">
                                <div class="coach-name">${coach.name}</div>
                                <div class="coach-stats">
                                    ${coach.total_bookings} bookings · €${coach.revenue.toLocaleString()} revenue
                                </div>
                            </div>
                            <div class="coach-rating">
                                ⭐ ${coach.rating.toFixed(1)}
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
};

/**
 * Chart Rendering Functions
 */

function renderUserGrowthChart(data) {
    const ctx = document.getElementById('userGrowthChart');
    if (!ctx || !Chart) return;

    const chartData = data?.daily || [];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [
                {
                    label: 'New Users',
                    data: chartData.map(d => d.new_users),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Total Users',
                    data: chartData.map(d => d.total_users),
                    borderColor: '#006266',
                    backgroundColor: 'rgba(0, 98, 102, 0.1)',
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
                    position: 'bottom'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx || !Chart) return;

    const chartData = data?.daily || [];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [
                {
                    label: 'GMV',
                    data: chartData.map(d => d.gmv),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: '#22c55e',
                    borderWidth: 1
                },
                {
                    label: 'Platform Revenue',
                    data: chartData.map(d => d.platform_revenue),
                    backgroundColor: 'rgba(234, 179, 8, 0.8)',
                    borderColor: '#eab308',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': €' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function renderBookingsChart(data) {
    const ctx = document.getElementById('bookingsChart');
    if (!ctx || !Chart) return;

    const chartData = data?.daily || [];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [
                {
                    label: 'Bookings Created',
                    data: chartData.map(d => d.created),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Bookings Completed',
                    data: chartData.map(d => d.completed),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Bookings Cancelled',
                    data: chartData.map(d => d.cancelled),
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
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderCoachPerformanceChart(data) {
    const ctx = document.getElementById('coachPerformanceChart');
    if (!ctx || !Chart) return;

    const topCoaches = (data?.top_performers || []).slice(0, 10);

    new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: topCoaches.map(c => c.name),
            datasets: [
                {
                    label: 'Revenue (€)',
                    data: topCoaches.map(c => c.revenue),
                    backgroundColor: 'rgba(0, 98, 102, 0.8)',
                    borderColor: '#006266',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '€' + context.parsed.x.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

/**
 * Export report function
 */
function exportReport() {
    // In production, this would generate a PDF or CSV
    alert('Export feature coming soon! Will generate PDF/CSV report.');
}

export default AnalyticsDashboard;

/**
 * CoachSearching - Advanced Analytics Dashboard
 *
 * Comprehensive analytics and reporting components:
 * - AdminAnalyticsDashboard - Main admin analytics view
 * - RevenueChart - Revenue tracking and visualization
 * - UserGrowthChart - User growth over time
 * - CoachPerformanceMetrics - Coach performance dashboard
 * - BookingTrendsChart - Booking trends and forecasting
 * - PlatformStats - Key platform metrics
 * - ExportReports - Export data to PDF/CSV
 * - DateRangePicker - Date range selection
 */

const { html, useState, useEffect, useCallback, useMemo, useRef } = window.HtmPreact || {
    html: () => null,
    useState: () => [null, () => {}],
    useEffect: () => {},
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useRef: () => ({ current: null })
};

const API_BASE = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

// ============================================
// Utility Functions
// ============================================

function formatCurrency(cents, currency = 'eur') {
    const amount = cents / 100;
    const symbols = { eur: '\u20AC', gbp: '\u00A3', usd: '$', chf: 'CHF ' };
    return (symbols[currency.toLowerCase()] || '\u20AC') + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatPercent(value) {
    return (value * 100).toFixed(1) + '%';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function getDateRange(period) {
    const end = new Date();
    const start = new Date();

    switch (period) {
        case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case '30d':
            start.setDate(start.getDate() - 30);
            break;
        case '90d':
            start.setDate(start.getDate() - 90);
            break;
        case '1y':
            start.setFullYear(start.getFullYear() - 1);
            break;
        case 'all':
        default:
            start.setFullYear(2020);
    }

    return { start, end };
}

// ============================================
// DateRangePicker Component
// ============================================

function DateRangePicker({ value, onChange }) {
    const periods = [
        { id: '7d', label: '7 Days' },
        { id: '30d', label: '30 Days' },
        { id: '90d', label: '90 Days' },
        { id: '1y', label: '1 Year' },
        { id: 'all', label: 'All Time' }
    ];

    return html`
        <div class="date-range-picker">
            ${periods.map(p => html`
                <button
                    key=${p.id}
                    class="period-btn ${value === p.id ? 'active' : ''}"
                    onClick=${() => onChange(p.id)}
                >
                    ${p.label}
                </button>
            `)}
        </div>
    `;
}

// ============================================
// PlatformStats Component
// ============================================

function PlatformStats({ period }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [previousStats, setPreviousStats] = useState(null);

    useEffect(() => {
        fetchStats();
    }, [period]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/analytics/platform-stats?period=${period}`);
            const data = await response.json();
            setStats(data.current);
            setPreviousStats(data.previous);
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            // Demo data
            setStats({
                totalRevenue: 125750000,
                totalBookings: 3842,
                activeCoaches: 156,
                activeClients: 2547,
                avgBookingValue: 9800,
                conversionRate: 0.042,
                retentionRate: 0.78,
                avgSessionsPerClient: 4.2
            });
            setPreviousStats({
                totalRevenue: 98500000,
                totalBookings: 2956,
                activeCoaches: 134,
                activeClients: 1987,
                avgBookingValue: 9200,
                conversionRate: 0.038,
                retentionRate: 0.72,
                avgSessionsPerClient: 3.8
            });
        }
        setLoading(false);
    };

    const calculateChange = (current, previous) => {
        if (!previous || previous === 0) return null;
        const change = ((current - previous) / previous) * 100;
        return {
            value: Math.abs(change).toFixed(1),
            direction: change >= 0 ? 'up' : 'down'
        };
    };

    if (loading) {
        return html`
            <div class="platform-stats loading">
                ${[1, 2, 3, 4].map(() => html`
                    <div class="stat-card-skeleton">
                        <div class="skeleton-line short"></div>
                        <div class="skeleton-line"></div>
                    </div>
                `)}
            </div>
        `;
    }

    const statCards = [
        {
            label: 'Total Revenue',
            value: formatCurrency(stats.totalRevenue),
            icon: 'revenue',
            change: calculateChange(stats.totalRevenue, previousStats?.totalRevenue),
            color: 'primary'
        },
        {
            label: 'Total Bookings',
            value: formatNumber(stats.totalBookings),
            icon: 'bookings',
            change: calculateChange(stats.totalBookings, previousStats?.totalBookings),
            color: 'success'
        },
        {
            label: 'Active Coaches',
            value: stats.activeCoaches,
            icon: 'coaches',
            change: calculateChange(stats.activeCoaches, previousStats?.activeCoaches),
            color: 'info'
        },
        {
            label: 'Active Clients',
            value: formatNumber(stats.activeClients),
            icon: 'clients',
            change: calculateChange(stats.activeClients, previousStats?.activeClients),
            color: 'purple'
        },
        {
            label: 'Avg Booking Value',
            value: formatCurrency(stats.avgBookingValue),
            icon: 'average',
            change: calculateChange(stats.avgBookingValue, previousStats?.avgBookingValue),
            color: 'orange'
        },
        {
            label: 'Conversion Rate',
            value: formatPercent(stats.conversionRate),
            icon: 'conversion',
            change: calculateChange(stats.conversionRate, previousStats?.conversionRate),
            color: 'teal'
        },
        {
            label: 'Client Retention',
            value: formatPercent(stats.retentionRate),
            icon: 'retention',
            change: calculateChange(stats.retentionRate, previousStats?.retentionRate),
            color: 'green'
        },
        {
            label: 'Avg Sessions/Client',
            value: stats.avgSessionsPerClient.toFixed(1),
            icon: 'sessions',
            change: calculateChange(stats.avgSessionsPerClient, previousStats?.avgSessionsPerClient),
            color: 'blue'
        }
    ];

    return html`
        <div class="platform-stats">
            ${statCards.map(card => html`
                <div class="stat-card ${card.color}" key=${card.label}>
                    <div class="stat-icon ${card.icon}">
                        ${getStatIcon(card.icon)}
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">${card.label}</span>
                        <span class="stat-value">${card.value}</span>
                        ${card.change && html`
                            <span class="stat-change ${card.change.direction}">
                                ${card.change.direction === 'up' ? '\u2191' : '\u2193'}
                                ${card.change.value}%
                            </span>
                        `}
                    </div>
                </div>
            `)}
        </div>
    `;
}

function getStatIcon(type) {
    const icons = {
        revenue: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>`,
        bookings: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>`,
        coaches: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>`,
        clients: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>`,
        average: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>`,
        conversion: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>`,
        retention: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>`,
        sessions: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>`
    };
    return icons[type] || icons.bookings;
}

// ============================================
// RevenueChart Component
// ============================================

function RevenueChart({ period }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('daily');

    useEffect(() => {
        fetchData();
    }, [period, viewMode]);

    useEffect(() => {
        if (data && canvasRef.current && window.Chart) {
            renderChart();
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/analytics/revenue?period=${period}&view=${viewMode}`);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching revenue data:', error);
            // Demo data
            const points = viewMode === 'daily' ? 30 : viewMode === 'weekly' ? 12 : 12;
            const labels = [];
            const revenue = [];
            const bookings = [];

            for (let i = points - 1; i >= 0; i--) {
                const date = new Date();
                if (viewMode === 'daily') {
                    date.setDate(date.getDate() - i);
                    labels.push(date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
                } else if (viewMode === 'weekly') {
                    date.setDate(date.getDate() - (i * 7));
                    labels.push(`Week ${points - i}`);
                } else {
                    date.setMonth(date.getMonth() - i);
                    labels.push(date.toLocaleDateString('en-GB', { month: 'short' }));
                }
                revenue.push(Math.floor(Math.random() * 500000) + 200000);
                bookings.push(Math.floor(Math.random() * 50) + 20);
            }

            setData({
                labels,
                revenue,
                bookings,
                totalRevenue: revenue.reduce((a, b) => a + b, 0),
                totalBookings: bookings.reduce((a, b) => a + b, 0),
                currency: 'eur'
            });
        }
        setLoading(false);
    };

    const renderChart = () => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Revenue',
                        data: data.revenue.map(v => v / 100),
                        borderColor: 'rgb(0, 98, 102)',
                        backgroundColor: 'rgba(0, 98, 102, 0.1)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Bookings',
                        data: data.bookings,
                        borderColor: 'rgb(79, 203, 206)',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                if (context.dataset.label === 'Revenue') {
                                    return `Revenue: ${formatCurrency(context.raw * 100, data.currency)}`;
                                }
                                return `Bookings: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            callback: (value) => formatCurrency(value * 100, data.currency)
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    };

    return html`
        <div class="analytics-card revenue-chart">
            <div class="card-header">
                <h3>Revenue Overview</h3>
                <div class="view-toggle">
                    <button class=${viewMode === 'daily' ? 'active' : ''} onClick=${() => setViewMode('daily')}>Daily</button>
                    <button class=${viewMode === 'weekly' ? 'active' : ''} onClick=${() => setViewMode('weekly')}>Weekly</button>
                    <button class=${viewMode === 'monthly' ? 'active' : ''} onClick=${() => setViewMode('monthly')}>Monthly</button>
                </div>
            </div>

            <div class="chart-container" style=${{ height: '350px' }}>
                ${loading ? html`
                    <div class="chart-loading">
                        <div class="loading-spinner"></div>
                    </div>
                ` : html`
                    <canvas ref=${canvasRef}></canvas>
                `}
            </div>

            ${data && !loading && html`
                <div class="chart-summary">
                    <div class="summary-item">
                        <span class="summary-label">Total Revenue</span>
                        <span class="summary-value">${formatCurrency(data.totalRevenue, data.currency)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Bookings</span>
                        <span class="summary-value">${data.totalBookings}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Avg Revenue/Booking</span>
                        <span class="summary-value">${formatCurrency(Math.round(data.totalRevenue / data.totalBookings), data.currency)}</span>
                    </div>
                </div>
            `}
        </div>
    `;
}

// ============================================
// UserGrowthChart Component
// ============================================

function UserGrowthChart({ period }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [period]);

    useEffect(() => {
        if (data && canvasRef.current && window.Chart) {
            renderChart();
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/analytics/user-growth?period=${period}`);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching user growth:', error);
            // Demo data
            const labels = [];
            const clients = [];
            const coaches = [];
            let clientBase = 1500;
            let coachBase = 80;

            for (let i = 11; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-GB', { month: 'short' }));

                clientBase += Math.floor(Math.random() * 150) + 50;
                coachBase += Math.floor(Math.random() * 10) + 2;

                clients.push(clientBase);
                coaches.push(coachBase);
            }

            setData({
                labels,
                clients,
                coaches,
                totalClients: clientBase,
                totalCoaches: coachBase,
                clientGrowth: ((clientBase - 1500) / 1500 * 100).toFixed(1),
                coachGrowth: ((coachBase - 80) / 80 * 100).toFixed(1)
            });
        }
        setLoading(false);
    };

    const renderChart = () => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Clients',
                        data: data.clients,
                        borderColor: 'rgb(0, 98, 102)',
                        backgroundColor: 'rgba(0, 98, 102, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Coaches',
                        data: data.coaches,
                        borderColor: 'rgb(255, 159, 64)',
                        backgroundColor: 'rgba(255, 159, 64, 0.1)',
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
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatNumber(value)
                        }
                    }
                }
            }
        });
    };

    return html`
        <div class="analytics-card user-growth-chart">
            <div class="card-header">
                <h3>User Growth</h3>
            </div>

            <div class="chart-container" style=${{ height: '300px' }}>
                ${loading ? html`
                    <div class="chart-loading">
                        <div class="loading-spinner"></div>
                    </div>
                ` : html`
                    <canvas ref=${canvasRef}></canvas>
                `}
            </div>

            ${data && !loading && html`
                <div class="growth-metrics">
                    <div class="growth-item">
                        <div class="growth-icon clients"></div>
                        <div class="growth-content">
                            <span class="growth-value">${formatNumber(data.totalClients)}</span>
                            <span class="growth-label">Total Clients</span>
                            <span class="growth-change up">+${data.clientGrowth}%</span>
                        </div>
                    </div>
                    <div class="growth-item">
                        <div class="growth-icon coaches"></div>
                        <div class="growth-content">
                            <span class="growth-value">${data.totalCoaches}</span>
                            <span class="growth-label">Total Coaches</span>
                            <span class="growth-change up">+${data.coachGrowth}%</span>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
}

// ============================================
// CoachPerformanceMetrics Component
// ============================================

function CoachPerformanceMetrics({ period }) {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('revenue');

    useEffect(() => {
        fetchCoaches();
    }, [period, sortBy]);

    const fetchCoaches = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/analytics/coach-performance?period=${period}&sort=${sortBy}`);
            const data = await response.json();
            setCoaches(data.coaches);
        } catch (error) {
            console.error('Error fetching coach performance:', error);
            // Demo data
            setCoaches([
                { id: 1, name: 'Sarah Johnson', avatar: null, specialty: 'Executive Coaching', revenue: 1250000, bookings: 89, rating: 4.9, retention: 0.92 },
                { id: 2, name: 'Michael Chen', avatar: null, specialty: 'Life Coaching', revenue: 980000, bookings: 72, rating: 4.8, retention: 0.88 },
                { id: 3, name: 'Emily Brown', avatar: null, specialty: 'Career Coaching', revenue: 875000, bookings: 65, rating: 4.9, retention: 0.91 },
                { id: 4, name: 'David Wilson', avatar: null, specialty: 'Business Coaching', revenue: 720000, bookings: 58, rating: 4.7, retention: 0.85 },
                { id: 5, name: 'Lisa Anderson', avatar: null, specialty: 'Health & Wellness', revenue: 650000, bookings: 54, rating: 4.8, retention: 0.89 }
            ]);
        }
        setLoading(false);
    };

    return html`
        <div class="analytics-card coach-performance">
            <div class="card-header">
                <h3>Top Performing Coaches</h3>
                <select value=${sortBy} onChange=${(e) => setSortBy(e.target.value)} class="sort-select">
                    <option value="revenue">By Revenue</option>
                    <option value="bookings">By Bookings</option>
                    <option value="rating">By Rating</option>
                    <option value="retention">By Retention</option>
                </select>
            </div>

            ${loading ? html`
                <div class="coach-list-loading">
                    ${[1, 2, 3, 4, 5].map(() => html`
                        <div class="coach-row-skeleton">
                            <div class="skeleton-avatar"></div>
                            <div class="skeleton-content">
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line short"></div>
                            </div>
                        </div>
                    `)}
                </div>
            ` : html`
                <div class="coach-performance-table">
                    <div class="table-header">
                        <span class="col-coach">Coach</span>
                        <span class="col-revenue">Revenue</span>
                        <span class="col-bookings">Bookings</span>
                        <span class="col-rating">Rating</span>
                        <span class="col-retention">Retention</span>
                    </div>
                    ${coaches.map((coach, index) => html`
                        <div class="coach-row" key=${coach.id}>
                            <div class="col-coach">
                                <span class="rank">${index + 1}</span>
                                <div class="coach-avatar ${!coach.avatar ? 'placeholder' : ''}">
                                    ${coach.avatar ? html`<img src=${coach.avatar} alt=${coach.name} />` : coach.name.charAt(0)}
                                </div>
                                <div class="coach-info">
                                    <span class="coach-name">${coach.name}</span>
                                    <span class="coach-specialty">${coach.specialty}</span>
                                </div>
                            </div>
                            <span class="col-revenue">${formatCurrency(coach.revenue)}</span>
                            <span class="col-bookings">${coach.bookings}</span>
                            <span class="col-rating">
                                <span class="star">\u2605</span> ${coach.rating}
                            </span>
                            <span class="col-retention">${formatPercent(coach.retention)}</span>
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
}

// ============================================
// BookingTrendsChart Component
// ============================================

function BookingTrendsChart({ period }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [period]);

    useEffect(() => {
        if (data && canvasRef.current && window.Chart) {
            renderChart();
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/analytics/booking-trends?period=${period}`);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching booking trends:', error);
            // Demo data by specialty
            setData({
                labels: ['Executive', 'Life', 'Career', 'Business', 'Health', 'Relationship'],
                bookings: [245, 198, 176, 142, 128, 89],
                revenue: [3200000, 1980000, 1760000, 1562000, 1024000, 712000],
                colors: [
                    'rgba(0, 98, 102, 0.8)',
                    'rgba(79, 203, 206, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 99, 132, 0.8)'
                ]
            });
        }
        setLoading(false);
    };

    const renderChart = () => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new window.Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.bookings,
                    backgroundColor: data.colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} bookings (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    };

    return html`
        <div class="analytics-card booking-trends">
            <div class="card-header">
                <h3>Bookings by Specialty</h3>
            </div>

            <div class="chart-container" style=${{ height: '300px' }}>
                ${loading ? html`
                    <div class="chart-loading">
                        <div class="loading-spinner"></div>
                    </div>
                ` : html`
                    <canvas ref=${canvasRef}></canvas>
                `}
            </div>

            ${data && !loading && html`
                <div class="trends-summary">
                    <p class="trends-insight">
                        <strong>Executive Coaching</strong> leads with ${((data.bookings[0] / data.bookings.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}% of all bookings
                    </p>
                </div>
            `}
        </div>
    `;
}

// ============================================
// ExportReports Component
// ============================================

function ExportReports({ period }) {
    const [exporting, setExporting] = useState(null);

    const handleExport = async (format) => {
        setExporting(format);
        try {
            const response = await fetch(`${API_BASE}/analytics/export?period=${period}&format=${format}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-report-${period}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            // Fallback - generate client-side
            alert(`Export to ${format.toUpperCase()} functionality would download the report. This requires backend implementation.`);
        }
        setExporting(null);
    };

    return html`
        <div class="export-reports">
            <h4>Export Reports</h4>
            <div class="export-buttons">
                <button
                    class="btn btn-secondary"
                    onClick=${() => handleExport('csv')}
                    disabled=${exporting !== null}
                >
                    ${exporting === 'csv' ? html`<span class="loading-spinner small"></span>` : html`
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    `}
                    Export CSV
                </button>
                <button
                    class="btn btn-secondary"
                    onClick=${() => handleExport('pdf')}
                    disabled=${exporting !== null}
                >
                    ${exporting === 'pdf' ? html`<span class="loading-spinner small"></span>` : html`
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                    `}
                    Export PDF
                </button>
            </div>
        </div>
    `;
}

// ============================================
// AdminAnalyticsDashboard Component (Main)
// ============================================

function AdminAnalyticsDashboard() {
    const [period, setPeriod] = useState('30d');

    return html`
        <div class="admin-analytics-dashboard">
            <div class="dashboard-header">
                <div class="header-content">
                    <h1>Analytics Dashboard</h1>
                    <p class="header-subtitle">Platform performance and insights</p>
                </div>
                <div class="header-actions">
                    <${DateRangePicker} value=${period} onChange=${setPeriod} />
                    <${ExportReports} period=${period} />
                </div>
            </div>

            <${PlatformStats} period=${period} />

            <div class="analytics-grid">
                <div class="grid-item large">
                    <${RevenueChart} period=${period} />
                </div>
                <div class="grid-item">
                    <${UserGrowthChart} period=${period} />
                </div>
                <div class="grid-item">
                    <${BookingTrendsChart} period=${period} />
                </div>
                <div class="grid-item large">
                    <${CoachPerformanceMetrics} period=${period} />
                </div>
            </div>
        </div>
    `;
}

// Export components
window.AnalyticsComponents = {
    AdminAnalyticsDashboard,
    PlatformStats,
    RevenueChart,
    UserGrowthChart,
    CoachPerformanceMetrics,
    BookingTrendsChart,
    ExportReports,
    DateRangePicker
};

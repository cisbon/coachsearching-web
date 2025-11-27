/**
 * CoachSearching - Payment Dashboard Components
 *
 * Comprehensive payment management components:
 * - PayoutDashboard - Full payout management for coaches
 * - TransactionHistory - Detailed transaction list
 * - PayoutScheduleCard - Upcoming payout info
 * - EarningsChart - Visual earnings analytics
 * - RefundRequestModal - Satisfaction guarantee refund
 * - PaymentReceipt - Receipt/invoice view
 * - BalanceOverview - Current balance breakdown
 */

const { html, useState, useEffect, useCallback, useMemo, useRef } = window.HtmPreact;

const API_BASE = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

// ============================================
// Utility Functions
// ============================================

function formatCurrency(cents, currency = 'eur') {
    const amount = cents / 100;
    const symbols = { eur: '\u20AC', gbp: '\u00A3', usd: '$', chf: 'CHF ' };
    return (symbols[currency.toLowerCase()] || '\u20AC') + amount.toFixed(2);
}

function formatDate(dateStr, format = 'medium') {
    const date = new Date(dateStr);
    const options = format === 'short'
        ? { day: 'numeric', month: 'short' }
        : format === 'long'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' };
    return new Intl.DateTimeFormat('en-GB', options).format(date);
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function getRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr, 'short');
}

// ============================================
// BalanceOverview Component
// ============================================

function BalanceOverview({ coachId, currency = 'eur' }) {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBalance();
    }, [coachId]);

    const fetchBalance = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/coaches/${coachId}/balance`);
            const data = await response.json();
            setBalance(data);
        } catch (error) {
            console.error('Error fetching balance:', error);
            // Fallback demo data
            setBalance({
                available_cents: 125000,
                pending_cents: 45000,
                total_earnings_cents: 895000,
                total_sessions: 67,
                currency: 'eur',
                next_payout_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                next_payout_amount_cents: 125000
            });
        }
        setLoading(false);
    };

    if (loading) {
        return html`
            <div class="balance-overview loading">
                <div class="loading-skeleton"></div>
                <div class="loading-skeleton"></div>
                <div class="loading-skeleton"></div>
            </div>
        `;
    }

    return html`
        <div class="balance-overview">
            <div class="balance-card primary">
                <div class="balance-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                </div>
                <div class="balance-content">
                    <span class="balance-label">${window.t?.('payments.availableBalance') || 'Available Balance'}</span>
                    <span class="balance-amount">${formatCurrency(balance.available_cents, balance.currency)}</span>
                </div>
            </div>

            <div class="balance-card">
                <div class="balance-icon pending">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <div class="balance-content">
                    <span class="balance-label">${window.t?.('payments.pendingBalance') || 'Pending'}</span>
                    <span class="balance-amount">${formatCurrency(balance.pending_cents, balance.currency)}</span>
                </div>
            </div>

            <div class="balance-card">
                <div class="balance-icon total">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                </div>
                <div class="balance-content">
                    <span class="balance-label">${window.t?.('payments.totalEarnings') || 'Total Earnings'}</span>
                    <span class="balance-amount">${formatCurrency(balance.total_earnings_cents, balance.currency)}</span>
                    <span class="balance-sub">${balance.total_sessions} ${window.t?.('payments.sessions') || 'sessions'}</span>
                </div>
            </div>

            ${balance.next_payout_date && html`
                <div class="balance-card payout">
                    <div class="balance-icon payout">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                    </div>
                    <div class="balance-content">
                        <span class="balance-label">${window.t?.('payments.nextPayout') || 'Next Payout'}</span>
                        <span class="balance-amount">${formatCurrency(balance.next_payout_amount_cents, balance.currency)}</span>
                        <span class="balance-sub">${formatDate(balance.next_payout_date, 'short')}</span>
                    </div>
                </div>
            `}
        </div>
    `;
}

// ============================================
// TransactionHistory Component
// ============================================

function TransactionHistory({ coachId, clientId, limit = 10, showPagination = true }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, [coachId, clientId, filter, page]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: filter,
                page: page,
                limit: limit
            });
            if (coachId) params.append('coach_id', coachId);
            if (clientId) params.append('client_id', clientId);

            const response = await fetch(`${API_BASE}/payments/transactions?${params}`);
            const data = await response.json();
            setTransactions(data.transactions || []);
            setHasMore(data.has_more || false);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            // Fallback demo data
            setTransactions([
                {
                    id: 't1',
                    type: 'payment',
                    description: 'Coaching session with Sarah M.',
                    amount_cents: 12000,
                    net_amount_cents: 10200,
                    fee_cents: 1800,
                    currency: 'eur',
                    status: 'succeeded',
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 't2',
                    type: 'payment',
                    description: 'Package purchase - 6 sessions',
                    amount_cents: 64800,
                    net_amount_cents: 55080,
                    fee_cents: 9720,
                    currency: 'eur',
                    status: 'succeeded',
                    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 't3',
                    type: 'payout',
                    description: 'Payout to bank account',
                    amount_cents: 125000,
                    currency: 'eur',
                    status: 'paid',
                    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 't4',
                    type: 'refund',
                    description: 'Satisfaction guarantee refund',
                    amount_cents: -12000,
                    currency: 'eur',
                    status: 'refunded',
                    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
                }
            ]);
        }
        setLoading(false);
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'payment':
                return html`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                `;
            case 'payout':
                return html`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                `;
            case 'refund':
                return html`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="1 4 1 10 7 10"/>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                `;
            default:
                return html`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                `;
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            succeeded: { label: 'Completed', class: 'status-success' },
            pending: { label: 'Pending', class: 'status-pending' },
            paid: { label: 'Paid', class: 'status-success' },
            refunded: { label: 'Refunded', class: 'status-refunded' },
            failed: { label: 'Failed', class: 'status-failed' }
        };
        const config = statusConfig[status] || { label: status, class: '' };
        return html`<span class="status-badge ${config.class}">${config.label}</span>`;
    };

    return html`
        <div class="transaction-history">
            <div class="section-header">
                <h3>${window.t?.('payments.transactionHistory') || 'Transaction History'}</h3>
                <div class="filter-tabs">
                    <button
                        class="filter-tab ${filter === 'all' ? 'active' : ''}"
                        onClick=${() => { setFilter('all'); setPage(1); }}
                    >
                        ${window.t?.('payments.all') || 'All'}
                    </button>
                    <button
                        class="filter-tab ${filter === 'payment' ? 'active' : ''}"
                        onClick=${() => { setFilter('payment'); setPage(1); }}
                    >
                        ${window.t?.('payments.payments') || 'Payments'}
                    </button>
                    <button
                        class="filter-tab ${filter === 'payout' ? 'active' : ''}"
                        onClick=${() => { setFilter('payout'); setPage(1); }}
                    >
                        ${window.t?.('payments.payouts') || 'Payouts'}
                    </button>
                    <button
                        class="filter-tab ${filter === 'refund' ? 'active' : ''}"
                        onClick=${() => { setFilter('refund'); setPage(1); }}
                    >
                        ${window.t?.('payments.refunds') || 'Refunds'}
                    </button>
                </div>
            </div>

            ${loading ? html`
                <div class="transactions-loading">
                    ${[1, 2, 3].map(() => html`
                        <div class="transaction-skeleton">
                            <div class="skeleton-circle"></div>
                            <div class="skeleton-content">
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line short"></div>
                            </div>
                            <div class="skeleton-amount"></div>
                        </div>
                    `)}
                </div>
            ` : transactions.length === 0 ? html`
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    <p>${window.t?.('payments.noTransactions') || 'No transactions found'}</p>
                </div>
            ` : html`
                <div class="transactions-list">
                    ${transactions.map(tx => html`
                        <div class="transaction-item ${tx.type}">
                            <div class="transaction-icon ${tx.type}">
                                ${getTransactionIcon(tx.type)}
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-description">${tx.description}</div>
                                <div class="transaction-meta">
                                    <span class="transaction-time">${getRelativeTime(tx.created_at)}</span>
                                    ${getStatusBadge(tx.status)}
                                </div>
                            </div>
                            <div class="transaction-amount ${tx.amount_cents < 0 ? 'negative' : ''}">
                                <span class="amount">${tx.amount_cents < 0 ? '-' : '+'}${formatCurrency(Math.abs(tx.amount_cents), tx.currency)}</span>
                                ${tx.net_amount_cents && tx.type === 'payment' && html`
                                    <span class="net-amount">${window.t?.('payments.net') || 'Net'}: ${formatCurrency(tx.net_amount_cents, tx.currency)}</span>
                                `}
                            </div>
                        </div>
                    `)}
                </div>

                ${showPagination && html`
                    <div class="pagination">
                        <button
                            class="btn btn-secondary"
                            disabled=${page === 1}
                            onClick=${() => setPage(p => p - 1)}
                        >
                            ${window.t?.('common.previous') || 'Previous'}
                        </button>
                        <span class="page-info">${window.t?.('common.page') || 'Page'} ${page}</span>
                        <button
                            class="btn btn-secondary"
                            disabled=${!hasMore}
                            onClick=${() => setPage(p => p + 1)}
                        >
                            ${window.t?.('common.next') || 'Next'}
                        </button>
                    </div>
                `}
            `}
        </div>
    `;
}

// ============================================
// EarningsChart Component
// ============================================

function EarningsChart({ coachId, period = 'month' }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState(period);

    useEffect(() => {
        fetchChartData();
    }, [coachId, selectedPeriod]);

    useEffect(() => {
        if (data && canvasRef.current && window.Chart) {
            renderChart();
        }
    }, [data]);

    const fetchChartData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/coaches/${coachId}/earnings/chart?period=${selectedPeriod}`);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching chart data:', error);
            // Generate demo data
            const labels = selectedPeriod === 'week'
                ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                : selectedPeriod === 'month'
                ? Array.from({ length: 30 }, (_, i) => i + 1)
                : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            setData({
                labels,
                earnings: labels.map(() => Math.floor(Math.random() * 50000) + 10000),
                sessions: labels.map(() => Math.floor(Math.random() * 5) + 1),
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
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: window.t?.('payments.earnings') || 'Earnings',
                    data: data.earnings.map(v => v / 100),
                    backgroundColor: 'rgba(0, 98, 102, 0.8)',
                    borderColor: 'rgb(0, 98, 102)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return formatCurrency(context.raw * 100, data.currency);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value * 100, data.currency)
                        }
                    }
                }
            }
        });
    };

    return html`
        <div class="earnings-chart">
            <div class="section-header">
                <h3>${window.t?.('payments.earningsOverview') || 'Earnings Overview'}</h3>
                <div class="period-selector">
                    <button
                        class="period-btn ${selectedPeriod === 'week' ? 'active' : ''}"
                        onClick=${() => setSelectedPeriod('week')}
                    >
                        ${window.t?.('common.week') || 'Week'}
                    </button>
                    <button
                        class="period-btn ${selectedPeriod === 'month' ? 'active' : ''}"
                        onClick=${() => setSelectedPeriod('month')}
                    >
                        ${window.t?.('common.month') || 'Month'}
                    </button>
                    <button
                        class="period-btn ${selectedPeriod === 'year' ? 'active' : ''}"
                        onClick=${() => setSelectedPeriod('year')}
                    >
                        ${window.t?.('common.year') || 'Year'}
                    </button>
                </div>
            </div>

            <div class="chart-container">
                ${loading ? html`
                    <div class="chart-loading">
                        <div class="loading-spinner"></div>
                    </div>
                ` : html`
                    <canvas ref=${canvasRef} height="300"></canvas>
                `}
            </div>

            ${data && !loading && html`
                <div class="chart-summary">
                    <div class="summary-item">
                        <span class="summary-label">${window.t?.('payments.totalPeriod') || 'Total this period'}</span>
                        <span class="summary-value">${formatCurrency(data.earnings.reduce((a, b) => a + b, 0), data.currency)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">${window.t?.('payments.totalSessions') || 'Sessions'}</span>
                        <span class="summary-value">${data.sessions.reduce((a, b) => a + b, 0)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">${window.t?.('payments.avgPerSession') || 'Avg per session'}</span>
                        <span class="summary-value">
                            ${formatCurrency(
                                Math.round(data.earnings.reduce((a, b) => a + b, 0) / Math.max(data.sessions.reduce((a, b) => a + b, 0), 1)),
                                data.currency
                            )}
                        </span>
                    </div>
                </div>
            `}
        </div>
    `;
}

// ============================================
// RefundRequestModal Component
// ============================================

function RefundRequestModal({ booking, isOpen, onClose, onSuccess }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !booking) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError(window.t?.('payments.reasonRequired') || 'Please provide a reason for the refund request');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/stripe/refund/satisfaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking_id: booking.id,
                    reason: reason.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                onSuccess?.(data);
                onClose();
            } else {
                setError(data.error || 'Failed to process refund request');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        }

        setSubmitting(false);
    };

    // Calculate if within 48 hours
    const completedAt = new Date(booking.completed_at);
    const hoursRemaining = Math.max(0, 48 - ((Date.now() - completedAt) / (1000 * 60 * 60)));

    return html`
        <div class="modal-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="modal refund-modal">
                <button class="modal-close" onClick=${onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <div class="modal-header">
                    <div class="refund-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <h2>${window.t?.('payments.satisfactionGuarantee') || 'Satisfaction Guarantee'}</h2>
                    <p class="modal-subtitle">
                        ${window.t?.('payments.refundSubtitle') || "We're sorry your first session didn't meet expectations"}
                    </p>
                </div>

                <div class="modal-content">
                    ${hoursRemaining < 48 && html`
                        <div class="time-remaining-notice">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>
                                ${hoursRemaining > 0
                                    ? `${Math.floor(hoursRemaining)} ${window.t?.('payments.hoursRemaining') || 'hours remaining to request refund'}`
                                    : window.t?.('payments.refundExpired') || 'Refund period has expired'
                                }
                            </span>
                        </div>
                    `}

                    <div class="booking-summary">
                        <div class="summary-row">
                            <span>${window.t?.('payments.session') || 'Session'}</span>
                            <span>${booking.coach?.name || 'Coach'}</span>
                        </div>
                        <div class="summary-row">
                            <span>${window.t?.('payments.date') || 'Date'}</span>
                            <span>${formatDate(booking.start_time)}</span>
                        </div>
                        <div class="summary-row refund-amount">
                            <span>${window.t?.('payments.refundAmount') || 'Refund Amount'}</span>
                            <span>${formatCurrency(booking.amount?.cents || 0, booking.amount?.currency || 'eur')}</span>
                        </div>
                    </div>

                    <form onSubmit=${handleSubmit}>
                        <div class="form-group">
                            <label for="refund-reason">
                                ${window.t?.('payments.tellUsWhy') || 'Please tell us why you were not satisfied'}
                            </label>
                            <textarea
                                id="refund-reason"
                                value=${reason}
                                onInput=${(e) => setReason(e.target.value)}
                                placeholder=${window.t?.('payments.reasonPlaceholder') || 'Your feedback helps us improve our platform and ensure quality coaching experiences...'}
                                rows="4"
                                required
                            ></textarea>
                        </div>

                        ${error && html`
                            <div class="error-message">
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"/>
                                </svg>
                                ${error}
                            </div>
                        `}

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onClick=${onClose}>
                                ${window.t?.('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                disabled=${submitting || hoursRemaining <= 0}
                            >
                                ${submitting ? html`
                                    <span class="loading-spinner small"></span>
                                    ${window.t?.('payments.processing') || 'Processing...'}
                                ` : window.t?.('payments.requestRefund') || 'Request Refund'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// PaymentReceipt Component
// ============================================

function PaymentReceipt({ transaction, isOpen, onClose }) {
    if (!isOpen || !transaction) return null;

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        // In production, this would call an API to generate PDF
        try {
            const response = await fetch(`${API_BASE}/payments/${transaction.id}/receipt`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt-${transaction.id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading receipt:', error);
            // Fallback to print
            handlePrint();
        }
    };

    return html`
        <div class="modal-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="modal receipt-modal">
                <button class="modal-close" onClick=${onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <div class="receipt-content" id="receipt-printable">
                    <div class="receipt-header">
                        <div class="receipt-logo">
                            <svg width="40" height="40" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="18" fill="#006266" stroke="#004d4f" stroke-width="2"/>
                                <text x="20" y="26" font-size="16" fill="white" text-anchor="middle" font-weight="bold">CS</text>
                            </svg>
                            <span>CoachSearching</span>
                        </div>
                        <div class="receipt-type">
                            <h2>${window.t?.('payments.paymentReceipt') || 'Payment Receipt'}</h2>
                            <span class="receipt-number">#${transaction.id?.substring(0, 8).toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="receipt-date">
                        ${formatDateTime(transaction.created_at)}
                    </div>

                    <div class="receipt-details">
                        <div class="detail-section">
                            <h4>${window.t?.('payments.from') || 'From'}</h4>
                            <p>CoachSearching B.V.</p>
                            <p>Amsterdam, Netherlands</p>
                            <p>KVK: 12345678</p>
                        </div>

                        ${transaction.client && html`
                            <div class="detail-section">
                                <h4>${window.t?.('payments.to') || 'To'}</h4>
                                <p>${transaction.client.name}</p>
                                <p>${transaction.client.email}</p>
                            </div>
                        `}
                    </div>

                    <div class="receipt-items">
                        <table>
                            <thead>
                                <tr>
                                    <th>${window.t?.('payments.description') || 'Description'}</th>
                                    <th>${window.t?.('payments.amount') || 'Amount'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${transaction.description}</td>
                                    <td>${formatCurrency(transaction.amount_cents, transaction.currency)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="receipt-summary">
                        <div class="summary-row">
                            <span>${window.t?.('payments.subtotal') || 'Subtotal'}</span>
                            <span>${formatCurrency(transaction.amount_cents, transaction.currency)}</span>
                        </div>
                        ${transaction.fee_cents && html`
                            <div class="summary-row">
                                <span>${window.t?.('payments.platformFee') || 'Platform Fee'}</span>
                                <span>-${formatCurrency(transaction.fee_cents, transaction.currency)}</span>
                            </div>
                        `}
                        <div class="summary-row total">
                            <span>${window.t?.('payments.total') || 'Total'}</span>
                            <span>${formatCurrency(transaction.net_amount_cents || transaction.amount_cents, transaction.currency)}</span>
                        </div>
                    </div>

                    <div class="receipt-footer">
                        <p>${window.t?.('payments.thankYou') || 'Thank you for using CoachSearching!'}</p>
                        <p class="receipt-support">
                            ${window.t?.('payments.questions') || 'Questions?'} support@coachsearching.com
                        </p>
                    </div>
                </div>

                <div class="receipt-actions">
                    <button class="btn btn-secondary" onClick=${handlePrint}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        ${window.t?.('common.print') || 'Print'}
                    </button>
                    <button class="btn btn-primary" onClick=${handleDownload}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        ${window.t?.('common.download') || 'Download PDF'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// PayoutScheduleCard Component
// ============================================

function PayoutScheduleCard({ coachId }) {
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchedule();
    }, [coachId]);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/coaches/${coachId}/payout-schedule`);
            const data = await response.json();
            setSchedule(data);
        } catch (error) {
            console.error('Error fetching payout schedule:', error);
            // Fallback demo data
            setSchedule({
                frequency: 'weekly',
                next_payout: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                amount_cents: 125000,
                currency: 'eur',
                bank_last4: '1234',
                bank_name: 'ING Bank'
            });
        }
        setLoading(false);
    };

    if (loading) {
        return html`
            <div class="payout-schedule-card loading">
                <div class="loading-skeleton"></div>
            </div>
        `;
    }

    return html`
        <div class="payout-schedule-card">
            <div class="card-header">
                <div class="card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                </div>
                <h4>${window.t?.('payments.nextPayout') || 'Next Payout'}</h4>
            </div>

            <div class="payout-amount">
                ${formatCurrency(schedule.amount_cents, schedule.currency)}
            </div>

            <div class="payout-details">
                <div class="detail-row">
                    <span class="detail-label">${window.t?.('payments.date') || 'Date'}</span>
                    <span class="detail-value">${formatDate(schedule.next_payout, 'long')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${window.t?.('payments.frequency') || 'Frequency'}</span>
                    <span class="detail-value capitalize">${schedule.frequency}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${window.t?.('payments.destination') || 'Destination'}</span>
                    <span class="detail-value">${schedule.bank_name} ****${schedule.bank_last4}</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// PayoutDashboard Component (Main)
// ============================================

function PayoutDashboard({ coachId, coach }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);

    const handleViewReceipt = (transaction) => {
        setSelectedTransaction(transaction);
        setShowReceipt(true);
    };

    return html`
        <div class="payout-dashboard">
            <div class="dashboard-header">
                <h2>${window.t?.('payments.paymentsDashboard') || 'Payments & Earnings'}</h2>
                <p class="dashboard-subtitle">
                    ${window.t?.('payments.dashboardSubtitle') || 'Manage your earnings, payouts, and transactions'}
                </p>
            </div>

            <nav class="dashboard-tabs">
                <button
                    class="tab ${activeTab === 'overview' ? 'active' : ''}"
                    onClick=${() => setActiveTab('overview')}
                >
                    ${window.t?.('payments.overview') || 'Overview'}
                </button>
                <button
                    class="tab ${activeTab === 'transactions' ? 'active' : ''}"
                    onClick=${() => setActiveTab('transactions')}
                >
                    ${window.t?.('payments.transactions') || 'Transactions'}
                </button>
                <button
                    class="tab ${activeTab === 'payouts' ? 'active' : ''}"
                    onClick=${() => setActiveTab('payouts')}
                >
                    ${window.t?.('payments.payouts') || 'Payouts'}
                </button>
            </nav>

            <div class="dashboard-content">
                ${activeTab === 'overview' && html`
                    <div class="overview-grid">
                        <${BalanceOverview} coachId=${coachId} />
                        <${EarningsChart} coachId=${coachId} />
                        <div class="recent-section">
                            <h3>${window.t?.('payments.recentTransactions') || 'Recent Transactions'}</h3>
                            <${TransactionHistory}
                                coachId=${coachId}
                                limit=${5}
                                showPagination=${false}
                            />
                            <button
                                class="btn btn-link"
                                onClick=${() => setActiveTab('transactions')}
                            >
                                ${window.t?.('payments.viewAll') || 'View all transactions'} \u2192
                            </button>
                        </div>
                    </div>
                `}

                ${activeTab === 'transactions' && html`
                    <${TransactionHistory} coachId=${coachId} limit=${20} />
                `}

                ${activeTab === 'payouts' && html`
                    <div class="payouts-content">
                        <${PayoutScheduleCard} coachId=${coachId} />
                        <div class="payout-history">
                            <h3>${window.t?.('payments.payoutHistory') || 'Payout History'}</h3>
                            <${TransactionHistory}
                                coachId=${coachId}
                                filter="payout"
                                limit=${10}
                            />
                        </div>
                    </div>
                `}
            </div>

            <${PaymentReceipt}
                transaction=${selectedTransaction}
                isOpen=${showReceipt}
                onClose=${() => { setShowReceipt(false); setSelectedTransaction(null); }}
            />
        </div>
    `;
}

// ============================================
// ClientPaymentHistory Component
// ============================================

function ClientPaymentHistory({ clientId, clientEmail }) {
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    const handleRefundRequest = (booking) => {
        setSelectedBooking(booking);
        setShowRefundModal(true);
    };

    const handleRefundSuccess = (data) => {
        // Show success message
        if (window.showToast) {
            window.showToast(
                window.t?.('payments.refundSuccess') || 'Refund processed successfully!',
                'success'
            );
        }
        setShowRefundModal(false);
        setSelectedBooking(null);
    };

    return html`
        <div class="client-payment-history">
            <h3>${window.t?.('payments.paymentHistory') || 'Payment History'}</h3>
            <${TransactionHistory} clientId=${clientId} limit=${10} />

            <${RefundRequestModal}
                booking=${selectedBooking}
                isOpen=${showRefundModal}
                onClose=${() => { setShowRefundModal(false); setSelectedBooking(null); }}
                onSuccess=${handleRefundSuccess}
            />
        </div>
    `;
}

// Export components
window.PaymentComponents = {
    PayoutDashboard,
    BalanceOverview,
    TransactionHistory,
    EarningsChart,
    RefundRequestModal,
    PaymentReceipt,
    PayoutScheduleCard,
    ClientPaymentHistory
};

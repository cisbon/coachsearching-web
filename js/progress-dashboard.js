import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect, useRef } from 'react';
import api from './api-client.js';

/**
 * Client Progress Visualization Dashboard
 *
 * Features:
 * - Visual progress tracking with charts
 * - Goal achievement metrics
 * - Session history timeline
 * - Before/after comparisons
 * - Mood & energy tracking
 * - Action items & homework
 * - Milestones & achievements
 * - Coach feedback highlights
 */

export const ProgressDashboard = ({ session }) => {
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30d');
    const [activeGoal, setActiveGoal] = useState(null);

    const chartRefs = {
        progress: useRef(null),
        mood: useRef(null),
        goals: useRef(null)
    };

    useEffect(() => {
        loadProgressData();
    }, [timeRange]);

    useEffect(() => {
        if (progressData && !loading) {
            loadChartJS().then(() => {
                renderCharts();
            });
        }
    }, [progressData, loading]);

    const loadProgressData = async () => {
        try {
            setLoading(true);
            const data = await api.progress.getClientProgress(session.user.id, timeRange);
            setProgressData(data);
        } catch (error) {
            console.error('Failed to load progress data:', error);
            setProgressData(getMockProgressData());
        } finally {
            setLoading(false);
        }
    };

    const loadChartJS = async () => {
        if (window.Chart) return;

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        document.head.appendChild(script);

        return new Promise((resolve) => {
            script.onload = resolve;
        });
    };

    const renderCharts = () => {
        if (!window.Chart || !progressData) return;

        // Progress Over Time Chart
        if (chartRefs.progress.current) {
            new window.Chart(chartRefs.progress.current, {
                type: 'line',
                data: {
                    labels: progressData.sessions.map(s => s.date),
                    datasets: [{
                        label: 'Progress Score',
                        data: progressData.sessions.map(s => s.progress_score),
                        borderColor: 'rgb(0, 98, 102)',
                        backgroundColor: 'rgba(0, 98, 102, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }

        // Mood Tracking Chart
        if (chartRefs.mood.current) {
            new window.Chart(chartRefs.mood.current, {
                type: 'bar',
                data: {
                    labels: progressData.sessions.map(s => s.date),
                    datasets: [
                        {
                            label: 'Mood',
                            data: progressData.sessions.map(s => s.mood),
                            backgroundColor: 'rgba(34, 197, 94, 0.5)',
                            borderColor: 'rgb(34, 197, 94)',
                            borderWidth: 2
                        },
                        {
                            label: 'Energy',
                            data: progressData.sessions.map(s => s.energy),
                            backgroundColor: 'rgba(234, 179, 8, 0.5)',
                            borderColor: 'rgb(234, 179, 8)',
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 10
                        }
                    }
                }
            });
        }

        // Goals Progress Chart
        if (chartRefs.goals.current) {
            const goalLabels = progressData.goals.map(g => g.title.substring(0, 20));
            const goalProgress = progressData.goals.map(g => g.progress);

            new window.Chart(chartRefs.goals.current, {
                type: 'doughnut',
                data: {
                    labels: goalLabels,
                    datasets: [{
                        data: goalProgress,
                        backgroundColor: [
                            'rgb(0, 98, 102)',
                            'rgb(77, 159, 163)',
                            'rgb(126, 192, 195)',
                            'rgb(167, 214, 216)',
                            'rgb(208, 235, 236)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    };

    if (loading) {
        return html`
            <div class="progress-loading">
                <div class="spinner-lg"></div>
                <p>Loading your progress...</p>
            </div>
        `;
    }

    return html`
        <div class="progress-dashboard">
            <!-- Header -->
            <div class="progress-header">
                <div class="progress-header-content">
                    <h1>📈 Your Progress Journey</h1>
                    <p class="progress-subtitle">
                        Track your growth and celebrate your achievements
                    </p>
                </div>
                <div class="progress-controls">
                    <select
                        class="time-range-select"
                        value=${timeRange}
                        onChange=${(e) => setTimeRange(e.target.value)}
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                        <option value="all">All time</option>
                    </select>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="progress-stats">
                <${StatCard}
                    icon="🎯"
                    value=${progressData.stats.total_sessions}
                    label="Total Sessions"
                    color="blue"
                />
                <${StatCard}
                    icon="✅"
                    value="${progressData.stats.goals_achieved}/${progressData.stats.total_goals}"
                    label="Goals Achieved"
                    color="green"
                />
                <${StatCard}
                    icon="📊"
                    value="${progressData.stats.average_progress}%"
                    label="Average Progress"
                    color="petrol"
                />
                <${StatCard}
                    icon="🔥"
                    value="${progressData.stats.current_streak} days"
                    label="Current Streak"
                    color="orange"
                />
            </div>

            <!-- Charts Grid -->
            <div class="charts-grid">
                <div class="chart-card">
                    <h3>Progress Over Time</h3>
                    <canvas ref=${chartRefs.progress}></canvas>
                </div>
                <div class="chart-card">
                    <h3>Mood & Energy Tracking</h3>
                    <canvas ref=${chartRefs.mood}></canvas>
                </div>
            </div>

            <!-- Goals Section -->
            <div class="goals-section">
                <div class="goals-header">
                    <h2>🎯 Your Goals</h2>
                    <button class="btn-secondary" onClick=${() => alert('Add new goal feature coming soon!')}>
                        ➕ Add Goal
                    </button>
                </div>

                <div class="goals-grid">
                    <div class="goals-chart-container">
                        <h3>Goals Overview</h3>
                        <canvas ref=${chartRefs.goals}></canvas>
                    </div>
                    <div class="goals-list">
                        ${progressData.goals.map(goal => html`
                            <${GoalCard}
                                key=${goal.id}
                                goal=${goal}
                                onClick=${() => setActiveGoal(goal)}
                            />
                        `)}
                    </div>
                </div>
            </div>

            <!-- Session Timeline -->
            <div class="timeline-section">
                <h2>📅 Session History</h2>
                <div class="timeline">
                    ${progressData.sessions.map((session, index) => html`
                        <${TimelineItem}
                            key=${session.id}
                            session=${session}
                            isLast=${index === progressData.sessions.length - 1}
                        />
                    `)}
                </div>
            </div>

            <!-- Achievements -->
            <div class="achievements-section">
                <h2>🏆 Achievements & Milestones</h2>
                <div class="achievements-grid">
                    ${progressData.achievements.map(achievement => html`
                        <${AchievementBadge}
                            key=${achievement.id}
                            achievement=${achievement}
                        />
                    `)}
                </div>
            </div>

            <!-- Action Items -->
            <div class="action-items-section">
                <h2>📝 Action Items & Homework</h2>
                <div class="action-items-list">
                    ${progressData.action_items.map(item => html`
                        <${ActionItem}
                            key=${item.id}
                            item=${item}
                        />
                    `)}
                </div>
            </div>

            <!-- Goal Detail Modal -->
            ${activeGoal && html`
                <${GoalDetailModal}
                    goal=${activeGoal}
                    onClose=${() => setActiveGoal(null)}
                />
            `}
        </div>
    `;
};

// ============================================
// STAT CARD
// ============================================

const StatCard = ({ icon, value, label, color }) => html`
    <div class="stat-card stat-card-${color}">
        <div class="stat-icon">${icon}</div>
        <div class="stat-content">
            <div class="stat-value">${value}</div>
            <div class="stat-label">${label}</div>
        </div>
    </div>
`;

// ============================================
// GOAL CARD
// ============================================

const GoalCard = ({ goal, onClick }) => html`
    <div class="goal-card" onClick=${onClick}>
        <div class="goal-header">
            <h4 class="goal-title">${goal.title}</h4>
            <span class="goal-category">${goal.category}</span>
        </div>
        <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${goal.progress}%"></div>
        </div>
        <div class="goal-footer">
            <span class="goal-progress-text">${goal.progress}% complete</span>
            <span class="goal-date">Due: ${goal.due_date}</span>
        </div>
    </div>
`;

// ============================================
// TIMELINE ITEM
// ============================================

const TimelineItem = ({ session, isLast }) => html`
    <div class="timeline-item ${isLast ? 'timeline-item-last' : ''}">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
            <div class="timeline-date">${session.date}</div>
            <h4 class="timeline-title">${session.title}</h4>
            <p class="timeline-description">${session.notes}</p>
            <div class="timeline-metrics">
                <span class="timeline-metric">
                    😊 Mood: ${session.mood}/10
                </span>
                <span class="timeline-metric">
                    ⚡ Energy: ${session.energy}/10
                </span>
                <span class="timeline-metric">
                    📊 Progress: ${session.progress_score}%
                </span>
            </div>
            ${session.coach_feedback && html`
                <div class="timeline-feedback">
                    <strong>Coach Feedback:</strong>
                    <p>${session.coach_feedback}</p>
                </div>
            `}
        </div>
    </div>
`;

// ============================================
// ACHIEVEMENT BADGE
// ============================================

const AchievementBadge = ({ achievement }) => html`
    <div class="achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-content">
            <h4 class="achievement-title">${achievement.title}</h4>
            <p class="achievement-description">${achievement.description}</p>
            ${achievement.unlocked && html`
                <p class="achievement-date">Unlocked: ${achievement.unlocked_date}</p>
            `}
        </div>
    </div>
`;

// ============================================
// ACTION ITEM
// ============================================

const ActionItem = ({ item }) => {
    const [completed, setCompleted] = useState(item.completed);

    const toggleComplete = async () => {
        try {
            await api.progress.updateActionItem(item.id, { completed: !completed });
            setCompleted(!completed);
        } catch (error) {
            console.error('Failed to update action item:', error);
        }
    };

    return html`
        <div class="action-item ${completed ? 'completed' : ''}">
            <input
                type="checkbox"
                checked=${completed}
                onChange=${toggleComplete}
                class="action-checkbox"
            />
            <div class="action-content">
                <h4 class="action-title">${item.title}</h4>
                <p class="action-description">${item.description}</p>
                <div class="action-meta">
                    <span class="action-date">Due: ${item.due_date}</span>
                    <span class="action-priority priority-${item.priority}">${item.priority}</span>
                </div>
            </div>
        </div>
    `;
};

// ============================================
// GOAL DETAIL MODAL
// ============================================

const GoalDetailModal = ({ goal, onClose }) => html`
    <div class="modal-overlay" onClick=${onClose}>
        <div class="modal-content" onClick=${(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>${goal.title}</h3>
                <button class="modal-close" onClick=${onClose}>✕</button>
            </div>
            <div class="modal-body">
                <div class="goal-detail-progress">
                    <div class="circular-progress">
                        <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" class="progress-bg" />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                class="progress-bar"
                                style="stroke-dasharray: ${goal.progress * 2.83} 283"
                            />
                        </svg>
                        <div class="progress-text">${goal.progress}%</div>
                    </div>
                </div>

                <div class="goal-detail-info">
                    <p><strong>Category:</strong> ${goal.category}</p>
                    <p><strong>Due Date:</strong> ${goal.due_date}</p>
                    <p><strong>Created:</strong> ${goal.created_date}</p>
                </div>

                <div class="goal-detail-description">
                    <h4>Description</h4>
                    <p>${goal.description}</p>
                </div>

                <div class="goal-milestones">
                    <h4>Milestones</h4>
                    ${goal.milestones?.map(milestone => html`
                        <div key=${milestone.id} class="milestone ${milestone.completed ? 'completed' : ''}">
                            <span class="milestone-check">${milestone.completed ? '✓' : '○'}</span>
                            <span class="milestone-text">${milestone.title}</span>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    </div>
`;

// ============================================
// MOCK DATA (for development)
// ============================================

const getMockProgressData = () => ({
    stats: {
        total_sessions: 24,
        goals_achieved: 3,
        total_goals: 5,
        average_progress: 68,
        current_streak: 12
    },
    sessions: [
        {
            id: 1,
            date: '2025-11-20',
            title: 'Career Planning Session',
            notes: 'Discussed transition strategy and identified key skills to develop',
            mood: 8,
            energy: 7,
            progress_score: 75,
            coach_feedback: 'Great progress on identifying your core values. Next step: research 3 target companies.'
        },
        {
            id: 2,
            date: '2025-11-13',
            title: 'Goal Setting Workshop',
            notes: 'Set SMART goals for Q1 2026',
            mood: 9,
            energy: 8,
            progress_score: 70,
            coach_feedback: 'Excellent clarity on your goals. Remember to break them into weekly action items.'
        }
    ],
    goals: [
        {
            id: 1,
            title: 'Career Transition',
            category: 'Career',
            progress: 75,
            due_date: '2026-03-31',
            created_date: '2025-09-01',
            description: 'Successfully transition to a product management role',
            milestones: [
                { id: 1, title: 'Complete PM certification', completed: true },
                { id: 2, title: 'Build portfolio project', completed: true },
                { id: 3, title: 'Network with 5 PMs', completed: false },
                { id: 4, title: 'Apply to 10 positions', completed: false }
            ]
        },
        {
            id: 2,
            title: 'Improve Work-Life Balance',
            category: 'Wellness',
            progress: 60,
            due_date: '2026-01-31',
            created_date: '2025-10-01',
            description: 'Establish healthy boundaries and self-care routines',
            milestones: []
        }
    ],
    achievements: [
        {
            id: 1,
            title: 'First Session',
            description: 'Completed your first coaching session',
            icon: '🎯',
            unlocked: true,
            unlocked_date: '2025-09-15'
        },
        {
            id: 2,
            title: '10 Sessions Milestone',
            description: 'Attended 10 coaching sessions',
            icon: '🔟',
            unlocked: true,
            unlocked_date: '2025-11-01'
        },
        {
            id: 3,
            title: 'Goal Achiever',
            description: 'Achieved your first major goal',
            icon: '🏆',
            unlocked: true,
            unlocked_date: '2025-11-10'
        },
        {
            id: 4,
            title: 'Consistent Learner',
            description: 'Maintain a 30-day streak',
            icon: '🔥',
            unlocked: false
        }
    ],
    action_items: [
        {
            id: 1,
            title: 'Research target companies',
            description: 'Identify 3 companies you want to work for and research their culture',
            due_date: '2025-11-30',
            priority: 'high',
            completed: false
        },
        {
            id: 2,
            title: 'Update LinkedIn profile',
            description: 'Reflect new skills and career direction',
            due_date: '2025-11-25',
            priority: 'medium',
            completed: false
        },
        {
            id: 3,
            title: 'Practice morning meditation',
            description: '10 minutes daily for better work-life balance',
            due_date: '2025-11-27',
            priority: 'medium',
            completed: true
        }
    ]
});

export default ProgressDashboard;

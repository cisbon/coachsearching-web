import htm from './vendor/htm.js';
import { t } from './i18n.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

// Use the global supabaseClient
const supabaseClient = window.supabaseClient;

/**
 * Referral Dashboard Component
 *
 * Features:
 * - Display user's unique referral code
 * - Copy to clipboard functionality
 * - Show referral stats (total, successful, rewards earned)
 * - List of referred users with status
 * - Social sharing buttons
 * - Modern card-based layout with animations
 */
export const ReferralDashboard = ({ session }) => {
    const [referralData, setReferralData] = useState({
        code: '',
        totalReferrals: 0,
        successfulReferrals: 0,
        totalRewards: 0,
        referrals: []
    });
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadReferralData();
    }, [session]);

    const loadReferralData = async () => {
        try {
            setLoading(true);

            // Get user's referral code
            const { data: codeData, error: codeError } = await supabaseClient
                .from('referral_codes')
                .select('code, total_referrals, successful_referrals')
                .eq('user_id', session.user.id)
                .single();

            if (codeError && codeError.code !== 'PGRST116') { // Not found is ok
                throw codeError;
            }

            // Get referral rewards
            const { data: rewardsData, error: rewardsError } = await supabaseClient
                .from('referral_rewards')
                .select('amount, status')
                .eq('user_id', session.user.id);

            if (rewardsError) throw rewardsError;

            // Get list of referrals
            const { data: referralsData, error: referralsError } = await supabaseClient
                .from('referrals')
                .select(`
                    *,
                    referred_user:referred_user_id (
                        full_name,
                        email,
                        avatar_url
                    )
                `)
                .eq('referrer_id', session.user.id)
                .order('created_at', { ascending: false });

            if (referralsError) throw referralsError;

            // Calculate total rewards
            const totalRewards = rewardsData?.reduce((sum, reward) =>
                reward.status === 'credited' ? sum + parseFloat(reward.amount) : sum,
                0
            ) || 0;

            setReferralData({
                code: codeData?.code || '',
                totalReferrals: codeData?.total_referrals || 0,
                successfulReferrals: codeData?.successful_referrals || 0,
                totalRewards,
                referrals: referralsData || []
            });

        } catch (error) {
            console.error('Failed to load referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        const referralUrl = `${window.location.origin}?ref=${referralData.code}`;
        try {
            await navigator.clipboard.writeText(referralUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const shareVia = (platform) => {
        const referralUrl = `${window.location.origin}?ref=${referralData.code}`;
        const message = `Join CoachSearching with my referral link and we both get €10 credit!`;

        const urls = {
            email: `mailto:?subject=${encodeURIComponent('Join CoachSearching')}&body=${encodeURIComponent(message + '\n\n' + referralUrl)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(message + ' ' + referralUrl)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralUrl)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`
        };

        window.open(urls[platform], '_blank');
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { text: 'Pending', class: 'badge-warning' },
            completed: { text: 'Successful', class: 'badge-success' },
            failed: { text: 'Failed', class: 'badge-error' }
        };
        const badge = badges[status] || badges.pending;
        return html`<span class="badge ${badge.class}">${badge.text}</span>`;
    };

    if (loading) {
        return html`
            <div class="referral-dashboard">
                <div class="skeleton-loader" style="height: 400px; border-radius: 16px;"></div>
            </div>
        `;
    }

    return html`
        <div class="referral-dashboard">
            <!-- Header -->
            <div class="referral-header">
                <div class="referral-header-content">
                    <h2>🎁 Referral Program</h2>
                    <p>Share CoachSearching with friends and both get €10 credit!</p>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="referral-stats">
                <div class="stat-card stat-card-primary">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${referralData.totalReferrals}</div>
                        <div class="stat-label">Total Referrals</div>
                    </div>
                </div>

                <div class="stat-card stat-card-success">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${referralData.successfulReferrals}</div>
                        <div class="stat-label">Successful</div>
                    </div>
                </div>

                <div class="stat-card stat-card-petrol">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">€${referralData.totalRewards.toFixed(2)}</div>
                        <div class="stat-label">Rewards Earned</div>
                    </div>
                </div>
            </div>

            <!-- Referral Code Card -->
            <div class="referral-code-card">
                <h3>Your Referral Link</h3>
                <p class="referral-code-description">
                    Share this link with friends. When they sign up and book their first session, you both get €10 credit!
                </p>

                <div class="referral-code-display">
                    <div class="referral-url">
                        ${window.location.origin}?ref=<strong>${referralData.code}</strong>
                    </div>
                    <button
                        class="btn-copy ${copied ? 'btn-copy-success' : ''}"
                        onClick=${copyToClipboard}
                    >
                        ${copied ? html`<span>✓ Copied!</span>` : html`<span>📋 Copy Link</span>`}
                    </button>
                </div>

                <!-- Social Share Buttons -->
                <div class="social-share">
                    <p class="social-share-label">Share via:</p>
                    <div class="social-share-buttons">
                        <button class="btn-social btn-social-email" onClick=${() => shareVia('email')} title="Share via Email">
                            📧
                        </button>
                        <button class="btn-social btn-social-whatsapp" onClick=${() => shareVia('whatsapp')} title="Share via WhatsApp">
                            💬
                        </button>
                        <button class="btn-social btn-social-twitter" onClick=${() => shareVia('twitter')} title="Share on Twitter">
                            🐦
                        </button>
                        <button class="btn-social btn-social-facebook" onClick=${() => shareVia('facebook')} title="Share on Facebook">
                            👍
                        </button>
                        <button class="btn-social btn-social-linkedin" onClick=${() => shareVia('linkedin')} title="Share on LinkedIn">
                            💼
                        </button>
                    </div>
                </div>
            </div>

            <!-- Referrals List -->
            ${referralData.referrals.length > 0 && html`
                <div class="referrals-list">
                    <h3>Your Referrals (${referralData.referrals.length})</h3>

                    <div class="referrals-table">
                        ${referralData.referrals.map(referral => html`
                            <div class="referral-row" key=${referral.id}>
                                <div class="referral-user">
                                    <div class="referral-avatar">
                                        ${referral.referred_user?.avatar_url
                                            ? html`<img src=${referral.referred_user.avatar_url} alt="Avatar" />`
                                            : html`<div class="avatar-placeholder">
                                                ${(referral.referred_user?.full_name || '?')[0].toUpperCase()}
                                            </div>`
                                        }
                                    </div>
                                    <div class="referral-info">
                                        <div class="referral-name">
                                            ${referral.referred_user?.full_name || 'Anonymous'}
                                        </div>
                                        <div class="referral-date">
                                            Joined ${new Date(referral.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div class="referral-status">
                                    ${getStatusBadge(referral.status)}
                                </div>

                                ${referral.first_booking_at && html`
                                    <div class="referral-reward">
                                        <div class="reward-amount">€10.00</div>
                                        <div class="reward-label">Reward</div>
                                    </div>
                                `}
                            </div>
                        `)}
                    </div>
                </div>
            `}

            <!-- How it Works -->
            <div class="referral-how-it-works">
                <h3>How It Works</h3>
                <div class="steps-grid">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h4>Share Your Link</h4>
                            <p>Send your unique referral link to friends, family, or colleagues.</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h4>They Sign Up</h4>
                            <p>Your friend creates an account using your referral link.</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h4>First Booking</h4>
                            <p>When they book and complete their first session, rewards are triggered.</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h4>Both Get €10</h4>
                            <p>You and your friend both receive €10 credit instantly!</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Terms -->
            <div class="referral-terms">
                <p>
                    <strong>Terms:</strong> Referral rewards are credited after the referred user completes their first paid session.
                    Credit can be used for future bookings. No limit on referrals. Cannot be combined with other promotions.
                </p>
            </div>
        </div>
    `;
};

/**
 * Compact Referral Widget (for dashboard sidebar/header)
 */
export const ReferralWidget = ({ session }) => {
    const [referralCode, setReferralCode] = useState('');
    const [stats, setStats] = useState({ total: 0, rewards: 0 });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadQuickStats();
    }, [session]);

    const loadQuickStats = async () => {
        try {
            const { data: codeData } = await supabaseClient
                .from('referral_codes')
                .select('code, total_referrals')
                .eq('user_id', session.user.id)
                .single();

            const { data: rewardsData } = await supabaseClient
                .from('referral_rewards')
                .select('amount')
                .eq('user_id', session.user.id)
                .eq('status', 'credited');

            const totalRewards = rewardsData?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

            setReferralCode(codeData?.code || '');
            setStats({
                total: codeData?.total_referrals || 0,
                rewards: totalRewards
            });
        } catch (error) {
            console.error('Failed to load referral stats:', error);
        }
    };

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}?ref=${referralCode}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (!referralCode) return null;

    return html`
        <div class="referral-widget">
            <div class="referral-widget-header">
                <span class="referral-widget-icon">🎁</span>
                <span class="referral-widget-title">Refer & Earn</span>
            </div>
            <div class="referral-widget-stats">
                <div class="referral-widget-stat">
                    <span class="stat-number">${stats.total}</span>
                    <span class="stat-text">Referrals</span>
                </div>
                <div class="referral-widget-stat">
                    <span class="stat-number">€${stats.rewards.toFixed(0)}</span>
                    <span class="stat-text">Earned</span>
                </div>
            </div>
            <button class="referral-widget-btn" onClick=${copyCode}>
                ${copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
        </div>
    `;
};

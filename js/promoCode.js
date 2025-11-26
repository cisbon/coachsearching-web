import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect } from 'react';
import { supabaseClient } from './config.js';

/**
 * Promo Code Widget for Checkout
 *
 * Features:
 * - Input field for promo code
 * - Real-time validation via database function
 * - Show discount amount preview
 * - Apply/remove functionality
 * - Error handling for invalid codes
 * - Success animation when applied
 */
export const PromoCodeWidget = ({ session, bookingAmount, onPromoApplied, onPromoRemoved }) => {
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState('');
    const [showInput, setShowInput] = useState(false);

    const validateAndApply = async () => {
        if (!promoCode.trim()) {
            setError('Please enter a promo code');
            return;
        }

        setIsValidating(true);
        setError('');

        try {
            // Call validate_promo_code database function
            const { data, error: rpcError } = await supabaseClient.rpc('validate_promo_code', {
                p_code: promoCode.trim().toUpperCase(),
                p_user_id: session.user.id,
                p_booking_amount: bookingAmount
            });

            if (rpcError) throw rpcError;

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (result.valid) {
                // Success! Apply promo code
                const promoData = {
                    code: promoCode.trim().toUpperCase(),
                    discountAmount: parseFloat(result.discount_amount),
                    discountType: result.discount_type,
                    discountValue: parseFloat(result.discount_value)
                };

                setAppliedPromo(promoData);
                setPromoCode('');
                setShowInput(false);

                // Notify parent component
                if (onPromoApplied) {
                    onPromoApplied(promoData);
                }
            } else {
                // Invalid code
                setError(result.error || 'Invalid promo code');
            }
        } catch (error) {
            console.error('Promo validation error:', error);
            setError('Failed to validate promo code. Please try again.');
        } finally {
            setIsValidating(false);
        }
    };

    const removePromo = () => {
        setAppliedPromo(null);
        setError('');
        setPromoCode('');

        // Notify parent component
        if (onPromoRemoved) {
            onPromoRemoved();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            validateAndApply();
        }
    };

    // If promo is already applied, show applied state
    if (appliedPromo) {
        return html`
            <div class="promo-code-widget promo-applied">
                <div class="promo-applied-header">
                    <div class="promo-applied-icon">🎉</div>
                    <div class="promo-applied-content">
                        <div class="promo-applied-label">Promo Code Applied</div>
                        <div class="promo-applied-code">${appliedPromo.code}</div>
                    </div>
                    <button class="promo-remove-btn" onClick=${removePromo} title="Remove promo code">
                        ×
                    </button>
                </div>
                <div class="promo-discount-display">
                    <span class="promo-discount-label">Discount:</span>
                    <span class="promo-discount-amount">
                        ${appliedPromo.discountType === 'percentage'
                            ? `-${appliedPromo.discountValue}%`
                            : `-€${appliedPromo.discountAmount.toFixed(2)}`
                        }
                    </span>
                </div>
                <div class="promo-savings">
                    You save <strong>€${appliedPromo.discountAmount.toFixed(2)}</strong>
                </div>
            </div>
        `;
    }

    // If input is not shown, show toggle button
    if (!showInput) {
        return html`
            <div class="promo-code-widget">
                <button class="promo-toggle-btn" onClick=${() => setShowInput(true)}>
                    <span class="promo-toggle-icon">🏷️</span>
                    <span>Have a promo code?</span>
                </button>
            </div>
        `;
    }

    // Show input form
    return html`
        <div class="promo-code-widget promo-input-active">
            <div class="promo-input-header">
                <label class="promo-label">Enter Promo Code</label>
                <button class="promo-close-btn" onClick=${() => setShowInput(false)}>×</button>
            </div>

            <div class="promo-input-group">
                <input
                    type="text"
                    class="promo-input ${error ? 'promo-input-error' : ''}"
                    placeholder="WELCOME15"
                    value=${promoCode}
                    onInput=${(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setError('');
                    }}
                    onKeyPress=${handleKeyPress}
                    disabled=${isValidating}
                    maxLength="20"
                />
                <button
                    class="promo-apply-btn"
                    onClick=${validateAndApply}
                    disabled=${isValidating || !promoCode.trim()}
                >
                    ${isValidating ? html`
                        <span class="promo-spinner"></span>
                        <span>Validating...</span>
                    ` : html`
                        <span>Apply</span>
                    `}
                </button>
            </div>

            ${error && html`
                <div class="promo-error">
                    <span class="promo-error-icon">⚠️</span>
                    <span>${error}</span>
                </div>
            `}

            <div class="promo-hint">
                Popular codes: <button class="promo-quick-code" onClick=${() => setPromoCode('WELCOME15')}>WELCOME15</button>
            </div>
        </div>
    `;
};

/**
 * Promo Code Banner (for homepage/marketing)
 *
 * Shows available promo codes in an attractive banner
 */
export const PromoCodeBanner = () => {
    const [activePromos, setActivePromos] = useState([]);
    const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

    useEffect(() => {
        loadActivePromos();
    }, []);

    const loadActivePromos = async () => {
        try {
            const now = new Date().toISOString();

            const { data, error } = await supabaseClient
                .from('promo_codes')
                .select('code, description, discount_type, discount_value, valid_until')
                .eq('is_active', true)
                .or(`valid_from.is.null,valid_from.lte.${now}`)
                .or(`valid_until.is.null,valid_until.gte.${now}`)
                .limit(5);

            if (error) throw error;

            setActivePromos(data || []);
        } catch (error) {
            console.error('Failed to load active promos:', error);
        }
    };

    useEffect(() => {
        if (activePromos.length > 1) {
            const interval = setInterval(() => {
                setCurrentPromoIndex((prev) => (prev + 1) % activePromos.length);
            }, 5000); // Rotate every 5 seconds

            return () => clearInterval(interval);
        }
    }, [activePromos]);

    if (activePromos.length === 0) return null;

    const currentPromo = activePromos[currentPromoIndex];

    const formatDiscount = () => {
        if (currentPromo.discount_type === 'percentage') {
            return `${currentPromo.discount_value}% OFF`;
        } else {
            return `€${currentPromo.discount_value} OFF`;
        }
    };

    return html`
        <div class="promo-banner">
            <div class="promo-banner-content">
                <div class="promo-banner-icon">🎁</div>
                <div class="promo-banner-text">
                    <div class="promo-banner-discount">${formatDiscount()}</div>
                    <div class="promo-banner-description">
                        ${currentPromo.description || 'Special offer!'}
                    </div>
                </div>
                <div class="promo-banner-code">
                    <span class="promo-banner-code-label">Code:</span>
                    <span class="promo-banner-code-value">${currentPromo.code}</span>
                </div>
            </div>
            ${activePromos.length > 1 && html`
                <div class="promo-banner-dots">
                    ${activePromos.map((_, index) => html`
                        <button
                            key=${index}
                            class="promo-banner-dot ${index === currentPromoIndex ? 'active' : ''}"
                            onClick=${() => setCurrentPromoIndex(index)}
                        />
                    `)}
                </div>
            `}
        </div>
    `;
};

/**
 * Admin Promo Code Manager
 *
 * Create and manage promo codes (for admin panel)
 */
export const PromoCodeManager = ({ session }) => {
    const [promoCodes, setPromoCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        max_uses: null,
        max_uses_per_user: 1,
        min_purchase_amount: null,
        valid_from: null,
        valid_until: null,
        is_active: true
    });

    useEffect(() => {
        loadPromoCodes();
    }, []);

    const loadPromoCodes = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabaseClient
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setPromoCodes(data || []);
        } catch (error) {
            console.error('Failed to load promo codes:', error);
        } finally {
            setLoading(false);
        }
    };

    const createPromoCode = async (e) => {
        e.preventDefault();

        try {
            const { data, error } = await supabaseClient
                .from('promo_codes')
                .insert([{
                    ...formData,
                    code: formData.code.toUpperCase(),
                    created_by: session.user.id
                }])
                .select()
                .single();

            if (error) throw error;

            setPromoCodes([data, ...promoCodes]);
            setShowCreateForm(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create promo code:', error);
            alert('Failed to create promo code: ' + error.message);
        }
    };

    const togglePromoStatus = async (promoId, currentStatus) => {
        try {
            const { error } = await supabaseClient
                .from('promo_codes')
                .update({ is_active: !currentStatus })
                .eq('id', promoId);

            if (error) throw error;

            setPromoCodes(promoCodes.map(promo =>
                promo.id === promoId ? { ...promo, is_active: !currentStatus } : promo
            ));
        } catch (error) {
            console.error('Failed to toggle promo status:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            description: '',
            discount_type: 'percentage',
            discount_value: 10,
            max_uses: null,
            max_uses_per_user: 1,
            min_purchase_amount: null,
            valid_from: null,
            valid_until: null,
            is_active: true
        });
    };

    if (loading) {
        return html`<div class="skeleton-loader" style="height: 400px;"></div>`;
    }

    return html`
        <div class="promo-manager">
            <div class="promo-manager-header">
                <h2>Promo Code Management</h2>
                <button class="btn-primary" onClick=${() => setShowCreateForm(!showCreateForm)}>
                    ${showCreateForm ? 'Cancel' : '+ Create Promo Code'}
                </button>
            </div>

            ${showCreateForm && html`
                <div class="promo-create-form">
                    <form onSubmit=${createPromoCode}>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Promo Code *</label>
                                <input
                                    type="text"
                                    value=${formData.code}
                                    onInput=${(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="SUMMER2025"
                                    required
                                    maxLength="20"
                                />
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    value=${formData.description}
                                    onInput=${(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Summer special discount"
                                />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Discount Type *</label>
                                <select
                                    value=${formData.discount_type}
                                    onChange=${(e) => setFormData({ ...formData, discount_type: e.target.value })}
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (€)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Discount Value *</label>
                                <input
                                    type="number"
                                    value=${formData.discount_value}
                                    onInput=${(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                                    min="0"
                                    step=${formData.discount_type === 'percentage' ? '1' : '0.01'}
                                    max=${formData.discount_type === 'percentage' ? '100' : undefined}
                                    required
                                />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Max Uses (Total)</label>
                                <input
                                    type="number"
                                    value=${formData.max_uses || ''}
                                    onInput=${(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="Unlimited"
                                    min="1"
                                />
                            </div>
                            <div class="form-group">
                                <label>Max Uses Per User</label>
                                <input
                                    type="number"
                                    value=${formData.max_uses_per_user || ''}
                                    onInput=${(e) => setFormData({ ...formData, max_uses_per_user: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="1"
                                    min="1"
                                />
                            </div>
                            <div class="form-group">
                                <label>Min Purchase (€)</label>
                                <input
                                    type="number"
                                    value=${formData.min_purchase_amount || ''}
                                    onInput=${(e) => setFormData({ ...formData, min_purchase_amount: e.target.value ? parseFloat(e.target.value) : null })}
                                    placeholder="No minimum"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Valid From</label>
                                <input
                                    type="datetime-local"
                                    value=${formData.valid_from || ''}
                                    onChange=${(e) => setFormData({ ...formData, valid_from: e.target.value || null })}
                                />
                            </div>
                            <div class="form-group">
                                <label>Valid Until</label>
                                <input
                                    type="datetime-local"
                                    value=${formData.valid_until || ''}
                                    onChange=${(e) => setFormData({ ...formData, valid_until: e.target.value || null })}
                                />
                            </div>
                        </div>

                        <button type="submit" class="btn-primary">Create Promo Code</button>
                    </form>
                </div>
            `}

            <div class="promo-codes-list">
                ${promoCodes.map(promo => html`
                    <div class="promo-code-card" key=${promo.id}>
                        <div class="promo-code-header">
                            <div class="promo-code-title">
                                <h3>${promo.code}</h3>
                                <span class="badge ${promo.is_active ? 'badge-success' : 'badge-error'}">
                                    ${promo.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <button
                                class="btn-toggle"
                                onClick=${() => togglePromoStatus(promo.id, promo.is_active)}
                            >
                                ${promo.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>

                        <p class="promo-description">${promo.description || 'No description'}</p>

                        <div class="promo-details">
                            <div class="promo-detail">
                                <span class="label">Discount:</span>
                                <span class="value">
                                    ${promo.discount_type === 'percentage'
                                        ? `${promo.discount_value}%`
                                        : `€${promo.discount_value}`
                                    }
                                </span>
                            </div>
                            <div class="promo-detail">
                                <span class="label">Uses:</span>
                                <span class="value">
                                    ${promo.times_used} / ${promo.max_uses || '∞'}
                                </span>
                            </div>
                            ${promo.valid_until && html`
                                <div class="promo-detail">
                                    <span class="label">Expires:</span>
                                    <span class="value">
                                        ${new Date(promo.valid_until).toLocaleDateString()}
                                    </span>
                                </div>
                            `}
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

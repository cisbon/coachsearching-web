import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/promo-codes/active
 * Get all active promo codes (public)
 */
router.get('/active', optionalAuth, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('promo_codes')
      .select('code, description, discount_type, discount_value, valid_until, min_purchase_amount')
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${now}`)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Get active promos error:', error);
    res.status(500).json({
      error: 'PromoError',
      message: 'Failed to get active promo codes'
    });
  }
});

/**
 * POST /api/promo-codes/validate
 * Validate a promo code and calculate discount
 */
router.post('/validate', authenticate, validate(schemas.validatePromo), async (req, res) => {
  try {
    const { code, booking_amount } = req.validatedBody;

    // Call database validation function
    const { data, error } = await supabase.rpc('validate_promo_code', {
      p_code: code.toUpperCase(),
      p_user_id: req.user.id,
      p_booking_amount: booking_amount
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (result.valid) {
      res.json({
        success: true,
        valid: true,
        discount_amount: parseFloat(result.discount_amount),
        discount_type: result.discount_type,
        discount_value: parseFloat(result.discount_value),
        final_amount: booking_amount - parseFloat(result.discount_amount)
      });
    } else {
      res.json({
        success: true,
        valid: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Validate promo error:', error);
    res.status(500).json({
      error: 'ValidationError',
      message: 'Failed to validate promo code'
    });
  }
});

/**
 * POST /api/promo-codes/apply
 * Apply a promo code to a booking
 */
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { code, booking_id, booking_amount } = req.body;

    if (!code || !booking_id || !booking_amount) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Code, booking_id, and booking_amount are required'
      });
    }

    // Validate the promo code first
    const { data: validationData, error: validationError } = await supabase.rpc('validate_promo_code', {
      p_code: code.toUpperCase(),
      p_user_id: req.user.id,
      p_booking_amount: booking_amount
    });

    if (validationError) throw validationError;

    const validation = typeof validationData === 'string' ? JSON.parse(validationData) : validationData;

    if (!validation.valid) {
      return res.status(400).json({
        error: 'InvalidCode',
        message: validation.error
      });
    }

    // Get promo code ID
    const { data: promoCode, error: promoError } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (promoError) throw promoError;

    // Record promo code usage
    const { error: usageError } = await supabase
      .from('promo_code_usage')
      .insert([{
        promo_code_id: promoCode.id,
        user_id: req.user.id,
        booking_id,
        discount_amount: validation.discount_amount
      }]);

    if (usageError) throw usageError;

    // Update promo code times_used counter
    await supabase.rpc('increment_promo_usage', {
      p_code: code.toUpperCase()
    });

    res.json({
      success: true,
      message: 'Promo code applied successfully',
      discount_amount: parseFloat(validation.discount_amount),
      final_amount: booking_amount - parseFloat(validation.discount_amount)
    });
  } catch (error) {
    console.error('Apply promo error:', error);
    res.status(500).json({
      error: 'ApplyError',
      message: 'Failed to apply promo code'
    });
  }
});

/**
 * GET /api/promo-codes (Admin only)
 * Get all promo codes
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('promo_codes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({
      error: 'PromoError',
      message: 'Failed to get promo codes'
    });
  }
});

/**
 * POST /api/promo-codes (Admin only)
 * Create new promo code
 */
router.post('/', authenticate, authorize('admin'), validate(schemas.createPromo), async (req, res) => {
  try {
    const promoData = {
      ...req.validatedBody,
      code: req.validatedBody.code.toUpperCase(),
      created_by: req.user.id
    };

    // Check if code already exists
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('code')
      .eq('code', promoData.code)
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'DuplicateCode',
        message: 'A promo code with this code already exists'
      });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert([promoData])
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await supabase.from('admin_actions').insert([{
      admin_id: req.user.id,
      action_type: 'promo_code_created',
      target_type: 'promo_code',
      target_id: data.id,
      details: { code: data.code }
    }]);

    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      data
    });
  } catch (error) {
    console.error('Create promo error:', error);
    res.status(500).json({
      error: 'CreateError',
      message: 'Failed to create promo code'
    });
  }
});

/**
 * PATCH /api/promo-codes/:id (Admin only)
 * Update promo code
 */
router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, max_uses, valid_until, description } = req.body;

    const updates = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (max_uses !== undefined) updates.max_uses = max_uses;
    if (valid_until !== undefined) updates.valid_until = valid_until;
    if (description !== undefined) updates.description = description;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await supabase.from('admin_actions').insert([{
      admin_id: req.user.id,
      action_type: 'promo_code_updated',
      target_type: 'promo_code',
      target_id: id,
      details: updates
    }]);

    res.json({
      success: true,
      message: 'Promo code updated successfully',
      data
    });
  } catch (error) {
    console.error('Update promo error:', error);
    res.status(500).json({
      error: 'UpdateError',
      message: 'Failed to update promo code'
    });
  }
});

/**
 * DELETE /api/promo-codes/:id (Admin only)
 * Deactivate promo code (soft delete)
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('promo_codes')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await supabase.from('admin_actions').insert([{
      admin_id: req.user.id,
      action_type: 'promo_code_deactivated',
      target_type: 'promo_code',
      target_id: id
    }]);

    res.json({
      success: true,
      message: 'Promo code deactivated successfully',
      data
    });
  } catch (error) {
    console.error('Delete promo error:', error);
    res.status(500).json({
      error: 'DeleteError',
      message: 'Failed to deactivate promo code'
    });
  }
});

/**
 * GET /api/promo-codes/:id/usage (Admin only)
 * Get usage statistics for a promo code
 */
router.get('/:id/usage', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('promo_code_usage')
      .select(`
        *,
        user:user_id (full_name, email),
        booking:booking_id (id, total_price, created_at)
      `)
      .eq('promo_code_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Calculate statistics
    const stats = {
      total_uses: data?.length || 0,
      total_discount_given: data?.reduce((sum, usage) =>
        sum + parseFloat(usage.discount_amount || 0), 0) || 0,
      unique_users: new Set(data?.map(u => u.user_id)).size || 0,
      usage_by_date: {}
    };

    // Group by date
    data?.forEach(usage => {
      const date = new Date(usage.created_at).toISOString().split('T')[0];
      stats.usage_by_date[date] = (stats.usage_by_date[date] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        stats,
        recent_usage: data?.slice(0, 20) || []
      }
    });
  } catch (error) {
    console.error('Get promo usage error:', error);
    res.status(500).json({
      error: 'UsageError',
      message: 'Failed to get promo code usage'
    });
  }
});

export default router;

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/referrals/code
 * Get user's referral code (or create if doesn't exist)
 */
router.get('/code', authenticate, async (req, res) => {
  try {
    // Check if user already has a referral code
    let { data: code, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    // If no code exists, create one
    if (error && error.code === 'PGRST116') {
      // Call database function to generate code
      const { data: newCode, error: createError } = await supabase
        .rpc('generate_referral_code');

      if (createError) throw createError;

      // Insert the code
      const { data: insertedCode, error: insertError } = await supabase
        .from('referral_codes')
        .insert([{
          user_id: req.user.id,
          code: newCode
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      code = insertedCode;
    } else if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: code
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({
      error: 'ReferralError',
      message: 'Failed to get referral code'
    });
  }
});

/**
 * GET /api/referrals/stats
 * Get referral statistics for current user
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get referral code stats
    const { data: codeStats, error: codeError } = await supabase
      .from('referral_codes')
      .select('code, total_referrals, successful_referrals')
      .eq('user_id', req.user.id)
      .single();

    if (codeError && codeError.code !== 'PGRST116') throw codeError;

    // Get referral rewards
    const { data: rewards, error: rewardsError } = await supabase
      .from('referral_rewards')
      .select('amount, status, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (rewardsError) throw rewardsError;

    // Calculate total rewards
    const totalRewards = rewards?.reduce((sum, reward) =>
      reward.status === 'credited' ? sum + parseFloat(reward.amount) : sum,
      0
    ) || 0;

    const pendingRewards = rewards?.reduce((sum, reward) =>
      reward.status === 'pending' ? sum + parseFloat(reward.amount) : sum,
      0
    ) || 0;

    res.json({
      success: true,
      data: {
        code: codeStats?.code || null,
        totalReferrals: codeStats?.total_referrals || 0,
        successfulReferrals: codeStats?.successful_referrals || 0,
        totalRewards,
        pendingRewards,
        recentRewards: rewards?.slice(0, 5) || []
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      error: 'StatsError',
      message: 'Failed to get referral statistics'
    });
  }
});

/**
 * GET /api/referrals/list
 * Get list of users referred by current user
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data: referrals, error, count } = await supabase
      .from('referrals')
      .select(`
        *,
        referred_user:referred_user_id (
          full_name,
          email,
          avatar_url,
          created_at
        )
      `, { count: 'exact' })
      .eq('referrer_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: referrals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get referral list error:', error);
    res.status(500).json({
      error: 'ListError',
      message: 'Failed to get referral list'
    });
  }
});

/**
 * POST /api/referrals/apply
 * Apply a referral code during signup
 * Note: This is typically called during user registration
 */
router.post('/apply', optionalAuth, validate(schemas.applyReferral), async (req, res) => {
  try {
    const { referral_code } = req.validatedBody;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User must be authenticated to apply referral code'
      });
    }

    // Check if code exists and is valid
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', referral_code)
      .single();

    if (codeError || !codeData) {
      return res.status(400).json({
        error: 'InvalidCode',
        message: 'Referral code is invalid or does not exist'
      });
    }

    // Can't refer yourself
    if (codeData.user_id === userId) {
      return res.status(400).json({
        error: 'SelfReferral',
        message: 'You cannot use your own referral code'
      });
    }

    // Check if user already used a referral code
    const { data: existingReferral, error: existingError } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .single();

    if (existingReferral) {
      return res.status(400).json({
        error: 'AlreadyReferred',
        message: 'You have already used a referral code'
      });
    }

    // Create referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert([{
        referrer_id: codeData.user_id,
        referred_user_id: userId,
        referral_code: referral_code,
        status: 'pending'
      }])
      .select()
      .single();

    if (referralError) throw referralError;

    // Update referral code stats
    await supabase.rpc('increment_referral_count', {
      p_user_id: codeData.user_id
    });

    res.json({
      success: true,
      message: 'Referral code applied successfully! You and your friend will both receive €10 credit after your first booking.',
      data: referral
    });
  } catch (error) {
    console.error('Apply referral error:', error);
    res.status(500).json({
      error: 'ReferralError',
      message: 'Failed to apply referral code'
    });
  }
});

/**
 * POST /api/referrals/validate
 * Validate a referral code (check if it exists and is valid)
 */
router.post('/validate', optionalAuth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Referral code is required'
      });
    }

    const { data, error } = await supabase
      .from('referral_codes')
      .select('code, user_id')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !data) {
      return res.json({
        success: true,
        valid: false,
        message: 'Invalid referral code'
      });
    }

    // Check if user is trying to use their own code
    if (req.user && data.user_id === req.user.id) {
      return res.json({
        success: true,
        valid: false,
        message: 'You cannot use your own referral code'
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Referral code is valid',
      reward: parseFloat(process.env.REFERRAL_REWARD_AMOUNT) || 10.00
    });
  } catch (error) {
    console.error('Validate referral error:', error);
    res.status(500).json({
      error: 'ValidationError',
      message: 'Failed to validate referral code'
    });
  }
});

/**
 * POST /api/referrals/track-conversion
 * Mark referral as converted (called after first booking)
 * Internal endpoint - typically called by booking webhook
 */
router.post('/track-conversion', authenticate, async (req, res) => {
  try {
    const { user_id, booking_id } = req.body;

    // Find pending referral for this user
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_user_id', user_id)
      .eq('status', 'pending')
      .single();

    if (referralError || !referral) {
      return res.json({
        success: true,
        message: 'No pending referral found'
      });
    }

    // Update referral status
    await supabase
      .from('referrals')
      .update({
        status: 'completed',
        first_booking_at: new Date().toISOString(),
        first_booking_id: booking_id
      })
      .eq('id', referral.id);

    // Create rewards for both users
    const rewardAmount = parseFloat(process.env.REFERRAL_REWARD_AMOUNT) || 10.00;

    const rewards = [
      {
        user_id: referral.referrer_id,
        referral_id: referral.id,
        amount: rewardAmount,
        type: 'referrer',
        status: 'credited'
      },
      {
        user_id: referral.referred_user_id,
        referral_id: referral.id,
        amount: rewardAmount,
        type: 'referred',
        status: 'credited'
      }
    ];

    await supabase.from('referral_rewards').insert(rewards);

    // Update referral code stats
    await supabase.rpc('increment_successful_referral', {
      p_user_id: referral.referrer_id
    });

    res.json({
      success: true,
      message: 'Referral conversion tracked successfully'
    });
  } catch (error) {
    console.error('Track conversion error:', error);
    res.status(500).json({
      error: 'ConversionError',
      message: 'Failed to track referral conversion'
    });
  }
});

export default router;

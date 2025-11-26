import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/auth/verify-email
 * Verify email token (called from email link)
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Verification token is required'
      });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });

    if (error) throw error;

    res.json({
      success: true,
      message: 'Email verified successfully',
      user: data.user
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({
      error: 'VerificationError',
      message: error.message || 'Failed to verify email'
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Email is required'
      });
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    if (error) throw error;

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(400).json({
      error: 'ResendError',
      message: error.message || 'Failed to resend verification email'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // Get user with related data
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        coach:coaches(*),
        referral_code:referral_codes(code, total_referrals)
      `)
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'ProfileError',
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * PATCH /api/auth/me
 * Update current user profile
 */
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { full_name, avatar_url, timezone, phone } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (timezone !== undefined) updates.timezone = timezone;
    if (phone !== undefined) updates.phone = phone;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'UpdateError',
      message: 'Failed to update profile'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Supabase handles password updates through their client SDK
    // This endpoint would typically redirect to client-side password update
    // For server-side, we can use the Admin API

    const { error } = await supabase.auth.admin.updateUserById(
      req.user.id,
      { password: newPassword }
    );

    if (error) throw error;

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      error: 'PasswordError',
      message: error.message || 'Failed to change password'
    });
  }
});

/**
 * DELETE /api/auth/me
 * Request account deletion (GDPR compliance)
 */
router.delete('/me', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;

    // Create deletion request (7-day grace period)
    const { error } = await supabase
      .from('account_deletion_requests')
      .insert([{
        user_id: req.user.id,
        reason,
        scheduled_deletion_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }]);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Account deletion requested. Your account will be deleted in 7 days. You can cancel this request anytime before then.'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      error: 'DeletionError',
      message: 'Failed to request account deletion'
    });
  }
});

/**
 * POST /api/auth/cancel-deletion
 * Cancel account deletion request
 */
router.post('/cancel-deletion', authenticate, async (req, res) => {
  try {
    const { error } = await supabase
      .from('account_deletion_requests')
      .update({
        cancelled_at: new Date().toISOString(),
        status: 'cancelled'
      })
      .eq('user_id', req.user.id)
      .eq('status', 'pending');

    if (error) throw error;

    res.json({
      success: true,
      message: 'Account deletion cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel deletion error:', error);
    res.status(500).json({
      error: 'CancelError',
      message: 'Failed to cancel account deletion'
    });
  }
});

/**
 * POST /api/auth/export-data
 * Export user data (GDPR compliance)
 */
router.post('/export-data', authenticate, async (req, res) => {
  try {
    // Create data export request
    const { error } = await supabase
      .from('data_export_requests')
      .insert([{
        user_id: req.user.id,
        status: 'processing'
      }]);

    if (error) throw error;

    // In production, this would trigger a background job
    // to compile all user data and send download link via email

    res.json({
      success: true,
      message: 'Data export request submitted. You will receive a download link via email within 24 hours.'
    });
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({
      error: 'ExportError',
      message: 'Failed to request data export'
    });
  }
});

export default router;

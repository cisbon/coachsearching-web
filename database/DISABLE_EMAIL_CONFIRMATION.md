# Disable Email Confirmation Requirement

To allow users to use the app without confirming their email (while still showing them a verification banner), you need to update your Supabase Auth settings.

## Steps to Disable Email Confirmation:

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to Authentication**: Click on "Authentication" in the left sidebar
3. **Go to Settings**: Click on "Settings" tab
4. **Email Auth Settings**:
   - Find "Enable email confirmations"
   - **UNCHECK** this option
5. **Save Changes**: Click "Save"

### Option 2: Via SQL (If you have access)

Run this in your Supabase SQL Editor:

```sql
-- Note: This updates internal auth config
-- May require superuser access
UPDATE auth.config
SET value = 'false'
WHERE parameter = 'enable_signup';
```

However, the dashboard approach is much simpler and safer.

## What This Does:

- ✅ Users can sign up and immediately use the app
- ✅ Verification banner will still show (with masked email)
- ✅ Users can click "Resend Email" to get verification link
- ✅ They can dismiss the banner temporarily
- ❌ Email verification is no longer required to access the app

## Current Behavior After This Change:

1. **User signs up** → Account created immediately ✓
2. **User can login** → No email verification needed ✓
3. **Banner appears** → "Please verify your email address: m*****@c****.com"
4. **User can dismiss** → Banner goes away (session only)
5. **User can resend** → Gets new verification email
6. **After verification** → Banner disappears permanently

## Security Note:

Disabling email confirmation reduces signup friction but means:
- Users can create accounts with fake emails
- You won't verify email deliverability until they click verify
- Consider adding other verification methods for sensitive operations

For a coaching platform where you want to reduce friction in the signup process, this is a good trade-off.

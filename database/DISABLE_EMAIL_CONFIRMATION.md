# Configure Email Verification for Low-Friction Signup

This guide explains how to configure Supabase to allow users to browse coaches immediately after signup, while still requiring email verification before booking sessions.

## Steps to Configure Supabase:

### 1. Disable "Confirm Email" Requirement

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to Authentication** → Click "Authentication" in left sidebar
3. **Go to Settings** → Click "Settings" or "Providers" tab
4. **Find "Email"** provider settings
5. **Scroll down to "Enable email confirmations"**
6. **UNCHECK** "Enable email confirmations"
7. **Save Changes**

### 2. Verify the Settings

After disabling email confirmations, test the flow:

1. **Sign up** → User is automatically logged in ✓
2. **Redirected** → Clients go to coaches list, coaches to onboarding ✓
3. **Browse freely** → Can view all coaches without restrictions ✓
4. **Try to book** → Blocked with message: "Please verify your email" ✓
5. **Banner shows** → Yellow banner with masked email appears ✓
6. **After verification** → Banner disappears, booking allowed ✓

## What This Configuration Does:

### ✅ Immediate Access
- Users can sign up and login without verifying email first
- No "check your email" waiting screen
- Instant access to browse coaches

### ✅ Verification Banner
- Shows prominent banner: "Please verify your email: m*****@c****.com"
- Email is masked for privacy
- "Resend Email" button available
- Dismissable (per session)

### ✅ Booking Protection
- **Email verification IS required** to book sessions
- Alert shown: "Please verify your email address before booking"
- Protects coaches from spam/fake bookings
- Ensures valid contact info for session notifications

### ✅ Best of Both Worlds
- **Low friction**: Browse immediately after signup
- **Security**: Verified email required for bookings
- **User choice**: Can verify now or later

## User Flow:

```
1. User signs up
   └─> Auto-logged in ✓
   └─> Redirected to coaches ✓
   └─> Yellow verification banner appears ✓

2. User browses coaches
   └─> Can view all profiles ✓
   └─> Can read articles ✓
   └─> Can add to favorites ✓

3. User tries to book
   └─> Blocked if email not verified ✗
   └─> Alert: "Please verify your email..." ✓

4. User clicks "Resend Email"
   └─> New verification email sent ✓
   └─> Button shows "✓ Sent!" ✓

5. User verifies email
   └─> Banner disappears ✓
   └─> Can now book sessions ✓
```

## Security Considerations:

### What's Protected:
- ✅ Booking requires verified email
- ✅ Coaches receive valid client contact info
- ✅ Prevents spam bookings
- ✅ Email deliverability confirmed before booking

### Trade-offs:
- ⚠️ Users can browse with unverified emails
- ⚠️ Fake signups possible (but can't book)
- ⚠️ Users might ignore verification if not planning to book

### Recommendation:
This configuration is **ideal for coaching platforms** because:
- Low signup friction increases conversions
- Browsing doesn't require commitment
- Booking verification protects both parties
- Users verify when they're ready to engage

## Troubleshooting:

### "Email not confirmed" error on login
- Make sure you **disabled** email confirmations in Supabase
- Restart your app after changing settings
- Clear browser cache

### Banner doesn't show
- Check that `session.user.email_confirmed_at` is null
- Verify EmailVerificationBanner component is rendered
- Check browser console for errors

### Booking still works without verification
- Verify the code change to `handleConfirmBooking` was deployed
- Check browser console - should see email verification check
- Hard refresh browser (Ctrl+Shift+R)

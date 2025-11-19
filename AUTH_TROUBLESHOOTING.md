# 🔧 Authentication Troubleshooting Guide

## The Problems You're Experiencing

### Issue 1: "User already registered" when signing up
**What's happening:** When you tried to sign up, the account was actually created in Supabase, but you can't log in yet.

### Issue 2: "Invalid login credentials" when trying to log in
**What's happening:** Your account exists but hasn't been confirmed via email yet.

### Issue 3: Google sign-in doesn't ask which account to use
**Fixed!** ✅ The code now forces Google to show the account picker.

---

## 🎯 The Real Issue: Email Confirmation

**By default, Supabase requires users to confirm their email before they can log in.**

Here's what happens:
1. You sign up with email/password
2. Supabase creates your account
3. Supabase sends you a confirmation email
4. **You must click the link in that email** before you can log in
5. Until you confirm, you'll get "Invalid login credentials" when trying to log in

---

## ✅ Solutions (Pick One)

### Option A: Find and Click the Confirmation Email (Recommended for Production)

1. **Check your email inbox** for an email from Supabase
2. Look for subject like "Confirm Your Email" or "Welcome to Tenantry"
3. **Click the confirmation link** in that email
4. After clicking, you should be able to log in

**Can't find the email?**
- Check your spam/junk folder
- Check the email address you used to sign up
- The email comes from your Supabase project

---

### Option B: Disable Email Confirmation (Easy for Testing)

**This is great for testing but NOT recommended for production.**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your Tenantry project
3. Click **Authentication** in the left sidebar
4. Click **Providers**
5. Find **Email** in the list and click it
6. Look for **"Enable email confirmations"** toggle
7. **Turn it OFF**
8. Click **Save**

Now users can sign up and log in immediately without confirming email!

---

### Option C: Delete the Unconfirmed User and Start Fresh

If you want to try again with a clean slate:

1. Go to your Supabase Dashboard
2. Click **Authentication** → **Users**
3. Find the user with your email
4. Click the three dots (...) next to it
5. Click **Delete user**
6. Now you can sign up again

---

## 🔍 How to Check Your Email Confirmation Settings

1. Go to Supabase Dashboard
2. Authentication → Providers → Email
3. Look at these settings:

**If "Enable email confirmations" is ON:**
- Users MUST confirm email before logging in
- Better security, but requires email setup
- Good for production

**If "Enable email confirmations" is OFF:**
- Users can log in immediately after signing up
- Faster testing, but less secure
- Good for development

---

## 🎉 What I Fixed in the Code

### 1. Better Error Messages
The login page now tells you exactly what's wrong:
- "Check your email for confirmation link" instead of generic errors
- Clear success messages when signing up
- Hints about confirming email if login fails

### 2. Google Account Picker
Google OAuth now shows the account picker every time, so you can choose which Google account to use.

### 3. Better Feedback
The app now detects if email confirmation is required and tells you!

---

## 📝 Step-by-Step: Creating a New Account

### With Email Confirmation ON (Default):

1. Click "Don't have an account? Sign up"
2. Enter your email and password (minimum 6 characters)
3. Click "Sign Up"
4. You'll see: **"Success! Check your email for the confirmation link"**
5. Go to your email and click the confirmation link
6. Return to the login page
7. Click "Already have an account? Sign in"
8. Enter the same email and password
9. Click "Sign In"
10. ✅ You're in!

### With Email Confirmation OFF:

1. Click "Don't have an account? Sign up"
2. Enter your email and password
3. Click "Sign Up"
4. ✅ You're in immediately!

---

## 🐛 Still Having Issues?

### Check Your Supabase Connection

Run this in your browser console (F12 → Console tab):
```javascript
// Check if Supabase is connected
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
```

If it shows `undefined`, your environment variables aren't set up.

### Check Database Trigger

Make sure you ran the `auth-setup.sql` file in Supabase:
1. Go to Supabase Dashboard
2. SQL Editor
3. Copy/paste the content of `auth-setup.sql`
4. Click Run

This creates the automatic user profile creation.

### Check User in Database

After signing up, check if the user was created:
1. Supabase Dashboard → Authentication → Users
2. You should see your email in the list
3. Check the "Confirmed" column:
   - ✅ Green = Email confirmed, can log in
   - ⏸️ Gray = Waiting for email confirmation

---

## 🎓 Understanding the Auth Flow

```
┌─────────────────────────────────────────────┐
│ USER SIGNS UP                               │
│ (Email: user@example.com, Password: ****) │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ SUPABASE CREATES USER                       │
│ • Stores in auth.users table                │
│ • Generates unique ID (UUID)                │
│ • Status: "unconfirmed"                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ IF EMAIL CONFIRMATION IS ON:                │
│ • Sends confirmation email                  │
│ • User cannot log in yet                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ USER CLICKS EMAIL LINK                      │
│ • Status changes to "confirmed"             │
│ • User can now log in                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ DATABASE TRIGGER RUNS                       │
│ • Automatically creates user_profiles entry │
│ • Copies user ID and email                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ USER LOGS IN                                │
│ • Enters email and password                 │
│ • Gets access to dashboard                  │
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Fix Summary

**The fastest way to get testing:**

1. **Turn off email confirmation** (Option B above)
2. **Delete any existing unconfirmed users** (Option C above)
3. **Sign up again** with a new account
4. You should be logged in immediately!

**For production:**
- Keep email confirmation ON
- Set up proper email templates in Supabase
- Test the full sign-up flow including email confirmation

---

Need more help? Check if:
- ✅ You ran the `auth-setup.sql` script
- ✅ Your Supabase environment variables are set
- ✅ You understand your email confirmation settings
- ✅ Google OAuth is properly configured (if using Google sign-in)

Everything should be working now! 🎉


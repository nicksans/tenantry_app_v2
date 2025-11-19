# 🚨 Quick Fix for Login Loop Issue

## What's Happening

You're signing in successfully with Google, but then immediately getting kicked back to the login screen. This is usually because:

1. **The database trigger wasn't set up** - So your user exists in `auth.users` but not in `user_profiles`
2. **Or the trigger is failing silently** - Due to missing columns or RLS issues

## ✅ Solution (Do This Now)

### Step 1: Run the Updated SQL Script

I just updated `auth-setup.sql` to be more robust. It now:
- Won't fail even if there are errors
- Handles duplicate users gracefully
- Extracts your name from Google properly

**Do this:**

1. Open your Supabase Dashboard: https://app.supabase.com
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste **ALL the contents** from `auth-setup.sql`
5. Click **Run**
6. You should see "Success. No rows returned"

### Step 2: Check the Browser Console

1. Open your app in the browser
2. Press `F12` (or right-click → Inspect)
3. Click on the **Console** tab
4. Try signing in with Google again
5. Look for messages starting with 🔐

**Tell me what you see!** It will say something like:
- `🔐 Initial session check: { session: 'your@email.com' }` - This is GOOD
- `🔐 Initial session check: { session: 'No session' }` - This is BAD
- `🔐 Auth state changed: SIGNED_IN` - This is GOOD
- `🔐 Auth state changed: SIGNED_OUT` - This means something is signing you out

### Step 3: Check Your Supabase Users

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Find the user you just created
3. Click on it to see the details
4. **Check if it has a `user_profiles` entry**

### Step 4: Manually Create Profile (Temporary Fix)

If the trigger isn't working, you can manually create the profile:

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Paste this (replace with YOUR user ID):

```sql
-- First, find your user ID
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Copy your ID from above, then run this (replace 'YOUR-USER-ID-HERE'):
INSERT INTO user_profiles (id, email, full_name, role)
SELECT 
  id,
  email,
  raw_user_meta_data->>'name',
  'owner'
FROM auth.users 
WHERE id = 'YOUR-USER-ID-HERE'
ON CONFLICT (id) DO NOTHING;
```

3. Click **Run**
4. Now try logging in again!

---

## 🔍 What to Check

### Is Google OAuth Properly Configured?

1. Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google**
3. Make sure it's **Enabled** (toggle is ON)
4. Check that you have valid Client ID and Secret

### Is the Redirect URL Correct?

The redirect URL should be: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

In Google Console:
1. Go to: https://console.cloud.google.com
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click your OAuth client
5. Check **Authorized redirect URIs** includes your Supabase callback URL

---

## 📊 Common Scenarios

### Scenario 1: Session exists but immediately disappears
**Console shows:** 
```
🔐 Auth state changed: SIGNED_IN { user: 'your@email.com' }
🔐 Auth state changed: SIGNED_OUT { user: 'No user' }
```

**Problem:** Something in your database is rejecting the user
**Solution:** Check RLS policies and run the updated SQL script

### Scenario 2: No session at all
**Console shows:**
```
🔐 Initial session check: { session: 'No session' }
```

**Problem:** OAuth redirect isn't completing
**Solution:** Check Google OAuth configuration and redirect URLs

### Scenario 3: Session persists but shows login screen
**Console shows:**
```
🔐 Initial session check: { session: 'your@email.com' }
```
But you still see the login screen

**Problem:** React state isn't updating properly
**Solution:** Clear browser cache and cookies, restart dev server

---

## 🎯 Quick Diagnostic Steps

Try these in order:

1. ✅ **Run the updated SQL script** (from Step 1)
2. ✅ **Clear browser cookies** for localhost
3. ✅ **Restart your dev server** (`npm run dev`)
4. ✅ **Check the console** while logging in
5. ✅ **Try a different browser** (Chrome/Firefox/Safari)
6. ✅ **Check if user exists** in Supabase Auth Users
7. ✅ **Manually create profile** if needed (Step 4)

---

## 🆘 If Nothing Works

Try this nuclear option:

1. Delete the user in Supabase (Authentication → Users → Delete)
2. Clear ALL browser data for localhost
3. Restart dev server
4. Run the SQL script again
5. Sign up with a different Google account
6. Watch the console logs

---

## 📝 What to Tell Me

After trying the steps above, let me know:

1. ✅ **Did you run the updated SQL script?**
2. 📊 **What do the console logs show?** (copy/paste them)
3. 👤 **Does the user exist in Supabase?** (yes/no)
4. 📋 **Does user_profiles have an entry?** (yes/no)
5. 🔗 **Is your Google OAuth redirect URL correct?** (yes/no)

This will help me figure out exactly what's going wrong!


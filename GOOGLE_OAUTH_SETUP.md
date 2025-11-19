# 🔑 Google OAuth Setup - Step by Step

## The Issue You're Having

Your console shows:
```
🔐 Initial session check: {session: 'No session', error: null}
```

This means Google OAuth is starting but **not completing**. The authentication flow reaches Google, but when it redirects back to your app, Supabase isn't creating a session.

## ✅ Solution: Configure Google OAuth Properly

### Step 1: Check if Google OAuth is Enabled in Supabase

1. Go to: https://app.supabase.com
2. Select your Tenantry project
3. Click **Authentication** in the left sidebar
4. Click **Providers**
5. Scroll down and find **Google**

**Is it enabled?** (Toggle should be ON/green)

- ✅ **If YES** → Continue to Step 2
- ❌ **If NO** → Toggle it ON, then continue to Step 2

---

### Step 2: Get Your Supabase Callback URL

This is THE MOST IMPORTANT part!

1. While still in **Authentication** → **Providers** → **Google**
2. Look for the **Callback URL (for OAuth)**
3. It will look like: `https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback`
4. **Copy this entire URL** - you'll need it in Step 3

**Write it down here:** ____________________________________

---

### Step 3: Create Google OAuth Credentials

#### A. Go to Google Cloud Console

1. Open: https://console.cloud.google.com
2. Sign in with your Google account

#### B. Create or Select a Project

1. At the top, click the project dropdown
2. Either:
   - **Select an existing project**, OR
   - Click **NEW PROJECT**
     - Name it: "Tenantry"
     - Click **CREATE**

#### C. Enable Google+ API (Required!)

1. In the left sidebar, click **APIs & Services** → **Library**
2. Search for: "Google+ API"
3. Click on it
4. Click **ENABLE**

Wait for it to enable (takes a few seconds).

#### D. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace)
3. Click **CREATE**
4. Fill out the form:
   - **App name:** Tenantry
   - **User support email:** Your email
   - **Developer contact email:** Your email
5. Click **SAVE AND CONTINUE**
6. Click **ADD OR REMOVE SCOPES**
7. Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
8. Click **UPDATE** → **SAVE AND CONTINUE**
9. Click **BACK TO DASHBOARD**

#### E. Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **OAuth client ID**
4. Choose **Web application**
5. Name it: "Tenantry Web"
6. Under **Authorized redirect URIs**, click **+ ADD URI**
7. **Paste your Supabase callback URL** from Step 2
   - Example: `https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback`
8. Also add (for local testing):
   - `http://localhost:5173`
   - `http://localhost:5173/`
9. Click **CREATE**

You'll see a popup with your credentials:
- **Client ID** - looks like: `123456789-abc123.apps.googleusercontent.com`
- **Client Secret** - looks like: `GOCSPX-abc123def456`

**Copy both of these!**

---

### Step 4: Add Credentials to Supabase

1. Go back to your Supabase Dashboard
2. **Authentication** → **Providers** → **Google**
3. Paste your **Client ID** in the "Client ID" field
4. Paste your **Client Secret** in the "Client Secret" field
5. Make sure **Enabled** toggle is ON
6. Click **Save**

---

### Step 5: Test It!

1. Go to your app (http://localhost:5173)
2. Open browser console (F12)
3. Click **Continue with Google**
4. Choose your Google account
5. Grant permissions

**What you should see in console:**
```
🔐 Auth state changed: SIGNED_IN {user: 'your@email.com'}
🔐 Initial session check: {session: 'your@email.com', error: null}
```

If you see this, **you're in!** 🎉

---

## 🚨 Common Issues

### Issue 1: "Error 400: redirect_uri_mismatch"

**Problem:** The redirect URI in Google doesn't match Supabase

**Solution:**
1. Go to Google Console → Credentials → Your OAuth Client
2. Make sure **Authorized redirect URIs** includes EXACTLY:
   - Your Supabase callback URL (from Step 2)
   - No extra spaces or characters
3. Wait 5 minutes for Google to update

### Issue 2: "Access blocked: This app's request is invalid"

**Problem:** OAuth consent screen isn't configured

**Solution:**
- Complete Step 3D (Configure OAuth Consent Screen)
- Make sure you added the email and profile scopes

### Issue 3: Still shows "No session" in console

**Problem:** Credentials aren't saved properly in Supabase

**Solution:**
1. Double-check you copied the Client ID and Secret correctly
2. Make sure there are no extra spaces when pasting
3. Click Save in Supabase
4. Try signing in again

### Issue 4: "Unauthorized client"

**Problem:** Google+ API isn't enabled

**Solution:**
- Go to Google Console → APIs & Services → Library
- Search "Google+ API"
- Click Enable

---

## 🎯 Quick Checklist

Before trying to sign in, make sure:

- ✅ Google OAuth is **Enabled** in Supabase
- ✅ You've copied the **Supabase callback URL**
- ✅ You've created a Google Cloud project
- ✅ **Google+ API is enabled**
- ✅ OAuth consent screen is configured
- ✅ You've created OAuth Client ID
- ✅ **Redirect URI matches exactly** (including https://)
- ✅ Client ID and Secret are pasted into Supabase
- ✅ You clicked **Save** in Supabase

---

## 🆘 If It Still Doesn't Work

### Try Email/Password Instead (Temporary)

While we fix Google OAuth, you can use email/password:

1. In your Supabase Dashboard:
   - **Authentication** → **Providers** → **Email**
   - Toggle **OFF** "Enable email confirmations"
   - Click **Save**

2. In your app:
   - Click "Don't have an account? Sign up"
   - Enter email and password
   - Click "Sign Up"
   - You should be logged in immediately!

This at least lets you test the app while we fix Google OAuth.

---

## 📸 What You Should See

### In Google Console:
- OAuth client ID created
- Authorized redirect URIs includes your Supabase callback URL
- OAuth consent screen is configured

### In Supabase:
- Google provider is ENABLED (green toggle)
- Client ID is filled in
- Client Secret is filled in

### In Console:
After successful sign-in:
```
🔐 Auth state changed: SIGNED_IN {user: 'your@email.com'}
```

---

## 🎓 Understanding OAuth Flow

```
┌─────────────────────────────────────────┐
│ 1. User clicks "Continue with Google"  │
│    in your app                          │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 2. Supabase redirects to Google        │
│    (with your Client ID)                │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 3. User signs in with Google           │
│    and grants permissions               │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 4. Google redirects back to Supabase   │
│    (to the callback URL)                │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 5. Supabase creates user session       │
│    using Client Secret                  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 6. User is redirected back to app      │
│    with session cookie                  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 7. App detects session and shows       │
│    dashboard                            │
└─────────────────────────────────────────┘
```

**Your flow is breaking at step 5!** Supabase isn't creating the session, which means the credentials aren't configured correctly.

---

Follow the steps above carefully, especially making sure the **redirect URI matches exactly**. That's the #1 cause of OAuth issues!

Let me know what happens! 🚀


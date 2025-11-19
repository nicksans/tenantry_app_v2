# 🔐 Authentication Setup Guide for Tenantry

This guide will walk you through setting up authentication for your Tenantry app. Everything is now ready in your code - you just need to configure Supabase!

## ✅ What's Already Done

1. ✅ Login page created with Google OAuth and Email/Password options
2. ✅ App.tsx updated to check authentication state
3. ✅ Sign out button added to sidebar
4. ✅ Database trigger SQL file created

## 📋 Steps to Complete Setup

### Step 1: Run the Database Trigger (5 minutes)

This creates the automatic user profile creation system.

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your Tenantry project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `auth-setup.sql` in your project folder
6. Copy and paste ALL the SQL code into the Supabase SQL Editor
7. Click **Run** button

**What this does:** When someone signs up, it automatically creates a row in your `user_profiles` table with their user ID and email.

---

### Step 2: Enable Google OAuth (10 minutes)

This allows users to sign in with their Google account.

#### A. Get Google OAuth Credentials

1. Go to: https://console.cloud.google.com
2. Create a new project (or select an existing one)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add these Authorized redirect URIs:
   - Your Supabase callback URL (looks like: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`)
   - For local testing: `http://localhost:5173/auth/callback`
7. Click **Create**
8. Copy your **Client ID** and **Client Secret**

#### B. Configure in Supabase

1. Go to your Supabase Dashboard
2. Click **Authentication** in the left sidebar
3. Click **Providers**
4. Find **Google** in the list
5. Toggle it **ON**
6. Paste your **Client ID** and **Client Secret**
7. Click **Save**

---

### Step 3: Configure Email Settings (5 minutes)

By default, Supabase requires email confirmation. For testing, you can disable this:

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Click on **Email** provider
3. Under **Email confirmation**, you can:
   - **Keep it ON** (recommended for production) - users get a confirmation email
   - **Turn it OFF** (for testing) - users can sign in immediately

---

### Step 4: Test Your Authentication! 🎉

Now you're ready to test:

1. Start your app: `npm run dev`
2. You should see the login page (no longer the dashboard)
3. Try signing up with email/password
4. Try signing in with Google
5. Once logged in, you should see the dashboard
6. Try the "Sign Out" button at the bottom of the sidebar

---

## 🔍 How It Works (For Beginners)

### The User Journey

1. **User arrives** → They see the Login page (not logged in)
2. **User signs up/logs in** → Supabase creates them in `auth.users` table
3. **Trigger runs automatically** → Creates matching entry in `user_profiles` table
4. **User is logged in** → They see the dashboard
5. **User clicks "Sign Out"** → Returns to login page

### Behind the Scenes

- **`auth.users` table** - Managed by Supabase, stores login credentials
- **`user_profiles` table** - Your custom table, stores additional info (linked by `id`)
- **Trigger** - Automatically copies new users from `auth.users` to `user_profiles`
- **Row Level Security (RLS)** - Users can only see/edit their own data

---

## 🛠️ Files Changed

- ✅ `src/components/Login.tsx` - New login page with Google + email/password
- ✅ `src/App.tsx` - Now checks if user is logged in before showing dashboard
- ✅ `auth-setup.sql` - Database trigger for auto-creating user profiles

---

## 🚨 Troubleshooting

### "Invalid login credentials" error
- Double-check email and password are correct
- Make sure you've signed up first (or use the "Sign up" toggle)

### Google OAuth not working
- Make sure redirect URIs are correct in Google Console
- Check that Client ID and Secret are pasted correctly in Supabase

### Users not appearing in user_profiles table
- Make sure you ran the `auth-setup.sql` script
- Check the SQL Editor for any error messages
- The trigger should create entries automatically

### Still seeing dashboard without login
- Clear your browser cache and cookies
- Make sure you saved changes to App.tsx
- Restart your development server (`npm run dev`)

---

## 📚 Next Steps

After authentication is working:

1. **Update user profiles** - Add fields for phone, avatar, etc.
2. **Forgot password** - Add password reset functionality
3. **Email templates** - Customize confirmation emails in Supabase
4. **Production checklist** - Review Supabase auth settings before launching

---

## ❓ Common Questions

**Q: Where is my user data stored?**
- Login info (email, password hash) → `auth.users` (managed by Supabase)
- Profile info → `user_profiles` (your custom table)

**Q: How do I access the logged-in user's ID in my code?**
- Use: `const { data: { user } } = await supabase.auth.getUser()`
- Or use: `supabase.auth.getSession()`

**Q: Do I need to create users manually?**
- No! When someone signs up through the login page, everything is automatic

**Q: Can I use other login providers (Facebook, GitHub, etc.)?**
- Yes! Just enable them in Supabase → Authentication → Providers

---

Need help? The authentication system is now fully set up in your code. Just follow the steps above to configure Supabase! 🚀


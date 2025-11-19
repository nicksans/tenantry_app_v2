# Switching to Plaid Production Mode

This guide will walk you through switching from Plaid Sandbox to Production mode so you can connect real bank accounts.

## Step 1: Apply for Plaid Production Access

### 1.1 Request Production Access

1. Go to your Plaid Dashboard: https://dashboard.plaid.com
2. Navigate to **"Team Settings"** → **"Keys"**
3. Click **"Request production access"** or **"Go to production"**
4. Fill out the production request form with:
   - **App name**: Tenantry
   - **App description**: Property management platform that connects to mortgage accounts to track liabilities
   - **Use case**: Liabilities (Mortgage tracking)
   - **Products needed**: Liabilities
   - **Company information**: Your business details
   - **Compliance information**: How you'll handle data, privacy policy, etc.

### 1.2 What Plaid Will Review

Plaid will check:
- Your app's purpose and use case
- Data security practices
- Privacy policy and terms of service
- User consent flow
- Compliance with financial regulations

**Timeline**: Usually takes 1-2 business days, but can take up to 2 weeks depending on your use case.

### 1.3 Get Your Production Credentials

Once approved:
1. Go to **"Team Settings"** → **"Keys"**
2. You'll now see **Production** credentials (in addition to Sandbox)
3. Copy your:
   - **Production Client ID** (looks like: `5f7a8b9c0d1e2f3g4h5i`)
   - **Production Secret** (looks like: `1a2b3c4d5e6f7g8h9i0j`)

**⚠️ IMPORTANT**: Never commit these to GitHub or share them publicly!

---

## Step 2: Update Your n8n Environment Variables

You need to add production credentials to your n8n instance:

### 2.1 Add Production Environment Variables

In your n8n instance:
1. Go to **Settings** → **Environments**
2. Add these new variables:
   ```
   PLAID_PRODUCTION_CLIENT_ID=your_production_client_id_here
   PLAID_PRODUCTION_SECRET=your_production_secret_here
   ```
3. Keep your existing sandbox credentials:
   ```
   PLAID_CLIENT_ID=your_sandbox_client_id
   PLAID_SECRET=your_sandbox_secret
   ```

### 2.2 Add a Mode Toggle Variable (Optional but Recommended)

Add this variable to easily switch between sandbox and production:
```
PLAID_MODE=production
```

Set to `production` for live mode, or `sandbox` for testing.

---

## Step 3: Update Your n8n Workflows

You need to update all three Plaid workflows to use production URLs.

### Workflow 1: Create Link Token

**Current URL:**
```
https://sandbox.plaid.com/link/token/create
```

**Update to:**
```
https://production.plaid.com/link/token/create
```

**Better approach - Use conditional logic:**

In your HTTP Request node, use this for the URL:
```javascript
{{$env.PLAID_MODE === 'production' ? 'https://production.plaid.com/link/token/create' : 'https://sandbox.plaid.com/link/token/create'}}
```

And update the credentials to use:
```javascript
{
  "client_id": "{{$env.PLAID_MODE === 'production' ? $env.PLAID_PRODUCTION_CLIENT_ID : $env.PLAID_CLIENT_ID}}",
  "secret": "{{$env.PLAID_MODE === 'production' ? $env.PLAID_PRODUCTION_SECRET : $env.PLAID_SECRET}}",
  // ... rest of your config
}
```

### Workflow 2: Exchange Token & Get Mortgage Data

Update **TWO** HTTP Request nodes in this workflow:

#### Node: Exchange Public Token
**Current URL:**
```
https://sandbox.plaid.com/item/public_token/exchange
```

**Update to:**
```javascript
{{$env.PLAID_MODE === 'production' ? 'https://production.plaid.com/item/public_token/exchange' : 'https://sandbox.plaid.com/item/public_token/exchange'}}
```

#### Node: Get Liabilities Data
**Current URL:**
```
https://sandbox.plaid.com/liabilities/get
```

**Update to:**
```javascript
{{$env.PLAID_MODE === 'production' ? 'https://production.plaid.com/liabilities/get' : 'https://sandbox.plaid.com/liabilities/get'}}
```

Both should use the conditional credentials as shown above.

### Workflow 3: Plaid Disconnect

If you have a disconnect workflow, update it too:

**Current URL:**
```
https://sandbox.plaid.com/item/remove
```

**Update to:**
```javascript
{{$env.PLAID_MODE === 'production' ? 'https://production.plaid.com/item/remove' : 'https://sandbox.plaid.com/item/remove'}}
```

---

## Step 4: Register Your Production Webhook URL

Plaid needs to know where to send webhook notifications:

1. Go to Plaid Dashboard: https://dashboard.plaid.com
2. Navigate to **"Team Settings"** → **"Webhooks"**
3. Make sure you're viewing **Production** webhooks (toggle at top)
4. Click **"Add webhook URL"**
5. Enter: `https://tenantry.app.n8n.cloud/webhook/plaid-webhooks`
6. Select these webhook types:
   - ✅ **ITEM_LOGIN_REQUIRED** - User needs to re-authenticate
   - ✅ **PENDING_EXPIRATION** - Access will expire soon  
   - ✅ **PENDING_DISCONNECT** - Item will be disconnected
   - ✅ **LOGIN_REPAIRED** - User re-authenticated successfully
   - ✅ **USER_PERMISSION_REVOKED** - User revoked access (REQUIRED)
   - ✅ **USER_ACCOUNT_REVOKED** - Account revoked (REQUIRED for Chase)
7. Click **"Save"**

---

## Step 5: Test with Real Bank Account

Now you can test with a real bank account:

1. **Refresh your app** to load the updated code
2. **Click "Connect your mortgage account"**
3. **Search for your real bank** (e.g., "Chase", "Wells Fargo", "Bank of America")
4. **Enter your real credentials**
5. **Authorize the connection**

### What Should Happen:

✅ You'll see console logs:
```
Requesting link token from n8n with body: {...}
Link token response status: 200
Link token received successfully: YES
connectMortgageAccount called with propertyId: ...
Plaid Link Success!
Exchanging public token for access token...
Exchange token response status: 200
Token exchange successful! Access token received: true
```

✅ You'll see the success alert: "✅ Success! Mortgage account connected."

✅ The property will show: "✓ Connected to [Your Bank Name]"

### If the Bank Has No Mortgage:

If you connect to a bank account that doesn't have a mortgage, Plaid will show the same "No liability accounts" message you saw before. This is expected! You need to connect to the bank where your **mortgage** is held (not just your checking account).

---

## Step 6: Production Compliance Requirements

### 6.1 Privacy Policy & Terms of Service

Plaid requires you to have:
- **Privacy Policy** that explains how you use financial data
- **Terms of Service** for your app
- **User consent** before connecting accounts

Make sure your app links to these documents.

### 6.2 Data Security

- ✅ **Never log** access tokens, account numbers, or sensitive data
- ✅ **Encrypt** access tokens in your database (Supabase does this)
- ✅ **Use HTTPS** for all connections (your app already does)
- ✅ **Delete data** when users disconnect

### 6.3 User Offboarding

Your app already handles this correctly with the "Disconnect" button, but make sure:
- Users can easily disconnect their accounts
- Data is deleted immediately when they disconnect
- You call Plaid's `/item/remove` endpoint

---

## Step 7: Monitor Production Usage

### Check Your Plaid Dashboard:

1. Go to https://dashboard.plaid.com
2. Switch to **Production** view (toggle at top)
3. Monitor:
   - **API usage** - How many requests you're making
   - **Active Items** - How many connections are live
   - **Webhooks** - Any webhook failures
   - **Errors** - Any API errors

### Plaid Pricing for Liabilities:

- **Development (Sandbox)**: Free
- **Production**: Typically $0.50 - $2.00 per Item per month (varies by volume)
- You only pay for **active** connections

---

## Troubleshooting Production Issues

### Issue: "Bank not found"
**Solution**: Not all banks support Plaid. Check Plaid's [institution coverage](https://plaid.com/institutions/).

### Issue: "This institution is not available"
**Solution**: Some banks require additional approval. Contact Plaid support to enable specific institutions.

### Issue: "Unable to log in"
**Solution**: 
- User's credentials might be wrong
- Bank might require MFA (will prompt automatically)
- Bank might have security restrictions on API access

### Issue: "No mortgage found"
**Solution**: 
- The account connected doesn't have a mortgage
- User needs to connect to the right bank (where their mortgage is)
- Bank might not expose mortgage data through Plaid (rare but possible)

---

## Quick Reference: Sandbox vs Production

| Feature | Sandbox | Production |
|---------|---------|------------|
| **API Base URL** | `sandbox.plaid.com` | `production.plaid.com` |
| **Test Credentials** | user_good / pass_good | Real bank credentials |
| **Data** | Mock data | Real account data |
| **Cost** | Free | ~$0.50-$2.00/Item/month |
| **Approval** | Instant | 1-2 days review |
| **Use Case** | Testing & development | Live production use |

---

## Next Steps After Going Live

1. ✅ Monitor your first few user connections closely
2. ✅ Check that mortgage data is being saved correctly
3. ✅ Test the "Update Connection" flow
4. ✅ Test the "Disconnect" flow
5. ✅ Monitor webhook events in Plaid Dashboard
6. ✅ Set up alerts for API errors in n8n

---

## Need Help?

- **Plaid Support**: support@plaid.com
- **Plaid Documentation**: https://plaid.com/docs/
- **Plaid Status Page**: https://status.plaid.com/
- **n8n Community**: https://community.n8n.io/

---

## Summary Checklist

Before going to production, make sure you've:

- [ ] Applied for and received Plaid production access
- [ ] Added production credentials to n8n environment variables
- [ ] Updated all 3 workflows to use production URLs
- [ ] Registered your webhook URL in Plaid Dashboard (production)
- [ ] Tested with a real bank account that has a mortgage
- [ ] Reviewed Plaid's compliance requirements
- [ ] Set up monitoring for errors and webhook events
- [ ] Have a privacy policy and terms of service

Once all checkboxes are complete, you're ready for production! 🚀


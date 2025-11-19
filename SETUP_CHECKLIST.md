# Plaid Mortgage Setup Checklist

Use this checklist to track your progress setting up the Plaid mortgage integration.

## ☐ Step 1: Database Setup

### Run the SQL Schema
- [ ] Open Supabase dashboard
- [ ] Go to SQL Editor
- [ ] Copy contents of `supabase-schema.sql`
- [ ] Paste and run in SQL Editor
- [ ] Verify tables were created:
  - [ ] `liabilities_mortgages`
  - [ ] `plaid_webhook_events`
  - [ ] `properties` has `owner_id` column

**Time estimate:** 15 minutes  
**Help:** See `PLAID_SETUP_INSTRUCTIONS.md` → Step 1

---

## ☐ Step 2: Update n8n Webhook #1 (Create Link Token)

**Webhook URL:** `https://tenantry.app.n8n.cloud/webhook/plaid-create-public-token`

- [ ] Open this workflow in n8n
- [ ] Update the Plaid API call to include `products: ['liabilities']`
- [ ] Ensure it receives: `owner_id`, `property_id`, `products` from frontend
- [ ] Test with curl command (see guide)
- [ ] Verify it returns a valid `link_token`

**Time estimate:** 20 minutes  
**Help:** See `n8n-workflows-guide.md` → Workflow 1

---

## ☐ Step 3: Update n8n Webhook #2 (Exchange & Get Mortgage Data)

**Webhook URL:** `https://tenantry.app.n8n.cloud/webhook/plaid-exchange-for-access-token`

- [ ] Open this workflow in n8n
- [ ] Keep existing: Exchange public token → access token
- [ ] **ADD:** Call `/liabilities/get` endpoint
- [ ] **ADD:** Process mortgage data (Function node)
- [ ] **ADD:** Upsert mortgages to Supabase `liabilities_mortgages` table
- [ ] Update response to include mortgage count

**Time estimate:** 1 hour  
**Help:** See `n8n-workflows-guide.md` → Workflow 2

---

## ☐ Step 4: Create n8n Webhook #3 (Plaid Webhooks)

**Webhook URL:** `https://tenantry.app.n8n.cloud/webhook/plaid-webhooks`

- [ ] Create new workflow in n8n
- [ ] Add Webhook trigger node
- [ ] Add Function node to parse webhook
- [ ] Add Switch node to route by webhook_code
- [ ] **Route 1:** ITEM_LOGIN_REQUIRED
  - [ ] Find property by plaid_item_id
  - [ ] Set plaid_needs_update = true
  - [ ] Log event to plaid_webhook_events table
- [ ] **Route 2:** PENDING_EXPIRATION
  - [ ] Same as Route 1
- [ ] **Route 3:** PENDING_DISCONNECT
  - [ ] Same as Route 1
- [ ] **Route 4:** LOGIN_REPAIRED
  - [ ] Set plaid_needs_update = false
  - [ ] Mark webhook events as resolved
- [ ] Test with curl command

**Time estimate:** 40 minutes  
**Help:** See `n8n-workflows-guide.md` → Workflow 3

---

## ☐ Step 5: Register Webhook with Plaid

- [ ] Go to https://dashboard.plaid.com
- [ ] Navigate to Team Settings → Webhooks
- [ ] Click "Add Webhook URL"
- [ ] Enter: `https://tenantry.app.n8n.cloud/webhook/plaid-webhooks`
- [ ] Select webhook types:
  - [ ] ITEM_LOGIN_REQUIRED
  - [ ] PENDING_EXPIRATION
  - [ ] PENDING_DISCONNECT
  - [ ] LOGIN_REPAIRED
- [ ] Save

**Time estimate:** 5 minutes  
**Help:** See `PLAID_SETUP_INSTRUCTIONS.md` → Step 3

---

## ☐ Step 6: Test the Integration

### Test Account Connection
- [ ] Run app: `npm run dev`
- [ ] Go to Properties page
- [ ] Click "Connect your mortgage account"
- [ ] Use Sandbox credentials:
  - Username: `user_good`
  - Password: `pass_good`
- [ ] Select any account
- [ ] Complete Plaid Link flow
- [ ] See success message: "Mortgage account connected"

### Verify Data in Supabase
- [ ] Open Supabase dashboard
- [ ] Check `liabilities_mortgages` table - should have mortgage data
- [ ] Verify `property_id` and `owner_id` are correct
- [ ] Check mortgage details (payment amount, interest rate, etc.)

### Test Update Mode
- [ ] Use Plaid's `/sandbox/item/reset_login` to trigger error
- [ ] OR manually update property: `plaid_needs_update = true`
- [ ] Refresh Properties page
- [ ] See "⚠ Update Connection" button
- [ ] Click button
- [ ] Go through Plaid Link again
- [ ] See connection restored
- [ ] Verify `plaid_needs_update = false` in database

**Time estimate:** 30 minutes  
**Help:** See `PLAID_SETUP_INSTRUCTIONS.md` → Step 4 & 5

---

## ☐ Step 7: Set Up Daily Sync (Optional)

- [ ] Create new scheduled workflow in n8n
- [ ] Set trigger: Daily at 2:00 AM
- [ ] Fetch all properties with plaid_access_token
- [ ] For each property:
  - [ ] Call `/liabilities/get`
  - [ ] Update `liabilities_mortgages` table
  - [ ] Set last_synced_at timestamp

**Time estimate:** 30 minutes  
**Help:** See `n8n-workflows-guide.md` → Workflow 4

---

## ☐ Step 8: Environment Variables

Make sure these are set in your n8n instance:

- [ ] `PLAID_CLIENT_ID` - Your Plaid client ID
- [ ] `PLAID_SECRET` - Your Plaid secret (sandbox)
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_KEY` - Your Supabase service role key

---

## Troubleshooting

If something doesn't work:

- [ ] Check n8n execution logs for errors
- [ ] Check Supabase logs for database errors
- [ ] Check Plaid Dashboard for webhook delivery status
- [ ] Review `PLAID_SETUP_INSTRUCTIONS.md` → Common Issues section
- [ ] Test webhooks individually with curl commands

---

## When Everything Works ✅

You should be able to:
- ✅ Click "Connect your mortgage account" on a property
- ✅ Complete Plaid Link flow in Sandbox
- ✅ See "Success!" message
- ✅ View mortgage data in Supabase `liabilities_mortgages` table
- ✅ See monthly payment amount, interest rate, loan term
- ✅ See "⚠ Update Connection" when auth expires
- ✅ Re-authenticate and restore connection
- ✅ Data syncs daily (if you set up Step 7)

---

## Next: Going to Production

When ready to launch:

- [ ] Apply for Plaid Production access
- [ ] Get approved by Plaid
- [ ] Update n8n webhooks to use `production.plaid.com`
- [ ] Update environment variables with production credentials
- [ ] Register production webhook URL with Plaid
- [ ] Test with real bank accounts
- [ ] Monitor webhook delivery and Item health

---

## Total Time Estimate

- **Minimum (Steps 1-6):** 2-3 hours
- **With optional daily sync:** 3-4 hours

---

## Quick Links

- 📚 Full Setup Guide: `PLAID_SETUP_INSTRUCTIONS.md`
- 🔧 n8n Workflows: `n8n-workflows-guide.md`
- 📋 Summary: `IMPLEMENTATION_SUMMARY.md`
- 🗄️ Database Schema: `supabase-schema.sql`

---

**Good luck! 🚀**

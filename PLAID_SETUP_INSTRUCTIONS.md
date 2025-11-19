# Plaid Mortgage Integration Setup Instructions

This guide will help you set up your Plaid integration for tracking mortgage data with proper update mode support.

## Step 1: Set Up Your Database

Run the SQL schema file in your Supabase SQL Editor:

1. Go to your Supabase dashboard
2. Click on "SQL Editor"
3. Copy the contents of `supabase-schema.sql` and paste it
4. Click "Run" to create all the necessary tables

This will create:
- Table to store mortgage data
- Table to track webhook events for update mode
- Indexes for better performance
- Row Level Security policies to keep data secure

## Step 2: Update Your n8n Webhooks

You'll need to update your n8n workflows to support mortgage data:

### Webhook 1: Create Link Token (`/webhook/plaid-create-public-token`)

**What it does:** Creates a Plaid Link token for connecting mortgage accounts

**Required Changes:**
- Add `'liabilities'` to the products array when creating the link token
- Support both regular mode and update mode

**Example Plaid API call in n8n:**
```javascript
{
  "client_id": "{{YOUR_PLAID_CLIENT_ID}}",
  "secret": "{{YOUR_PLAID_SECRET}}",
  "user": {
    "client_user_id": "{{$json.owner_id}}"
  },
  "client_name": "Tenantry",
  "products": ["liabilities"],  // Add liabilities here!
  "country_codes": ["US"],
  "language": "en",
  // For update mode:
  "access_token": "{{$json.access_token || null}}"  // Include this when update_mode is true
}
```

### Webhook 2: Exchange Token & Get Mortgage Data (`/webhook/plaid-exchange-for-access-token`)

**What it does:** Exchanges the public token for an access token AND fetches mortgage data

**Required Changes:**
1. Exchange the public token for an access token (existing)
2. Call `/liabilities/get` with the access token (NEW)
3. Save the mortgage data to Supabase (NEW)

**Example flow in n8n:**

**Step 1: Exchange Token (existing)**
```javascript
POST https://sandbox.plaid.com/item/public_token/exchange
{
  "client_id": "{{YOUR_PLAID_CLIENT_ID}}",
  "secret": "{{YOUR_PLAID_SECRET}}",
  "public_token": "{{$json.public_token}}"
}
```

**Step 2: Get Liabilities Data (NEW)**
```javascript
POST https://sandbox.plaid.com/liabilities/get
{
  "client_id": "{{YOUR_PLAID_CLIENT_ID}}",
  "secret": "{{YOUR_PLAID_SECRET}}",
  "access_token": "{{$node['Exchange Token'].json.access_token}}"
}
```

**Step 3: Save to Supabase (NEW)**

The response from `/liabilities/get` will look like this:
```json
{
  "liabilities": {
    "mortgage": [...]
  }
}
```

For each mortgage, insert into `liabilities_mortgages` table:
```javascript
{
  "property_id": "{{$json.property_id}}",
  "owner_id": "{{$json.owner_id}}",
  "plaid_account_id": "{{mortgage.account_id}}",
  "plaid_item_id": "{{$node['Exchange Token'].json.item_id}}",
  "account_number": "{{mortgage.account_number}}",
  "loan_type_description": "{{mortgage.loan_type_description}}",
  // ... map all fields from Plaid response
}
```

### Webhook 3: Plaid Webhooks Handler (NEW)

**What it does:** Receives webhooks from Plaid when items need attention

**URL to register with Plaid:** `https://tenantry.app.n8n.cloud/webhook/plaid-webhooks`

**Webhooks to handle:**
- `ITEM_LOGIN_REQUIRED` - User needs to re-authenticate
- `PENDING_EXPIRATION` - Access token will expire soon
- `PENDING_DISCONNECT` - Item will be disconnected soon
- `LOGIN_REPAIRED` - User successfully re-authenticated

**Example n8n flow:**

1. **Receive Webhook** (Webhook trigger node)
2. **Check Webhook Type** (IF node)
   - If webhook_code is `ITEM_LOGIN_REQUIRED`, `PENDING_EXPIRATION`, or `PENDING_DISCONNECT`:
     - Find the property with this `plaid_item_id` in Supabase
     - Update the property: set `plaid_needs_update = true`
     - Insert record into `plaid_webhook_events` table
   - If webhook_code is `LOGIN_REPAIRED`:
     - Update the property: set `plaid_needs_update = false`
     - Mark webhook event as resolved in `plaid_webhook_events` table

### Webhook 4: Sync Mortgage Data (NEW - Optional but Recommended)

**What it does:** Updates mortgage data periodically (Plaid recommends daily)

**URL:** `https://tenantry.app.n8n.cloud/webhook/sync-mortgages`

**When to run:** Daily via n8n schedule trigger

**Example flow:**
1. Get all properties with `plaid_access_token` from Supabase
2. For each property:
   - Call `/liabilities/get` with the access token
   - Update the `liabilities_mortgages` table in Supabase
   - Set `last_synced_at = NOW()`

### Webhook 4: Disconnect Account (NEW - Required for User Offboarding)

**What it does:** Called when user clicks "Disconnect" button. Removes the Item from Plaid and deletes all stored mortgage data.

**URL:** `https://tenantry.app.n8n.cloud/webhook/plaid-disconnect`

**Example flow:**
1. Receive disconnect request from frontend
2. Call Plaid's `/item/remove` endpoint to deactivate the Item
3. Delete all mortgage data from `liabilities_mortgages` table
4. Return success response

**Why this is required:** Plaid requires you to call `/item/remove` when users disconnect to properly deactivate Items and manage costs. You must also delete stored data per data retention requirements.

## Step 3: Register Webhooks with Plaid

You need to tell Plaid where to send webhook notifications:

1. Go to your Plaid Dashboard (https://dashboard.plaid.com)
2. Navigate to "Team Settings" > "Webhooks"
3. Add your webhook URL: `https://tenantry.app.n8n.cloud/webhook/plaid-webhooks`
4. Select these webhook types:
   - **ITEM: ITEM_LOGIN_REQUIRED** - User needs to re-authenticate
   - **ITEM: PENDING_EXPIRATION** - Access will expire soon
   - **ITEM: PENDING_DISCONNECT** - Item will be disconnected soon
   - **ITEM: LOGIN_REPAIRED** - User successfully re-authenticated
   - **ITEM: USER_PERMISSION_REVOKED** - User revoked access (REQUIRED for compliance)
   - **ITEM: USER_ACCOUNT_REVOKED** - User account was revoked (REQUIRED for Chase)

## Step 4: Test in Sandbox

Plaid provides test credentials for Sandbox:

**To test a successful connection:**
- Username: `user_good`
- Password: `pass_good`

**To test ITEM_LOGIN_REQUIRED error:**
- Use the endpoint `/sandbox/item/reset_login` to force an item into error state

**To test mortgage data:**
- Plaid Sandbox returns mock data automatically when you connect

## Step 5: Add Owner Authentication (Important!)

Your app needs to track which owner is logged in. The code already does this:

```typescript
const { data: { user } } = await supabase.auth.getUser();
const ownerId = user?.id;
```

This gets passed as `owner_id` to your webhooks along with `property_id`.

## Common Issues & Solutions

### Issue: "No mortgage data returned"
**Solution:** The account you're connecting might not have a mortgage. In Sandbox, use `user_good` with `pass_good` to get mock data.

### Issue: "Update mode not triggering"
**Solution:** Make sure you're:
1. Passing the `access_token` when creating the link token
2. Setting the `update_mode` flag in your webhook request
3. Checking that `plaid_needs_update` is being set in your database

### Issue: "Webhook not receiving events"
**Solution:** 
1. Verify your webhook URL is accessible from the internet
2. Check that you've registered the webhook in Plaid Dashboard
3. In Sandbox, you can manually trigger webhooks using `/sandbox/item/reset_login`

## User Offboarding & Data Retention (IMPORTANT)

Per Plaid's requirements, you must properly handle user offboarding:

### When users disconnect:
1. **User clicks "Disconnect" button** in your UI
2. **Your app calls** `/webhook/plaid-disconnect`
3. **n8n calls** Plaid's `/item/remove` endpoint
4. **n8n deletes** all mortgage data from database
5. **User sees** confirmation message

### When users revoke access:
1. **Plaid sends** `USER_PERMISSION_REVOKED` or `USER_ACCOUNT_REVOKED` webhook
2. **n8n automatically deletes** all mortgage data
3. **n8n clears** Plaid connection from property
4. **User loses access** to that data

### Data retention best practices:
- Delete data immediately when users disconnect or revoke access
- Don't retain access tokens or mortgage data after disconnection
- Log the deletion for audit purposes in `plaid_webhook_events` table
- Follow your privacy policy and applicable laws (GDPR, CCPA, etc.)

**Why this matters:** Plaid requires proper user offboarding to maintain compliance and manage API costs. Failing to implement this can result in:
- Failed compliance audits
- Unnecessary API charges for inactive Items
- Privacy violations

## What Happens When Everything is Working

1. **User connects mortgage account:**
   - Frontend calls your n8n webhook to get a link token
   - User goes through Plaid Link flow
   - Frontend sends public token to your exchange webhook
   - n8n exchanges token, fetches mortgage data, saves to Supabase
   - User sees "✓ Connected to [Bank Name]" in the UI

2. **User's session expires at their bank:**
   - Bank notifies Plaid
   - Plaid sends webhook to your n8n webhook handler
   - n8n sets `plaid_needs_update = true` on the property
   - User sees "⚠ Update Connection" button in UI
   - User clicks button and goes through update mode
   - Connection is restored

3. **Daily sync (optional):**
   - n8n runs scheduled workflow
   - Fetches latest mortgage data for all properties
   - Updates database with new payment amounts, balances, etc.

## Next Steps

After setup is complete, you can:
- Display mortgage payment information on property cards
- Show next payment due dates
- Track interest rates and loan terms
- Calculate monthly cash flow (rent - mortgage payment)
- Alert users when payments are due

## Need Help?

- Plaid Documentation: https://plaid.com/docs/
- Plaid API Reference: https://plaid.com/docs/api/
- Supabase Documentation: https://supabase.com/docs

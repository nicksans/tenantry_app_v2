# n8n Workflows for Plaid Mortgage Integration

This guide provides step-by-step instructions for setting up your n8n workflows to handle Plaid mortgage data.

## Workflow 1: Create Link Token

**Webhook URL:** `https://tenantry.app.n8n.cloud/webhook/plaid-create-public-token`

### Node Configuration:

#### 1. Webhook Node (Trigger)
- **Method:** POST
- **Path:** `/webhook/plaid-create-public-token`
- **Response:** Respond Immediately

#### 2. Function Node: Prepare Plaid Request
```javascript
// Extract data from incoming request
const owner_id = $input.item.json.owner_id;
const property_id = $input.item.json.property_id;
const access_token = $input.item.json.access_token;
const update_mode = $input.item.json.update_mode || false;
const products = $input.item.json.products || ['liabilities'];

// Get Plaid credentials from environment
const clientId = $env.PLAID_CLIENT_ID;
const secret = $env.PLAID_SECRET;

// Build request body
const requestBody = {
  client_id: clientId,
  secret: secret,
  user: {
    client_user_id: owner_id
  },
  client_name: "Tenantry",
  products: products,
  country_codes: ["US"],
  language: "en"
};

// For update mode, add access_token
if (update_mode && access_token) {
  requestBody.access_token = access_token;
}

return { json: requestBody };
```

#### 3. HTTP Request Node: Call Plaid API
- **Method:** POST
- **URL:** `https://sandbox.plaid.com/link/token/create` (use `https://production.plaid.com/link/token/create` for production)
- **Body Content Type:** JSON
- **Body:** `{{ $json }}`
- **Options:**
  - Response Format: JSON

#### 4. Function Node: Format Response
```javascript
return {
  json: {
    link_token: $input.item.json.link_token,
    expiration: $input.item.json.expiration
  }
};
```

#### 5. Respond to Webhook Node
- **Response:** `{{ $json }}`

---

## Workflow 2: Exchange Token & Get Mortgage Data

**Webhook URL:** `https://tenantry.app.n8n.cloud/webhook/plaid-exchange-for-access-token`

### Node Configuration:

#### 1. Webhook Node (Trigger)
- **Method:** POST
- **Path:** `/webhook/plaid-exchange-for-access-token`
- **Response:** Using 'Respond to Webhook' Node

#### 2. Function Node: Extract Request Data
```javascript
return {
  json: {
    public_token: $input.item.json.public_token,
    property_id: $input.item.json.property_id,
    owner_id: $input.item.json.owner_id,
    metadata: $input.item.json.metadata,
    update_mode: $input.item.json.update_mode || false
  }
};
```

#### 3. HTTP Request Node: Exchange Public Token
- **Method:** POST
- **URL:** `https://sandbox.plaid.com/item/public_token/exchange`
- **Body Content Type:** JSON
- **Body:**
```json
{
  "client_id": "{{$env.PLAID_CLIENT_ID}}",
  "secret": "{{$env.PLAID_SECRET}}",
  "public_token": "{{$json.public_token}}"
}
```

#### 4. Set Node: Store Token Data
- **access_token:** `{{ $json.access_token }}`
- **item_id:** `{{ $json.item_id }}`
- **property_id:** `{{ $('Function Node').item.json.property_id }}`
- **owner_id:** `{{ $('Function Node').item.json.owner_id }}`
- **metadata:** `{{ $('Function Node').item.json.metadata }}`

#### 5. HTTP Request Node: Get Liabilities Data
- **Method:** POST
- **URL:** `https://sandbox.plaid.com/liabilities/get`
- **Body Content Type:** JSON
- **Body:**
```json
{
  "client_id": "{{$env.PLAID_CLIENT_ID}}",
  "secret": "{{$env.PLAID_SECRET}}",
  "access_token": "{{$('Set Node').item.json.access_token}}"
}
```

#### 6. Function Node: Process Mortgages
```javascript
const liabilities = $input.item.json.liabilities;
const mortgages = liabilities.mortgage || [];
const property_id = $('Set Node').item.json.property_id;
const owner_id = $('Set Node').item.json.owner_id;
const item_id = $('Set Node').item.json.item_id;

// Transform mortgages for Supabase
const mortgageRecords = mortgages.map(mortgage => ({
  property_id: property_id,
  owner_id: owner_id,
  plaid_account_id: mortgage.account_id,
  plaid_item_id: item_id,
  account_number: mortgage.account_number,
  loan_type_description: mortgage.loan_type_description,
  loan_term: mortgage.loan_term,
  origination_date: mortgage.origination_date,
  maturity_date: mortgage.maturity_date,
  last_payment_date: mortgage.last_payment_date,
  next_payment_due_date: mortgage.next_payment_due_date,
  origination_principal_amount: mortgage.origination_principal_amount,
  current_late_fee: mortgage.current_late_fee,
  escrow_balance: mortgage.escrow_balance,
  last_payment_amount: mortgage.last_payment_amount,
  next_monthly_payment: mortgage.next_monthly_payment,
  past_due_amount: mortgage.past_due_amount,
  ytd_interest_paid: mortgage.ytd_interest_paid,
  ytd_principal_paid: mortgage.ytd_principal_paid,
  interest_rate_percentage: mortgage.interest_rate?.percentage,
  interest_rate_type: mortgage.interest_rate?.type,
  has_pmi: mortgage.has_pmi || false,
  has_prepayment_penalty: mortgage.has_prepayment_penalty || false,
  property_address_street: mortgage.property_address?.street,
  property_address_city: mortgage.property_address?.city,
  property_address_region: mortgage.property_address?.region,
  property_address_postal_code: mortgage.property_address?.postal_code,
  property_address_country: mortgage.property_address?.country,
  last_synced_at: new Date().toISOString()
}));

return mortgageRecords.map(record => ({ json: record }));
```

#### 7. Supabase Node: Upsert Mortgages
- **Operation:** Insert or Update (Upsert)
- **Table:** `liabilities_mortgages`
- **Conflict Columns:** `plaid_account_id, property_id`
- **Data:** `{{ $json }}`

#### 8. Respond to Webhook Node
- **Response:**
```json
{
  "success": true,
  "access_token": "{{$('Set Node').item.json.access_token}}",
  "item_id": "{{$('Set Node').item.json.item_id}}",
  "property_id": "{{$('Set Node').item.json.property_id}}",
  "mortgages_saved": "{{$('HTTP Request 2').item.json.liabilities.mortgage.length || 0}}"
}
```

---

## Workflow 3: Handle Plaid Webhooks (Update Mode)

**Webhook URL:** `https://tenantry.app.n8n.cloud/webhook/plaid-webhooks`

### Node Configuration:

#### 1. Webhook Node (Trigger)
- **Method:** POST
- **Path:** `/webhook/plaid-webhooks`
- **Response:** Respond Immediately

#### 2. Function Node: Parse Webhook
```javascript
const webhookType = $input.item.json.webhook_type;
const webhookCode = $input.item.json.webhook_code;
const itemId = $input.item.json.item_id;
const error = $input.item.json.error;

return {
  json: {
    webhook_type: webhookType,
    webhook_code: webhookCode,
    item_id: itemId,
    error_code: error?.error_code,
    error_message: error?.error_message
  }
};
```

#### 3. Switch Node: Route by Webhook Code
- **Mode:** Expression
- **Expression:** `{{ $json.webhook_code }}`

**Routes:**
- `ITEM_LOGIN_REQUIRED`
- `PENDING_EXPIRATION`
- `PENDING_DISCONNECT`
- `LOGIN_REPAIRED`
- `USER_PERMISSION_REVOKED`
- `USER_ACCOUNT_REVOKED`
- Default

#### 4a. Supabase Node: Find Property (for error webhooks)
- **Operation:** Select
- **Table:** `properties`
- **Where:** `plaid_item_id.eq.{{ $json.item_id }}`

#### 4b. Supabase Node: Mark Property Needs Update
- **Operation:** Update
- **Table:** `properties`
- **Where:** `plaid_item_id.eq.{{ $json.item_id }}`
- **Data:**
```json
{
  "plaid_needs_update": true
}
```

#### 4c. Supabase Node: Log Webhook Event
- **Operation:** Insert
- **Table:** `plaid_webhook_events`
- **Data:**
```json
{
  "plaid_item_id": "{{$('Function Node').item.json.item_id}}",
  "webhook_type": "{{$('Function Node').item.json.webhook_type}}",
  "webhook_code": "{{$('Function Node').item.json.webhook_code}}",
  "error_code": "{{$('Function Node').item.json.error_code}}",
  "error_message": "{{$('Function Node').item.json.error_message}}",
  "property_id": "{{$('Supabase 1').item.json.id}}",
  "owner_id": "{{$('Supabase 1').item.json.owner_id}}",
  "resolved": false
}
```

#### 5. For LOGIN_REPAIRED Route:

#### 5a. Supabase Node: Mark Property as Fixed
- **Operation:** Update
- **Table:** `properties`
- **Where:** `plaid_item_id.eq.{{ $json.item_id }}`
- **Data:**
```json
{
  "plaid_needs_update": false
}
```

#### 5b. Supabase Node: Mark Webhook Events as Resolved
- **Operation:** Update
- **Table:** `plaid_webhook_events`
- **Where:** `plaid_item_id.eq.{{ $json.item_id }}.and.resolved.eq.false`
- **Data:**
```json
{
  "resolved": true,
  "resolved_at": "{{new Date().toISOString()}}"
}
```

#### 6. For USER_PERMISSION_REVOKED and USER_ACCOUNT_REVOKED Routes:

**Important:** These webhooks indicate the user has revoked access. You MUST delete all stored data per Plaid's requirements.

#### 6a. Supabase Node: Find Property
- **Operation:** Select
- **Table:** `properties`
- **Where:** `plaid_item_id.eq.{{ $json.item_id }}`

#### 6b. Supabase Node: Delete Mortgage Data
- **Operation:** Delete
- **Table:** `liabilities_mortgages`
- **Where:** `plaid_item_id.eq.{{ $json.item_id }}`

#### 6c. Supabase Node: Clear Property Connection
- **Operation:** Update
- **Table:** `properties`
- **Where:** `plaid_item_id.eq.{{ $json.item_id }}`
- **Data:**
```json
{
  "plaid_item_id": null,
  "plaid_access_token": null,
  "plaid_institution_name": null,
  "plaid_needs_update": false
}
```

#### 6d. Supabase Node: Log Revocation Event
- **Operation:** Insert
- **Table:** `plaid_webhook_events`
- **Data:**
```json
{
  "plaid_item_id": "{{$('Function Node').item.json.item_id}}",
  "webhook_type": "{{$('Function Node').item.json.webhook_type}}",
  "webhook_code": "{{$('Function Node').item.json.webhook_code}}",
  "property_id": "{{$('Supabase 1').item.json.id}}",
  "owner_id": "{{$('Supabase 1').item.json.owner_id}}",
  "resolved": true,
  "resolved_at": "{{new Date().toISOString()}}"
}
```

---

## Workflow 4: Disconnect Account (/item/remove)

**Webhook URL:** `https://tenantry.app.n8n.cloud/webhook/plaid-disconnect`

**What it does:** Called when user clicks "Disconnect" button. Removes the Item from Plaid and deletes all stored mortgage data.

### Node Configuration:

#### 1. Webhook Node (Trigger)
- **Method:** POST
- **Path:** `/webhook/plaid-disconnect`
- **Response:** Using 'Respond to Webhook' Node

#### 2. Function Node: Extract Request Data
```javascript
return {
  json: {
    property_id: $input.item.json.property_id,
    plaid_item_id: $input.item.json.plaid_item_id,
    plaid_access_token: $input.item.json.plaid_access_token,
    owner_id: $input.item.json.owner_id
  }
};
```

#### 3. HTTP Request Node: Call /item/remove
- **Method:** POST
- **URL:** `https://sandbox.plaid.com/item/remove`
- **Body Content Type:** JSON
- **Body:**
```json
{
  "client_id": "{{$env.PLAID_CLIENT_ID}}",
  "secret": "{{$env.PLAID_SECRET}}",
  "access_token": "{{$json.plaid_access_token}}"
}
```

**What this does:** Deactivates the Item in Plaid so it no longer consumes API credits.

#### 4. Supabase Node: Delete Mortgage Data
- **Operation:** Delete
- **Table:** `liabilities_mortgages`
- **Where:** `plaid_item_id.eq.{{ $('Function Node').item.json.plaid_item_id }}`

**What this does:** Removes all stored mortgage data per data retention best practices.

#### 5. Respond to Webhook Node
- **Response:**
```json
{
  "success": true,
  "message": "Item removed and data deleted",
  "property_id": "{{$('Function Node').item.json.property_id}}"
}
```

---

## Workflow 5: Daily Sync Mortgages (Optional)

**Trigger:** Schedule Trigger - Daily at 2:00 AM

### Node Configuration:

#### 1. Schedule Trigger
- **Trigger Interval:** Every day at 2:00 AM

#### 2. Supabase Node: Get All Properties with Plaid Access
- **Operation:** Select
- **Table:** `properties`
- **Where:** `plaid_access_token.not.is.null`

#### 3. Loop Over Items Node
- Use Code node to iterate through properties

#### 4. HTTP Request Node: Get Liabilities
- **Method:** POST
- **URL:** `https://sandbox.plaid.com/liabilities/get`
- **Body:**
```json
{
  "client_id": "{{$env.PLAID_CLIENT_ID}}",
  "secret": "{{$env.PLAID_SECRET}}",
  "access_token": "{{$json.plaid_access_token}}"
}
```

#### 5-7. Same processing nodes as Workflow 2 (steps 6-7)
- Process and upsert mortgages

---

## Environment Variables to Set in n8n

In your n8n instance, set these environment variables:

- `PLAID_CLIENT_ID` - Your Plaid client ID
- `PLAID_SECRET` - Your Plaid secret (sandbox or production)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key

---

## Testing Your Workflows

### Test Create Link Token:
```bash
curl -X POST https://tenantry.app.n8n.cloud/webhook/plaid-create-public-token \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-owner-123",
    "property_id": "test-property-456",
    "products": ["liabilities"]
  }'
```

### Test in Sandbox:
1. Use the link_token from above to initialize Plaid Link
2. Use credentials: `user_good` / `pass_good`
3. Select a mortgage account
4. Your exchange webhook will be called automatically

### Test Webhook Handling:
```bash
# Simulate ITEM_LOGIN_REQUIRED webhook
curl -X POST https://tenantry.app.n8n.cloud/webhook/plaid-webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_type": "ITEM",
    "webhook_code": "ITEM_LOGIN_REQUIRED",
    "item_id": "your-test-item-id",
    "error": {
      "error_code": "ITEM_LOGIN_REQUIRED",
      "error_message": "Item login required"
    }
  }'
```

---

## Common Issues

### Issue: "Invalid client_id or secret"
**Solution:** Check your environment variables in n8n

### Issue: "Supabase insert fails"
**Solution:** Make sure you've run the SQL schema first and the tables exist

### Issue: "Can't find property by plaid_item_id"
**Solution:** Make sure you're saving the plaid_item_id when exchanging the token

### Issue: "No mortgage data returned"
**Solution:** The account might not have a mortgage. In Sandbox, use `user_good`/`pass_good` to get mock data

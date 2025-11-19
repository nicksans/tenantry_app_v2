# Plaid Production Readiness Checklist

This guide covers all requirements for moving from Sandbox to Production with Plaid.

---

## ✅ 1. Store Production Access Tokens Securely

### Current Implementation: ✅ COVERED

**Where tokens are stored:**
- `properties.plaid_access_token` - encrypted in Supabase
- `liabilities_mortgages.plaid_item_id` - for reference

**Security measures in place:**
- ✅ Stored in Supabase (encrypted at rest)
- ✅ Row Level Security (RLS) policies - users only see their own data
- ✅ Never exposed to frontend (only sent to n8n backend)
- ✅ Only accessed server-side in n8n workflows

**Additional recommendations:**
- [ ] Enable Supabase's additional encryption for sensitive columns
- [ ] Use environment variables for Plaid credentials (already documented)
- [ ] Rotate Plaid secrets regularly
- [ ] Monitor access logs for suspicious activity

**Action needed:** ✅ Already implemented

---

## ⚠️ 2. Provide Required Notices and Obtain Consent

### Current Implementation: ❌ NOT COVERED

**What Plaid requires:**
- Privacy policy that mentions Plaid data collection
- User consent before connecting accounts
- Clear disclosure of what data you'll access
- Option to revoke access at any time

### What you need to add:

#### A. Update Your Privacy Policy

Add a section about Plaid:

```
Financial Data Collection

We use Plaid Technologies, Inc. ("Plaid") to connect your financial accounts. 
By using our service, you grant us and Plaid the right, power, and authority to 
access and transmit your personal and financial information from your financial 
institution. You agree to your personal and financial information being 
transferred, stored, and processed by Plaid in accordance with the Plaid 
End User Privacy Policy: https://plaid.com/legal/#end-user-privacy-policy

We collect the following data through Plaid:
- Mortgage account information (loan balance, interest rate, payment amounts)
- Property addresses associated with mortgages
- Account holder names and contact information

You can disconnect your accounts at any time through the Properties page.
```

#### B. Add Consent UI Before Plaid Link

**Update `Properties.tsx`** to show a consent dialog:

```typescript
const [showConsentDialog, setShowConsentDialog] = useState(false);
const [pendingConnectionPropertyId, setPendingConnectionPropertyId] = useState<string | null>(null);

const handleConnectClick = (propertyId: string) => {
  setPendingConnectionPropertyId(propertyId);
  setShowConsentDialog(true);
};

const handleConsentAccept = () => {
  if (pendingConnectionPropertyId) {
    connectMortgageAccount(pendingConnectionPropertyId);
  }
  setShowConsentDialog(false);
  setPendingConnectionPropertyId(null);
};
```

**Add consent dialog JSX:**

```jsx
{showConsentDialog && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-4">Connect Your Mortgage Account</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        By continuing, you authorize Tenantry to access your mortgage account 
        information through Plaid. We will collect:
      </p>
      <ul className="text-sm text-gray-600 dark:text-gray-400 mb-4 list-disc list-inside">
        <li>Mortgage balance and payment amounts</li>
        <li>Interest rate and loan terms</li>
        <li>Property address</li>
      </ul>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        You can disconnect at any time. See our{' '}
        <a href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</a>
        {' '}and{' '}
        <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener" className="text-brand-600 hover:underline">
          Plaid's Privacy Policy
        </a>
        {' '}for more information.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setShowConsentDialog(false)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConsentAccept}
          className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
)}
```

**Action needed:** 🔴 MUST IMPLEMENT before production

---

## ✅ 3. Store Sensitive User Data Appropriately

### Current Implementation: ⚠️ PARTIALLY COVERED

**Current security measures:**
- ✅ Data stored in Supabase (encrypted at rest)
- ✅ Row Level Security (RLS) policies
- ✅ HTTPS connections
- ✅ Access tokens not exposed to frontend

**Sensitive data stored:**
- `plaid_access_token` (in `properties` table)
- Mortgage details (in `liabilities_mortgages` table)
- Property addresses
- Owner IDs

### Recommendations for enhanced security:

#### A. Enable Column-Level Encryption in Supabase

For extra-sensitive fields like `plaid_access_token`:

```sql
-- Option 1: Use Supabase Vault (recommended)
-- Store access tokens in Supabase Vault instead of directly in table
-- See: https://supabase.com/docs/guides/database/vault

-- Option 2: Application-level encryption
-- Encrypt in n8n before storing, decrypt when retrieving
```

#### B. Implement Access Logging

Track who accesses mortgage data:

```sql
-- Create audit log table
CREATE TABLE IF NOT EXISTS plaid_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),
  property_id UUID REFERENCES properties(id),
  action TEXT NOT NULL, -- 'view', 'connect', 'disconnect', 'sync'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_access_logs_owner ON plaid_access_logs(owner_id);
CREATE INDEX idx_access_logs_created ON plaid_access_logs(created_at);
```

#### C. Data Retention Policy

Implement automatic data deletion:

```sql
-- Function to delete old mortgage data
CREATE OR REPLACE FUNCTION delete_old_mortgage_data()
RETURNS void AS $$
BEGIN
  -- Delete mortgage data older than 7 years (adjust as needed)
  DELETE FROM liabilities_mortgages
  WHERE last_synced_at < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule to run monthly
-- Set up in Supabase Dashboard > Database > Functions
```

**Action needed:** ⚠️ RECOMMENDED before production

---

## 🔴 4. Remove Sandbox Calls

### Current Implementation: ❌ NEEDS ACTION

**What needs to change:**

All your n8n workflows currently use `sandbox.plaid.com` endpoints. Before production, you MUST update ALL of these.

### Checklist for removing Sandbox calls:

#### In n8n Workflow 1 (Create Link Token):
- [ ] Change `https://sandbox.plaid.com/link/token/create`
- [ ] To: `https://production.plaid.com/link/token/create`

#### In n8n Workflow 2 (Exchange & Get Mortgage Data):
- [ ] Change `https://sandbox.plaid.com/item/public_token/exchange`
- [ ] To: `https://production.plaid.com/item/public_token/exchange`
- [ ] Change `https://sandbox.plaid.com/liabilities/get`
- [ ] To: `https://production.plaid.com/liabilities/get`

#### In n8n Workflow 4 (Disconnect Account):
- [ ] Change `https://sandbox.plaid.com/item/remove`
- [ ] To: `https://production.plaid.com/item/remove`

#### In n8n Workflow 5 (Daily Sync):
- [ ] Change `https://sandbox.plaid.com/liabilities/get`
- [ ] To: `https://production.plaid.com/liabilities/get`

### Best Practice: Use Environment Variables

Instead of hardcoding URLs, use an environment variable:

```javascript
const plaidBaseUrl = $env.PLAID_BASE_URL || 'https://production.plaid.com';

// Then in your HTTP request nodes:
const url = `${plaidBaseUrl}/link/token/create`;
```

**Set in n8n:**
- `PLAID_BASE_URL=https://sandbox.plaid.com` (for testing)
- `PLAID_BASE_URL=https://production.plaid.com` (for production)

**Action needed:** 🔴 CRITICAL before production - ALL calls will fail if you forget this

---

## 🔴 5. Switch to Production Server and API Keys

### Current Implementation: ❌ NEEDS ACTION

**What you need to do:**

#### A. Get Production API Keys from Plaid

1. Go to https://dashboard.plaid.com
2. Navigate to "Team Settings" > "Keys"
3. Under "Production", click "Get API Keys"
4. Copy your:
   - Production `client_id`
   - Production `secret`

#### B. Update Environment Variables in n8n

Replace your Sandbox credentials with Production credentials:

```
PLAID_CLIENT_ID=your_production_client_id_here
PLAID_SECRET=your_production_secret_here
PLAID_BASE_URL=https://production.plaid.com
```

⚠️ **IMPORTANT:** Keep Sandbox credentials saved somewhere for testing!

#### C. Test in Development Environment First

Before going live:

1. Create a separate n8n workflow set for "staging"
2. Use production keys but test with your own accounts
3. Verify:
   - Connection works
   - Mortgage data syncs correctly
   - Update mode works
   - Disconnect works
   - Webhooks are received

#### D. Register Production Webhook URL

In Plaid Dashboard:
1. Go to "Team Settings" > "Webhooks"
2. Remove the Sandbox webhook URL
3. Add your production webhook URL: `https://your-production-domain.com/webhook/plaid-webhooks`
4. Select all required webhook types (same as Sandbox)

**Action needed:** 🔴 CRITICAL - Must be done before any production users

---

## 📋 Complete Pre-Production Checklist

Before enabling Plaid for real users, verify ALL of these:

### Security & Compliance
- [ ] Access tokens stored securely in Supabase
- [ ] RLS policies enabled on all tables
- [ ] Privacy policy updated with Plaid disclosure
- [ ] User consent dialog implemented
- [ ] Disconnect button functional
- [ ] Data deletion on revocation working
- [ ] Access logs implemented (optional but recommended)

### API Configuration
- [ ] All `/sandbox/` endpoints changed to production URLs
- [ ] Production API keys obtained from Plaid
- [ ] Environment variables updated in n8n with production keys
- [ ] Production webhook URL registered with Plaid
- [ ] Webhook event types configured correctly

### Testing
- [ ] Tested connection with real bank account (your own)
- [ ] Verified mortgage data syncs correctly
- [ ] Tested update mode (re-authentication)
- [ ] Tested disconnect flow
- [ ] Tested revocation webhooks
- [ ] Verified data is deleted properly
- [ ] Checked all n8n workflows execute without errors

### Documentation & Support
- [ ] Privacy policy live on your website
- [ ] Terms of service mention Plaid
- [ ] Support email configured for user questions
- [ ] Error handling in place for failed connections
- [ ] User-friendly error messages (not technical Plaid errors)

### Monitoring
- [ ] n8n workflow monitoring enabled
- [ ] Plaid Dashboard monitoring configured
- [ ] Alerts set up for webhook failures
- [ ] Alerts set up for Item errors
- [ ] Database query monitoring for performance

---

## 🚀 Going Live - Step by Step

### Phase 1: Soft Launch (1-2 weeks)
1. Enable for yourself and test thoroughly
2. Enable for 5-10 beta users
3. Monitor closely for errors
4. Gather feedback on UX

### Phase 2: Limited Launch (2-4 weeks)
1. Enable for 50-100 users
2. Monitor Plaid Dashboard daily
3. Check webhook delivery rates
4. Review n8n execution logs
5. Optimize based on performance data

### Phase 3: Full Launch
1. Enable for all users
2. Maintain ongoing monitoring
3. Set up monthly reviews of:
   - API usage and costs
   - Error rates
   - User adoption rates
   - Support tickets related to Plaid

---

## 📊 Ongoing Maintenance

### Daily
- [ ] Check Plaid Dashboard for any Item errors
- [ ] Review n8n failed workflows
- [ ] Monitor webhook delivery rate

### Weekly
- [ ] Review user disconnect rate
- [ ] Check for Items needing update
- [ ] Review mortgage data sync success rate

### Monthly
- [ ] Review Plaid billing
- [ ] Check for new Plaid API features
- [ ] Update documentation if needed
- [ ] Review security practices

### Quarterly
- [ ] Audit stored data for compliance
- [ ] Review and update privacy policy if needed
- [ ] Test disaster recovery procedures
- [ ] Review access logs for anomalies

---

## 🆘 Common Production Issues

### Issue: "Invalid client_id or secret"
**Solution:** You're using Sandbox keys with production URLs, or vice versa. Check your environment variables.

### Issue: "Webhook not being received"
**Solution:** Verify you registered your production webhook URL (not localhost or Sandbox URL) in Plaid Dashboard.

### Issue: "Item immediately enters error state"
**Solution:** Real banks are more strict than Sandbox. User may need to:
- Enable API access in their bank
- Approve third-party connections
- Use app-specific passwords

### Issue: "High API costs"
**Solution:** 
- Call `/item/remove` when users disconnect
- Don't sync more frequently than needed (daily is usually sufficient)
- Only request products you actually use (liabilities only)

---

## 📞 Support Resources

- **Plaid Support:** support@plaid.com
- **Plaid Dashboard:** https://dashboard.plaid.com
- **Plaid Docs:** https://plaid.com/docs/
- **Plaid Status:** https://status.plaid.com
- **Plaid Community:** https://community.plaid.com

---

## ✅ Summary

**Currently Implemented:**
- ✅ Secure token storage
- ✅ User offboarding flows
- ✅ Data deletion on revocation

**Must Add Before Production:**
- 🔴 User consent dialog
- 🔴 Privacy policy updates
- 🔴 Change Sandbox URLs to Production
- 🔴 Switch to Production API keys
- 🔴 Register production webhook URL

**Recommended:**
- ⚠️ Enhanced encryption for tokens
- ⚠️ Access logging
- ⚠️ Automated data retention policies

**Estimated time to production-ready:** 4-6 hours for critical items, 8-12 hours for all recommendations.


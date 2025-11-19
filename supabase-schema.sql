-- Add owner_id to properties table if it doesn't exist
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Create liabilities_mortgages table
CREATE TABLE IF NOT EXISTS liabilities_mortgages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  plaid_account_id TEXT NOT NULL,
  plaid_item_id TEXT NOT NULL,
  
  -- Basic mortgage info
  account_number TEXT,
  loan_type_description TEXT,
  loan_term TEXT,
  
  -- Dates
  origination_date DATE,
  maturity_date DATE,
  last_payment_date DATE,
  next_payment_due_date DATE,
  
  -- Amounts
  origination_principal_amount DECIMAL(12, 2),
  current_late_fee DECIMAL(10, 2),
  escrow_balance DECIMAL(10, 2),
  last_payment_amount DECIMAL(10, 2),
  next_monthly_payment DECIMAL(10, 2),
  past_due_amount DECIMAL(10, 2),
  ytd_interest_paid DECIMAL(10, 2),
  ytd_principal_paid DECIMAL(10, 2),
  
  -- Interest rate info
  interest_rate_percentage DECIMAL(5, 3),
  interest_rate_type TEXT, -- 'fixed' or 'variable'
  
  -- Flags
  has_pmi BOOLEAN DEFAULT FALSE,
  has_prepayment_penalty BOOLEAN DEFAULT FALSE,
  
  -- Property address (from Plaid)
  property_address_street TEXT,
  property_address_city TEXT,
  property_address_region TEXT,
  property_address_postal_code TEXT,
  property_address_country TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mortgages_property_id ON liabilities_mortgages(property_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_owner_id ON liabilities_mortgages(owner_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_plaid_item_id ON liabilities_mortgages(plaid_item_id);

-- Enable Row Level Security
ALTER TABLE liabilities_mortgages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (owners can only see their own data)
CREATE POLICY "Owners can view their own mortgages" ON liabilities_mortgages
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own mortgages" ON liabilities_mortgages
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own mortgages" ON liabilities_mortgages
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own mortgages" ON liabilities_mortgages
  FOR DELETE USING (auth.uid() = owner_id);

-- Create a table to track Plaid webhook events for update mode
CREATE TABLE IF NOT EXISTS plaid_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plaid_item_id TEXT NOT NULL,
  webhook_type TEXT NOT NULL, -- 'ITEM', 'TRANSACTIONS', etc.
  webhook_code TEXT NOT NULL, -- 'ITEM_LOGIN_REQUIRED', 'PENDING_EXPIRATION', etc.
  error_code TEXT,
  error_message TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_item_id ON plaid_webhook_events(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_property_id ON plaid_webhook_events(property_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_resolved ON plaid_webhook_events(resolved);

ALTER TABLE plaid_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own webhook events" ON plaid_webhook_events
  FOR SELECT USING (auth.uid() = owner_id);


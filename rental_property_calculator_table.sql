-- ================================================================
-- Rental Property Calculator Results Table
-- ================================================================
-- This table stores all rental property calculations and analysis results
-- Run this SQL in your Supabase SQL Editor to create the table
-- ================================================================

-- Create the rental property calculator results table
CREATE TABLE rental_property_calculator_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ============================================================
  -- PROPERTY INFORMATION
  -- ============================================================
  property_address TEXT NOT NULL,
  
  -- ============================================================
  -- PURCHASE DETAILS
  -- ============================================================
  purchase_price DECIMAL(12, 2) NOT NULL,
  purchase_closing_cost DECIMAL(12, 2) NOT NULL,
  is_rehabbing BOOLEAN DEFAULT FALSE,
  after_repair_value DECIMAL(12, 2),
  repair_costs DECIMAL(12, 2),
  
  -- Itemized costs stored as JSONB for flexibility
  -- Example: {"roofing": 5000, "flooring": 3000, "plumbing": 2000}
  itemized_repair_costs JSONB,
  itemized_closing_costs JSONB,
  
  -- ============================================================
  -- FINANCING DETAILS
  -- ============================================================
  is_purchasing_with_cash BOOLEAN DEFAULT FALSE,
  down_payment DECIMAL(12, 2),
  down_payment_percent DECIMAL(5, 2),
  interest_rate DECIMAL(5, 2),
  loan_term INTEGER,
  points_charged DECIMAL(5, 2),
  
  -- ============================================================
  -- RENTAL INCOME
  -- ============================================================
  gross_monthly_income DECIMAL(12, 2) NOT NULL,
  
  -- Income breakdown stored as JSONB
  -- Example: {"rent": 3000, "laundry": 50, "water_reimbursement": 30}
  income_breakdown JSONB,
  
  -- ============================================================
  -- EXPENSES
  -- ============================================================
  property_taxes DECIMAL(12, 2) NOT NULL,
  property_taxes_frequency TEXT NOT NULL CHECK (property_taxes_frequency IN ('Annual', 'Monthly')),
  insurance DECIMAL(12, 2) NOT NULL,
  insurance_frequency TEXT NOT NULL CHECK (insurance_frequency IN ('Annual', 'Monthly')),
  
  -- Percentage-based expenses
  repairs_maintenance_percent DECIMAL(5, 2),
  capital_expenditures_percent DECIMAL(5, 2),
  vacancy_percent DECIMAL(5, 2),
  management_fees_percent DECIMAL(5, 2),
  
  -- Fixed monthly expenses
  electricity DECIMAL(12, 2),
  gas DECIMAL(12, 2),
  water_sewer DECIMAL(12, 2),
  hoa_fees DECIMAL(12, 2),
  garbage DECIMAL(12, 2),
  other_expense DECIMAL(12, 2),
  
  -- ============================================================
  -- GROWTH RATES (Optional)
  -- ============================================================
  annual_property_value_growth DECIMAL(5, 2),
  annual_income_growth DECIMAL(5, 2),
  annual_expenses_growth DECIMAL(5, 2),
  sales_expenses_percent DECIMAL(5, 2),
  
  -- ============================================================
  -- CALCULATED RESULTS (Pre-computed for fast retrieval)
  -- ============================================================
  
  -- Monthly Metrics
  monthly_mortgage_payment DECIMAL(12, 2),
  total_monthly_expenses DECIMAL(12, 2),
  monthly_cash_flow DECIMAL(12, 2),
  
  -- Annual Metrics
  annual_cash_flow DECIMAL(12, 2),
  net_operating_income DECIMAL(12, 2),
  
  -- Investment Metrics
  total_cash_needed DECIMAL(12, 2),
  loan_amount DECIMAL(12, 2),
  cash_on_cash_roi DECIMAL(7, 2),
  pro_forma_cap_rate DECIMAL(7, 2),
  purchase_cap_rate DECIMAL(7, 2),
  debt_service_coverage_ratio DECIMAL(7, 2),
  operating_expense_ratio DECIMAL(7, 2),
  
  -- 5-Year Projections
  five_year_annualized_return DECIMAL(7, 2),
  five_year_total_return DECIMAL(12, 2),
  five_year_equity_buildup DECIMAL(12, 2),
  five_year_property_value DECIMAL(12, 2),
  
  -- Cash flow projections stored as JSONB array (60 months of data)
  -- Example: [{"year": 1, "month": 1, "income": 3000, "expenses": 1500, "cashFlow": 1000}, ...]
  cash_flow_projections JSONB,
  
  -- Expense breakdown stored as JSONB
  -- Example: {"propertyTaxes": 116.67, "insurance": 250, "repairsMaintenance": 150, ...}
  expense_breakdown JSONB
);

-- ============================================================
-- INDEXES for Performance
-- ============================================================
CREATE INDEX idx_rental_calc_owner_id ON rental_property_calculator_results(owner_id);
CREATE INDEX idx_rental_calc_created_at ON rental_property_calculator_results(created_at DESC);
CREATE INDEX idx_rental_calc_property_address ON rental_property_calculator_results(property_address);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE rental_property_calculator_results ENABLE ROW LEVEL SECURITY;

-- Users can only view their own rental calculator results
CREATE POLICY "Users can view their own rental calculator results"
  ON rental_property_calculator_results
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can only insert their own rental calculator results
CREATE POLICY "Users can insert their own rental calculator results"
  ON rental_property_calculator_results
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can only update their own rental calculator results
CREATE POLICY "Users can update their own rental calculator results"
  ON rental_property_calculator_results
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can only delete their own rental calculator results
CREATE POLICY "Users can delete their own rental calculator results"
  ON rental_property_calculator_results
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================
-- TRIGGER for updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_rental_calc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rental_calc_updated_at
  BEFORE UPDATE ON rental_property_calculator_results
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_calc_updated_at();

-- ============================================================
-- HELPFUL QUERIES
-- ============================================================

-- Get all analyses for a user, ordered by most recent
-- SELECT * FROM rental_property_calculator_results 
-- WHERE owner_id = auth.uid() 
-- ORDER BY created_at DESC;

-- Get a specific analysis with all details
-- SELECT * FROM rental_property_calculator_results 
-- WHERE id = 'your-uuid-here' AND owner_id = auth.uid();

-- Get summary of all analyses (for a "My Reports" page)
-- SELECT 
--   id,
--   property_address,
--   created_at,
--   monthly_cash_flow,
--   cash_on_cash_roi,
--   five_year_annualized_return
-- FROM rental_property_calculator_results
-- WHERE owner_id = auth.uid()
-- ORDER BY created_at DESC;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. All DECIMAL fields use (12,2) precision for dollar amounts (up to $999,999,999.99)
-- 2. All percentage fields use (7,2) precision for ROI/rates (up to 99999.99%)
-- 3. JSONB fields allow flexible storage of complex data structures
-- 4. Indexes ensure fast queries when filtering by user or date
-- 5. RLS policies ensure data privacy and security
-- ================================================================



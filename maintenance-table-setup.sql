-- Create maintenance_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic info
  title TEXT,
  description TEXT NOT NULL,
  
  -- Relations
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  unit TEXT,
  
  -- Classification
  category TEXT NOT NULL CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'general_handyman', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  
  -- Dates
  submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date DATE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  -- Cost tracking
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  
  -- Photos
  photos TEXT[], -- Array of photo URLs
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add due_date column if the table already exists (safe migration)
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS due_date DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_owner_id ON maintenance_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vendor_id ON maintenance_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);

-- Enable Row Level Security
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (owners can only see their own data)
CREATE POLICY "Owners can view their own maintenance requests" ON maintenance_requests
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own maintenance requests" ON maintenance_requests
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own maintenance requests" ON maintenance_requests
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own maintenance requests" ON maintenance_requests
  FOR DELETE USING (auth.uid() = owner_id);


-- ⚠️ WARNING: This will delete all existing data in tenants, leases, and units tables
-- Make sure to backup any important data before running this!

-- Drop existing indexes first (if they exist)
DROP INDEX IF EXISTS idx_units_property_id;
DROP INDEX IF EXISTS idx_leases_unit_id;
DROP INDEX IF EXISTS idx_tenants_lease_id;
DROP INDEX IF EXISTS idx_leases_status;

-- Drop existing tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS units CASCADE;

-- Units Table
-- Each unit belongs to a property
CREATE TABLE units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  square_footage INTEGER,
  monthly_rent NUMERIC(10,2),
  is_occupied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leases Table
-- Each lease is for a specific unit
CREATE TABLE leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC(10,2) NOT NULL,
  security_deposit NUMERIC(10,2),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'future', 'terminated')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenants Table
-- Each tenant is linked to a lease (and by extension, a unit and property)
CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  send_invitation BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure at least email or phone is provided
  CONSTRAINT email_or_phone_required CHECK (
    email IS NOT NULL OR phone IS NOT NULL
  )
);

-- Enable Row Level Security
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Units
CREATE POLICY "Users can view their own property units" ON units
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert units for their properties" ON units
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own property units" ON units
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own property units" ON units
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for Leases
CREATE POLICY "Users can view leases for their units" ON leases
  FOR SELECT USING (
    unit_id IN (
      SELECT u.id FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert leases for their units" ON leases
  FOR INSERT WITH CHECK (
    unit_id IN (
      SELECT u.id FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update leases for their units" ON leases
  FOR UPDATE USING (
    unit_id IN (
      SELECT u.id FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leases for their units" ON leases
  FOR DELETE USING (
    unit_id IN (
      SELECT u.id FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

-- RLS Policies for Tenants
CREATE POLICY "Users can view tenants for their properties" ON tenants
  FOR SELECT USING (
    lease_id IN (
      SELECT l.id FROM leases l
      INNER JOIN units u ON l.unit_id = u.id
      INNER JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tenants for their properties" ON tenants
  FOR INSERT WITH CHECK (
    lease_id IN (
      SELECT l.id FROM leases l
      INNER JOIN units u ON l.unit_id = u.id
      INNER JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tenants for their properties" ON tenants
  FOR UPDATE USING (
    lease_id IN (
      SELECT l.id FROM leases l
      INNER JOIN units u ON l.unit_id = u.id
      INNER JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tenants for their properties" ON tenants
  FOR DELETE USING (
    lease_id IN (
      SELECT l.id FROM leases l
      INNER JOIN units u ON l.unit_id = u.id
      INNER JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_leases_unit_id ON leases(unit_id);
CREATE INDEX idx_tenants_lease_id ON tenants(lease_id);
CREATE INDEX idx_leases_status ON leases(status);

-- Function to check if email or phone already exists in user_profiles
CREATE OR REPLACE FUNCTION check_tenant_contact_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email exists in user_profiles (if email is provided)
  IF NEW.email IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM user_profiles WHERE email = NEW.email) THEN
      RAISE EXCEPTION 'This email is already registered as a user account';
    END IF;
  END IF;
  
  -- Check if phone exists in user_profiles (if phone is provided)
  IF NEW.phone IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM user_profiles WHERE phone = NEW.phone) THEN
      RAISE EXCEPTION 'This phone number is already registered to a user account';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT
CREATE TRIGGER check_tenant_contact_before_insert
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_contact_uniqueness();

-- Create trigger for UPDATE
CREATE TRIGGER check_tenant_contact_before_update
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_contact_uniqueness();


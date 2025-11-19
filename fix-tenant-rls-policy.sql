-- Fix RLS policy to allow inserting tenants without a lease_id
-- This adds an owner_id column to properly track tenant ownership

-- Step 1: Add owner_id column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Step 2: Update existing tenants to have owner_id based on their lease's property owner
UPDATE tenants
SET owner_id = (
  SELECT p.owner_id
  FROM leases l
  INNER JOIN units u ON l.unit_id = u.id
  INNER JOIN properties p ON u.property_id = p.id
  WHERE l.id = tenants.lease_id
)
WHERE lease_id IS NOT NULL AND owner_id IS NULL;

-- Step 3: Make owner_id NOT NULL (required field)
ALTER TABLE tenants ALTER COLUMN owner_id SET NOT NULL;

-- Step 4: Drop the old policies
DROP POLICY IF EXISTS "Users can insert tenants for their properties" ON tenants;
DROP POLICY IF EXISTS "Users can update tenants for their properties" ON tenants;
DROP POLICY IF EXISTS "Users can view tenants for their properties" ON tenants;
DROP POLICY IF EXISTS "Users can delete tenants for their properties" ON tenants;

-- Step 5: Create new policies based on owner_id
CREATE POLICY "Users can insert their own tenants" ON tenants
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND (
      -- If lease_id is provided, it must belong to the user's properties
      lease_id IS NULL
      OR
      lease_id IN (
        SELECT l.id FROM leases l
        INNER JOIN units u ON l.unit_id = u.id
        INNER JOIN properties p ON u.property_id = p.id
        WHERE p.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own tenants" ON tenants
  FOR SELECT USING (
    owner_id = auth.uid()
  );

CREATE POLICY "Users can update their own tenants" ON tenants
  FOR UPDATE USING (
    owner_id = auth.uid()
  );

CREATE POLICY "Users can delete their own tenants" ON tenants
  FOR DELETE USING (
    owner_id = auth.uid()
  );

-- Step 6: Add index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);

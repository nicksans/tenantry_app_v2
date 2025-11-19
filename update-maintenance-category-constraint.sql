-- Drop the old category constraint
ALTER TABLE maintenance_requests 
DROP CONSTRAINT IF EXISTS maintenance_requests_category_check;

-- Add the new constraint with 'general_handyman' included
ALTER TABLE maintenance_requests 
ADD CONSTRAINT maintenance_requests_category_check 
CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'general_handyman', 'other'));


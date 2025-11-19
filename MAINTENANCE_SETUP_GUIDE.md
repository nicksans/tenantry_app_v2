# Maintenance Feature Setup Guide

## Database Setup

### Step 1: Run the SQL Script
You need to run the SQL script to create/update the `maintenance_requests` table in your Supabase database:

**File:** `maintenance-table-setup.sql`

This script will:
- Create the `maintenance_requests` table if it doesn't exist
- Add the `due_date` column if the table already exists
- Set up proper indexes for performance
- Configure Row Level Security (RLS) policies

**To run it:**
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `maintenance-table-setup.sql`
4. Click "Run"

### Step 2: Verify Your Vendors Table
The maintenance form now uses a dropdown to select vendors from your `vendors` table. Make sure your vendors table has these columns:
- `id` (UUID)
- `name` (TEXT)
- `company_name` (TEXT, optional)

## What's Been Implemented

### Form Fields → Database Mapping
- **Description** → `description`
- **Property** → `property_id` (saves the property ID)
- **Unit** → `unit` (optional, appears only if property has multiple units)
- **Category** → `category` (plumbing, electrical, hvac, appliance, structural, other)
- **Priority** → `priority` (low, medium, high, urgent)
- **Due Date** → `due_date` (optional date field)
- **Vendor** → `vendor_id` (dropdown populated from vendors table)
- **Photos** → `photos` (array field - upload functionality to be implemented later)

### Features
✅ Form saves to Supabase `maintenance_requests` table
✅ Loads existing maintenance requests from database
✅ Properties dropdown populated from your properties
✅ Vendors dropdown populated from your vendors table
✅ Unit dropdown dynamically appears based on selected property
✅ Loading state while submitting
✅ Form validation (required fields)
✅ Automatic reload of requests after submission
✅ Row Level Security (RLS) - users only see their own maintenance requests

### Status Colors
The maintenance requests display with color-coded badges:
- **Priority**: Low (gray), Medium (blue), High (orange), Urgent (red)
- **Status**: Open (yellow), In Progress (blue), Completed (green), Cancelled (gray)
- **Cost Estimation**: Beautiful gradient effect (brand purple to purple)

## Future Enhancements
These are noted in the code with TODO comments:
1. Photo upload functionality (currently UI only)
2. AI-generated title based on description
3. AI-generated cost estimation
4. Click on request to view/edit details

## Notes
- The `owner_id` is automatically set to the current logged-in user
- New requests default to "open" status
- The `submitted_date` is automatically set to the current timestamp
- All data is filtered by the logged-in user (RLS policies enforce this)


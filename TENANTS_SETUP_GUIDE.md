# Tenants, Leases, and Units Setup Guide

## 🎯 Overview
This guide will help you set up the database tables for managing tenants, leases, and units in your Tenantry application.

## 📋 Step-by-Step Instructions

### Step 1: Run the SQL Schema
1. Open your Supabase project dashboard
2. Go to the **SQL Editor** (in the left sidebar)
3. Click **"New Query"**
4. Copy and paste the entire contents of `tenants-schema.sql` into the editor
5. Click **"Run"** to execute the SQL

This will create three new tables:
- **units** - Individual rental units within your properties
- **leases** - Lease agreements for units
- **tenants** - Tenant information linked to leases

### Step 2: Understanding the Table Structure

#### **Units Table**
Each unit belongs to a property and contains:
- Unit number/name
- Number of bedrooms and bathrooms
- Square footage
- Monthly rent
- Occupancy status

#### **Leases Table**
Each lease is for a specific unit and contains:
- Start and end dates
- Monthly rent amount
- Security deposit
- Status (active, expired, future, terminated)

#### **Tenants Table**
Each tenant is linked to a lease and contains:
- First name (required)
- Last name (optional)
- Email and/or phone (at least one required)
- Send invitation flag

### Step 3: Create Your First Unit and Lease

Before you can add tenants, you need to have at least one unit and one lease.

#### Option A: Using SQL (Quick Start)
Run this SQL in the Supabase SQL Editor (replace the values with your own):

```sql
-- First, get your property ID
SELECT id, address FROM properties;

-- Create a unit (replace 'YOUR_PROPERTY_ID' with actual ID from above)
INSERT INTO units (property_id, unit_number, bedrooms, bathrooms, monthly_rent)
VALUES ('YOUR_PROPERTY_ID', '1', 2, 1, 1500);

-- Get the unit ID you just created
SELECT id, unit_number FROM units;

-- Create a lease for that unit (replace 'YOUR_UNIT_ID' with actual ID from above)
INSERT INTO leases (unit_id, start_date, end_date, monthly_rent, security_deposit, status)
VALUES ('YOUR_UNIT_ID', '2024-01-01', '2025-12-31', 1500, 1500, 'active');
```

#### Option B: We'll Build Forms Later
We can create forms to add units and leases through the UI later if you prefer!

### Step 4: Test Adding a Tenant

1. Go to the **Tenants** tab in your app
2. Click **"Add Tenant"**
3. Fill in the form:
   - First Name (required)
   - Last Name (optional)
   - Select a Lease from the dropdown
   - Add Email and/or Phone
   - Optionally check "Send invitation"
4. Click **"ADD TENANT"**

The tenant will be saved to your database!

## 🔍 How It Works

### The Relationship Chain:
```
Property → Unit → Lease → Tenant
```

- A **Property** can have multiple **Units**
- A **Unit** can have multiple **Leases** (over time)
- A **Lease** can have multiple **Tenants** (roommates)
- Each **Tenant** is linked to one **Lease**

### Security
All tables have Row Level Security (RLS) enabled, which means:
- Users can only see/manage tenants for properties they own
- All data is automatically filtered by user authentication
- Your tenants' data is secure and private

## 🐛 Troubleshooting

### "No active leases available"
- Make sure you've created at least one lease
- Check that the lease status is set to 'active'
- Verify the lease is linked to a unit that belongs to your property

### "Failed to add tenant"
- Check that you've provided either an email OR phone number
- Verify that the selected lease exists
- Check the browser console for detailed error messages

## 📝 Next Steps

After setting up your tenants, you might want to:
1. Create forms to add Units and Leases through the UI
2. Add a tenant detail page to view/edit tenant information
3. Set up the email invitation system
4. Add payment tracking for tenants
5. Create a tenant portal where they can log in

Let me know what you'd like to build next!


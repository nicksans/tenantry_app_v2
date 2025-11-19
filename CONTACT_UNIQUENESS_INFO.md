# Contact Information Uniqueness

## 🎯 What This Does

This ensures that email addresses and phone numbers are unique across your entire system. No two people (whether users or tenants) can have the same contact information.

## ✅ Protection Levels

### 1. **Within Tenants Table**
- Each email can only be used once for tenants
- Each phone number can only be used once for tenants
- Database enforces this with `UNIQUE` constraints

### 2. **Across Users and Tenants**
- If an email is registered as a user account, it cannot be used for a tenant
- If a phone number is in user_profiles, it cannot be used for a tenant
- Database trigger validates this automatically

## 🔒 How It Works

### Database Level (SQL)
```sql
-- Email and phone are marked as UNIQUE in tenants table
email VARCHAR(255) UNIQUE,
phone VARCHAR(20) UNIQUE,

-- Database trigger checks user_profiles before inserting/updating tenants
CREATE TRIGGER check_tenant_contact_before_insert
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_contact_uniqueness();
```

### Application Level (Form)
The "Add Tenant" form will:
1. Show a **red border** around the field if there's a duplicate
2. Display a **helpful error message** explaining the issue:
   - "This email is already registered as a user account"
   - "This email is already assigned to another tenant"
   - "This phone number is already registered to a user account"
   - "This phone number is already assigned to another tenant"

## 📝 What Happens When You Try to Add a Duplicate

### Scenario 1: Email already exists for another tenant
```
❌ Error shown under email field:
"This email is already assigned to another tenant"
```

### Scenario 2: Email belongs to a user account
```
❌ Error shown under email field:
"This email is already registered as a user account"
```

### Scenario 3: Phone number already in use
```
❌ Error shown under phone field:
"This phone number is already assigned to another tenant"
```

## 🚀 To Activate This Feature

1. Run the updated SQL script: `recreate-tenants-schema.sql`
2. The form is already updated and will automatically show these errors
3. That's it! The protection is now active.

## 💡 Why This Matters

- **Prevents confusion**: No duplicate contacts means clearer communication
- **Data integrity**: Ensures your database stays clean and organized
- **Better user experience**: Clear error messages help users fix issues quickly
- **Security**: Prevents accidental or intentional duplicate registrations

## ⚙️ Technical Details

The system checks both:
- `auth.users` table (for user email addresses)
- `user_profiles` table (for user phone numbers)
- `tenants` table (for existing tenant contacts)

All checks happen automatically at the database level, so even if someone tries to add a duplicate through the API directly, it will be blocked.




# Rental Property Calculator - Implementation Guide

## ✅ What's Been Completed

I've set up a complete rental property calculator system for your Tenantry app! Here's what's been done:

### 1. **Calculation Engine** (`src/lib/rentalCalculations.ts`)
A comprehensive utility library that calculates all rental property metrics including:
- Monthly mortgage payments
- Cash flow projections (5 years)
- Net Operating Income (NOI)
- Cash on Cash ROI
- Cap rates (Pro Forma & Purchase)
- Debt Service Coverage Ratio
- Operating Expense Ratio
- 5-year annualized returns
- Complete expense breakdowns

### 2. **Results Display Page** (`src/components/RentalPropertyResults.tsx`)
A beautiful, professional results page with:
- Key metric cards showing the most important numbers
- Interactive charts showing:
  - Cash flow over 5 years
  - Monthly expense breakdown
- Detailed tables with all calculations
- Print-friendly layout
- Easy navigation back to the calculator

### 3. **Calculator Updates** (`src/components/LongTermRentalCalculator.tsx`)
Updated your existing calculator to:
- Perform all calculations when user clicks "Finish analysis"
- Display results in a new view
- Allow users to go back and edit their inputs

### 4. **Database Schema** (`rental_property_calculator_table.sql`)
SQL file to create the Supabase table with:
- All input fields properly stored
- Pre-calculated results for fast retrieval
- Row Level Security (users only see their own data)
- Indexes for performance
- JSONB fields for flexible data storage

### 5. **Chart Library** 
Installed Recharts for beautiful, responsive charts

---

## 🎯 What Data is Being Calculated and Shown

### **Main Metrics (Top Cards)**
1. **Monthly Cash Flow** - Income minus all expenses and mortgage
2. **Cash on Cash ROI** - Your annual return percentage on invested cash
3. **Total Cash Needed** - How much money you need to buy the property
4. **5-Year Annualized Return** - Average yearly return over 5 years

### **Income & Expenses**
- Gross monthly rental income
- Complete breakdown of all operating expenses
- Monthly mortgage payment

### **Investment Metrics**
- **NOI (Net Operating Income)** - Income before debt service
- **Pro Forma Cap Rate** - Return if bought with cash
- **Purchase Cap Rate** - Return including rehab costs
- **DSCR (Debt Service Coverage Ratio)** - How well income covers mortgage (lenders want >1.25)
- **Operating Expense Ratio** - What % of income goes to expenses

### **5-Year Projections**
- Property value after appreciation
- Equity buildup from mortgage paydown
- Total return including cash flow and appreciation
- Annualized return percentage

### **Visualizations**
1. **Cash Flow Over Time Graph** - Shows income, expenses, and net cash flow for each year
2. **Expense Breakdown Chart** - Bar chart showing where money is being spent
3. **Detailed Expense Table** - Every expense with dollar amount and % of income

---

## 🚀 How to Use This System

### Step 1: Create the Database Table
1. Go to your Supabase dashboard
2. Click on "SQL Editor"
3. Open the file `rental_property_calculator_table.sql`
4. Copy and paste the entire SQL into Supabase
5. Click "Run" to create the table

### Step 2: Test the Calculator
1. Start your development server: `npm run dev`
2. Navigate to the Rental Property Calculator
3. Fill in the form with property details
4. Click "Finish analysis"
5. You'll see all the calculations and charts!

### Step 3: (Optional) Save Results to Database
If you want to save the calculations to the database for users to view later, you'll need to add a save function. Here's how:

**Add to `LongTermRentalCalculator.tsx`:**

```typescript
import { supabase } from '../lib/supabase';

// Add this function after handleSubmit
const saveToDatabase = async () => {
  if (!calculationResults) return;
  
  const { error } = await supabase
    .from('rental_property_calculator_results')
    .insert({
      property_address: propertyAddress,
      purchase_price: parseFloat(purchasePrice),
      purchase_closing_cost: parseFloat(purchaseClosingCost),
      // ... add all other fields
      monthly_cash_flow: calculationResults.monthlyCashFlow,
      cash_on_cash_roi: calculationResults.cashOnCashROI,
      // ... add all calculated results
    });
    
  if (error) {
    console.error('Error saving:', error);
    alert('Failed to save analysis');
  } else {
    alert('Analysis saved successfully!');
  }
};
```

---

## 📊 Understanding the Calculations

### **Monthly Cash Flow**
```
Income - Operating Expenses - Mortgage Payment = Cash Flow
```
- **Positive** = Property makes money each month ✅
- **Negative** = You pay out of pocket each month ❌

### **Cash on Cash ROI**
```
(Annual Cash Flow / Total Cash Invested) × 100
```
Example: If you invest $50,000 and make $5,000/year → 10% CoC ROI

### **Net Operating Income (NOI)**
```
Annual Income - Annual Operating Expenses
```
Note: This does NOT include mortgage payment

### **Cap Rate**
```
(NOI / Property Price) × 100
```
Higher cap rate = better return (generally 5-10% is considered good)

### **Debt Service Coverage Ratio (DSCR)**
```
NOI / Annual Mortgage Payments
```
- **Above 1.25** = Great (lenders love this) ✅
- **1.0 - 1.25** = Okay (property covers mortgage)
- **Below 1.0** = Problem (losing money) ❌

---

## 🎨 What Users See

### **Calculator View**
Users fill in:
- Property address
- Purchase price and closing costs
- Financing details (or cash purchase)
- Expected rental income
- All expenses (taxes, insurance, utilities, etc.)
- Optional: Growth rates for appreciation

### **Results View**
Users see:
1. **Hero Metrics** - 4 big cards with key numbers
2. **Income vs Expenses** - Side-by-side comparison
3. **Cash Flow Graph** - 5-year projection line chart
4. **Expense Breakdown** - Bar chart showing where money goes
5. **Investment Metrics** - All the technical details
6. **5-Year Projections** - Long-term outlook
7. **Detailed Table** - Complete expense breakdown

---

## 🔄 User Flow

```
1. User fills out calculator form
   ↓
2. User clicks "Finish analysis"
   ↓
3. App performs all calculations
   ↓
4. Results page displays with charts
   ↓
5. User can:
   - Review all metrics
   - Print the report
   - Go back and edit inputs
   - (Optional) Save to database
```

---

## 📝 Next Steps (Optional Enhancements)

### **1. Save & Load Analyses**
Allow users to:
- Save their calculations to the database
- View a list of past analyses ("My Reports")
- Compare different properties side-by-side

### **2. User Authentication**
- Require login to save analyses
- Each user sees only their own saved reports

### **3. Share Feature**
- Generate a shareable link to results
- Export to PDF

### **4. Advanced Features**
- Compare multiple properties
- What-if scenarios (adjust rent, expenses)
- Sensitivity analysis
- Tax implications calculator

---

## 🐛 Troubleshooting

### **Charts Not Showing**
- Make sure Recharts is installed: `npm install recharts`
- Check browser console for errors

### **Calculations Seem Wrong**
- Verify all inputs are numbers (not empty strings)
- Check frequency settings (Annual vs Monthly)
- Review the formulas in `rentalCalculations.ts`

### **Database Errors**
- Ensure the SQL table was created successfully
- Check that RLS policies are enabled
- Verify user is authenticated

---

## 📚 File Structure

```
src/
├── lib/
│   └── rentalCalculations.ts        # All calculation logic
├── components/
│   ├── LongTermRentalCalculator.tsx # Input form
│   └── RentalPropertyResults.tsx    # Results display
rental_property_calculator_table.sql  # Database schema
```

---

## 🎉 You're All Set!

Your rental property calculator is now ready to use! Users can:
- Enter property details
- See comprehensive analysis with beautiful charts
- Understand whether a property is a good investment
- (Optional) Save their analyses for later

The calculator includes professional-grade metrics that real estate investors use to evaluate properties. Everything is calculated automatically and displayed in an easy-to-understand format.

**Questions?** Check the comments in the code files for detailed explanations of each calculation!



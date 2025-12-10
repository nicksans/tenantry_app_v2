# 🔄 Rental Property Calculator - System Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                   (Property Investor)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Fills in form
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         LongTermRentalCalculator Component                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Input Fields:                                       │    │
│  │ • Property Address                                  │    │
│  │ • Purchase Price & Closing Costs                   │    │
│  │ • Financing (Down Payment, Interest Rate, Term)    │    │
│  │ • Rental Income                                     │    │
│  │ • All Expenses (Taxes, Insurance, Utilities, etc.) │    │
│  │ • Optional: Growth Rates                           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│                   [Finish Analysis Button] ◄─── User clicks │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            │ Passes all inputs
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           rentalCalculations.ts (Calculation Engine)         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ calculateRentalPropertyMetrics(inputs)             │    │
│  │                                                     │    │
│  │ Step 1: Calculate Mortgage                         │    │
│  │   ├─ Loan Amount = Price - Down Payment           │    │
│  │   └─ Monthly Payment = Formula(Principal, Rate)   │    │
│  │                                                     │    │
│  │ Step 2: Calculate Monthly Expenses                 │    │
│  │   ├─ Fixed: Taxes, Insurance, Utilities           │    │
│  │   └─ Percentage: Maintenance, Vacancy, Mgmt       │    │
│  │                                                     │    │
│  │ Step 3: Calculate Cash Flow                        │    │
│  │   └─ Income - Expenses - Mortgage                 │    │
│  │                                                     │    │
│  │ Step 4: Calculate Investment Metrics               │    │
│  │   ├─ NOI = Income - Operating Expenses            │    │
│  │   ├─ CoC ROI = Annual CF / Cash Invested          │    │
│  │   ├─ Cap Rate = NOI / Property Price              │    │
│  │   └─ DSCR = NOI / Annual Debt Service             │    │
│  │                                                     │    │
│  │ Step 5: Generate 5-Year Projections                │    │
│  │   └─ For each month (60 total):                   │    │
│  │       ├─ Apply growth rates                        │    │
│  │       ├─ Calculate loan balance                    │    │
│  │       ├─ Calculate equity                          │    │
│  │       └─ Store projection                          │    │
│  │                                                     │    │
│  │ Step 6: Calculate Long-Term Returns                │    │
│  │   ├─ Property appreciation                         │    │
│  │   ├─ Equity from mortgage paydown                  │    │
│  │   ├─ Cumulative cash flow                          │    │
│  │   └─ Annualized return %                           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│                    Returns: RentalPropertyResults            │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ Complete results object
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         RentalPropertyResults Component                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ DISPLAY SECTION 1: Key Metric Cards                │    │
│  │ ┌──────────┬──────────┬──────────┬──────────┐     │    │
│  │ │ Cash     │ CoC ROI  │ Cash     │ 5-Year   │     │    │
│  │ │ Flow     │          │ Needed   │ Return   │     │    │
│  │ └──────────┴──────────┴──────────┴──────────┘     │    │
│  │                                                     │    │
│  │ DISPLAY SECTION 2: Income vs Expenses              │    │
│  │ ┌─────────────────────┬─────────────────────┐     │    │
│  │ │ Monthly Income      │ Monthly Expenses    │     │    │
│  │ │ • Rent              │ • Taxes             │     │    │
│  │ │ • Other Income      │ • Insurance         │     │    │
│  │ │                     │ • Utilities         │     │    │
│  │ │                     │ • Mortgage          │     │    │
│  │ └─────────────────────┴─────────────────────┘     │    │
│  │                                                     │    │
│  │ DISPLAY SECTION 3: Cash Flow Chart (Recharts)      │    │
│  │ ┌─────────────────────────────────────────────┐   │    │
│  │ │     📈 5-Year Cash Flow Projection           │   │    │
│  │ │                                              │   │    │
│  │ │     Income Line ──────────────────          │   │    │
│  │ │     Expenses Line ─ ─ ─ ─ ─ ─ ─            │   │    │
│  │ │     Cash Flow Line ·············            │   │    │
│  │ │                                              │   │    │
│  │ │     Year 1   Year 2   Year 3   Year 4   Y5  │   │    │
│  │ └─────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │ DISPLAY SECTION 4: Expense Breakdown Chart         │    │
│  │ ┌─────────────────────────────────────────────┐   │    │
│  │ │     📊 Monthly Expense Breakdown             │   │    │
│  │ │                                              │   │    │
│  │ │     ▓▓▓▓▓▓  Taxes                           │   │    │
│  │ │     ▓▓▓▓▓▓▓ Insurance                       │   │    │
│  │ │     ▓▓▓     Maintenance                     │   │    │
│  │ │     ▓▓▓▓    Utilities                       │   │    │
│  │ └─────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │ DISPLAY SECTION 5: Investment Metrics Table        │    │
│  │ ┌─────────────────────────────────────────────┐   │    │
│  │ │ Net Operating Income:        $24,000        │   │    │
│  │ │ Pro Forma Cap Rate:          7.85%          │   │    │
│  │ │ Purchase Cap Rate:           7.85%          │   │    │
│  │ │ DSCR:                        1.45x          │   │    │
│  │ │ Operating Expense Ratio:     45%            │   │    │
│  │ └─────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │ DISPLAY SECTION 6: 5-Year Projections              │    │
│  │ ┌─────────────────────────────────────────────┐   │    │
│  │ │ Property Value:              $350,000       │   │    │
│  │ │ Equity Buildup:              $65,000        │   │    │
│  │ │ Total Return:                $90,000        │   │    │
│  │ │ Annualized Return:           12.5%          │   │    │
│  │ └─────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │ DISPLAY SECTION 7: Detailed Expense Table          │    │
│  │ ┌─────────────────────────────────────────────┐   │    │
│  │ │ Category           Amount      % of Income  │   │    │
│  │ │ Property Taxes     $117        3.9%         │   │    │
│  │ │ Insurance          $250        8.3%         │   │    │
│  │ │ Maintenance        $150        5.0%         │   │    │
│  │ │ ...                                          │   │    │
│  │ └─────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │ [Edit Analysis]  [Print Report]                    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Optional: Save to database
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        rentalDatabaseHelpers.ts (Optional)                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ saveRentalAnalysis(inputs, results)                │    │
│  │   │                                                 │    │
│  │   ├─ Get current user                              │    │
│  │   ├─ Prepare data object                           │    │
│  │   └─ Insert into Supabase                          │    │
│  │                                                     │    │
│  │ getUserAnalyses()                                  │    │
│  │   │                                                 │    │
│  │   ├─ Fetch all analyses for user                   │    │
│  │   └─ Return list                                   │    │
│  │                                                     │    │
│  │ getAnalysisById(id)                                │    │
│  │ deleteAnalysis(id)                                 │    │
│  │ updateAnalysis(id, inputs, results)                │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE DATABASE                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ rental_property_calculator_results table           │    │
│  │                                                     │    │
│  │ Stores:                                            │    │
│  │ • All user inputs                                  │    │
│  │ • All calculated results                           │    │
│  │ • Cash flow projections (JSONB)                   │    │
│  │ • Expense breakdown (JSONB)                        │    │
│  │                                                     │    │
│  │ Protected by:                                      │    │
│  │ • Row Level Security (RLS)                         │    │
│  │ • User can only see their own data                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Relationships

```
App.tsx
  └─ Tools.tsx
       └─ LongTermRentalCalculator.tsx
            ├─ AddressAutocomplete.tsx
            │
            ├─ [Calculation happens here]
            │    └─ Uses: rentalCalculations.ts
            │
            └─ RentalPropertyResults.tsx
                 ├─ Uses: Recharts library
                 └─ Optional: rentalDatabaseHelpers.ts
```

---

## Data Structure Flow

### Input Object (RentalPropertyInputs)
```typescript
{
  propertyAddress: string,
  purchasePrice: number,
  purchaseClosingCost: number,
  isRehabbing: boolean,
  // ... 30+ more fields
}
```

### Results Object (RentalPropertyResults)
```typescript
{
  monthlyMortgagePayment: number,
  monthlyCashFlow: number,
  cashOnCashROI: number,
  cashFlowProjections: [
    {year: 1, month: 1, income: 3000, expenses: 1500, ...},
    {year: 1, month: 2, income: 3000, expenses: 1500, ...},
    // ... 60 months total
  ],
  // ... 15+ more calculated fields
}
```

---

## Key Calculation Formulas

### Mortgage Payment
```typescript
M = P × [r(1 + r)^n] / [(1 + r)^n - 1]

Where:
M = Monthly payment
P = Principal (loan amount)
r = Monthly interest rate (annual rate / 12 / 100)
n = Number of payments (years × 12)
```

### Cash on Cash ROI
```typescript
CoC ROI = (Annual Cash Flow / Total Cash Invested) × 100

Where:
Annual Cash Flow = Monthly Cash Flow × 12
Total Cash Invested = Down Payment + Closing Costs + Repair Costs
```

### Cap Rate
```typescript
Cap Rate = (NOI / Property Price) × 100

Where:
NOI = Annual Income - Annual Operating Expenses
(Operating Expenses do NOT include mortgage)
```

### DSCR
```typescript
DSCR = NOI / Annual Debt Service

Where:
Annual Debt Service = Monthly Mortgage Payment × 12

Good: > 1.25
Minimum: > 1.0
```

---

## File Dependencies

```
LongTermRentalCalculator.tsx
  └─ imports
       ├─ AddressAutocomplete.tsx
       ├─ RentalPropertyResults.tsx
       └─ rentalCalculations.ts

RentalPropertyResults.tsx
  └─ imports
       ├─ recharts (charts)
       └─ rentalCalculations.ts (formatters)

rentalDatabaseHelpers.ts
  └─ imports
       ├─ supabase.ts
       └─ rentalCalculations.ts (types)
```

---

## State Management

```typescript
// In LongTermRentalCalculator.tsx

// Form State (35+ state variables for inputs)
const [purchasePrice, setPurchasePrice] = useState('');
const [propertyTaxes, setPropertyTaxes] = useState('');
// ... etc

// Results State
const [showResults, setShowResults] = useState(false);
const [calculationResults, setCalculationResults] = useState<Results | null>(null);

// Flow:
// 1. User fills form → Updates state variables
// 2. User submits → Calculations run
// 3. setCalculationResults() → Stores results
// 4. setShowResults(true) → Shows results page
```

---

This architecture provides a clean separation of concerns:
- **Calculator**: Handles user input
- **Calculation Engine**: Pure calculation functions
- **Results Display**: Visual presentation
- **Database Helpers**: Optional persistence layer



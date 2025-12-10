/**
 * Rental Property Calculator - Calculation Utilities
 * All formulas and calculations for rental property analysis
 */

export interface RentalPropertyInputs {
  // Property Information
  propertyAddress: string;
  
  // Purchase Details
  purchasePrice: number;
  purchaseClosingCost: number;
  isRehabbing: boolean;
  afterRepairValue?: number;
  repairCosts?: number;
  
  // Itemized costs (optional)
  itemizedRepairCosts?: Record<string, number>;
  itemizedClosingCosts?: Record<string, number>;
  
  // Financing Details
  isPurchasingWithCash: boolean;
  downPayment?: number;
  downPaymentPercent?: number;
  interestRate?: number;
  loanTerm?: number;
  pointsCharged?: number;
  
  // Rental Income
  grossMonthlyIncome: number;
  incomeBreakdown?: Record<string, number>;
  
  // Expenses
  propertyTaxes: number;
  propertyTaxesFrequency: 'Annual' | 'Monthly';
  insurance: number;
  insuranceFrequency: 'Annual' | 'Monthly';
  repairsMaintenance: number; // percentage
  capitalExpenditures: number; // percentage
  vacancy: number; // percentage
  managementFees: number; // percentage
  electricity?: number;
  gas?: number;
  waterSewer?: number;
  hoaFees?: number;
  garbage?: number;
  otherExpense?: number;
  
  // Growth Rates (optional)
  annualPropertyValueGrowth?: number;
  annualIncomeGrowth?: number;
  annualExpensesGrowth?: number;
  salesExpenses?: number;
}

export interface MonthlyExpenseBreakdown {
  propertyTaxes: number;
  insurance: number;
  repairsMaintenance: number;
  capitalExpenditures: number;
  vacancy: number;
  managementFees: number;
  electricity: number;
  gas: number;
  waterSewer: number;
  hoaFees: number;
  garbage: number;
  other: number;
  total: number;
}

export interface CashFlowProjection {
  year: number;
  month: number;
  income: number;
  expenses: number;
  mortgage: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
}

export interface RentalPropertyResults {
  // Basic monthly metrics
  monthlyMortgagePayment: number;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  monthlyExpenseBreakdown: MonthlyExpenseBreakdown;
  monthlyCashFlow: number;
  
  // Annual metrics
  annualCashFlow: number;
  netOperatingIncome: number;
  
  // Investment metrics
  totalCashNeeded: number;
  loanAmount: number;
  cashOnCashROI: number;
  proFormaCapRate: number;
  purchaseCapRate: number;
  
  // Long-term projections
  fiveYearAnnualizedReturn: number;
  fiveYearTotalReturn: number;
  fiveYearEquityBuildup: number;
  fiveYearPropertyValue: number;
  
  // Additional useful metrics
  debtServiceCoverageRatio: number;
  operatingExpenseRatio: number;
  
  // Projections for graphing
  cashFlowProjections: CashFlowProjection[];
}

/**
 * Convert annual amount to monthly
 */
function convertToMonthly(amount: number, frequency: 'Annual' | 'Monthly'): number {
  return frequency === 'Annual' ? amount / 12 : amount;
}

/**
 * Calculate monthly mortgage payment using standard mortgage formula
 * Formula: M = P * [r(1 + r)^n] / [(1 + r)^n - 1]
 */
export function calculateMortgagePayment(
  principal: number,
  annualInterestRate: number,
  loanTermYears: number
): number {
  if (principal <= 0 || loanTermYears <= 0) return 0;
  
  // Handle zero interest rate case
  if (annualInterestRate === 0) {
    return principal / (loanTermYears * 12);
  }
  
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return payment;
}

/**
 * Calculate remaining loan balance after N payments
 */
export function calculateLoanBalance(
  principal: number,
  annualInterestRate: number,
  loanTermYears: number,
  paymentsMade: number
): number {
  if (principal <= 0 || paymentsMade <= 0) return principal;
  if (annualInterestRate === 0) {
    return principal - (principal / (loanTermYears * 12) * paymentsMade);
  }
  
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  
  if (paymentsMade >= numPayments) return 0;
  
  const balance = principal * 
    (Math.pow(1 + monthlyRate, numPayments) - Math.pow(1 + monthlyRate, paymentsMade)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return balance;
}

/**
 * Calculate total monthly expenses with breakdown
 */
export function calculateMonthlyExpenses(inputs: RentalPropertyInputs): MonthlyExpenseBreakdown {
  const monthlyTaxes = convertToMonthly(inputs.propertyTaxes, inputs.propertyTaxesFrequency);
  const monthlyInsurance = convertToMonthly(inputs.insurance, inputs.insuranceFrequency);
  
  // Percentage-based expenses
  const repairsMaint = inputs.grossMonthlyIncome * (inputs.repairsMaintenance / 100);
  const capEx = inputs.grossMonthlyIncome * (inputs.capitalExpenditures / 100);
  const vacancyCost = inputs.grossMonthlyIncome * (inputs.vacancy / 100);
  const managementCost = inputs.grossMonthlyIncome * (inputs.managementFees / 100);
  
  // Fixed monthly expenses
  const electricity = inputs.electricity || 0;
  const gas = inputs.gas || 0;
  const waterSewer = inputs.waterSewer || 0;
  const hoaFees = inputs.hoaFees || 0;
  const garbage = inputs.garbage || 0;
  const other = inputs.otherExpense || 0;
  
  const total = monthlyTaxes + monthlyInsurance + repairsMaint + capEx + 
                vacancyCost + managementCost + electricity + gas + waterSewer + 
                hoaFees + garbage + other;
  
  return {
    propertyTaxes: monthlyTaxes,
    insurance: monthlyInsurance,
    repairsMaintenance: repairsMaint,
    capitalExpenditures: capEx,
    vacancy: vacancyCost,
    managementFees: managementCost,
    electricity,
    gas,
    waterSewer,
    hoaFees,
    garbage,
    other,
    total
  };
}

/**
 * Calculate 5-year cash flow projections with property appreciation and mortgage paydown
 */
export function calculateCashFlowProjections(
  inputs: RentalPropertyInputs,
  monthlyMortgage: number,
  initialMonthlyExpenses: number,
  loanAmount: number
): CashFlowProjection[] {
  const projections: CashFlowProjection[] = [];
  
  let currentIncome = inputs.grossMonthlyIncome;
  let currentExpenses = initialMonthlyExpenses;
  let currentPropertyValue = inputs.isRehabbing && inputs.afterRepairValue 
    ? inputs.afterRepairValue 
    : inputs.purchasePrice;
  let cumulativeCashFlow = 0;
  
  const incomeGrowthRate = (inputs.annualIncomeGrowth || 0) / 100;
  const expenseGrowthRate = (inputs.annualExpensesGrowth || 0) / 100;
  const propertyGrowthRate = (inputs.annualPropertyValueGrowth || 0) / 100;
  
  for (let year = 1; year <= 5; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthNumber = (year - 1) * 12 + month;
      const cashFlow = currentIncome - currentExpenses - monthlyMortgage;
      cumulativeCashFlow += cashFlow;
      
      // Calculate loan balance for this month
      const loanBalance = inputs.isPurchasingWithCash 
        ? 0 
        : calculateLoanBalance(
            loanAmount, 
            inputs.interestRate || 0, 
            inputs.loanTerm || 30, 
            monthNumber
          );
      
      const equity = currentPropertyValue - loanBalance;
      
      projections.push({
        year,
        month,
        income: currentIncome,
        expenses: currentExpenses,
        mortgage: monthlyMortgage,
        cashFlow,
        cumulativeCashFlow,
        propertyValue: currentPropertyValue,
        loanBalance,
        equity
      });
    }
    
    // Apply growth rates at year-end
    currentIncome *= (1 + incomeGrowthRate);
    currentExpenses *= (1 + expenseGrowthRate);
    currentPropertyValue *= (1 + propertyGrowthRate);
  }
  
  return projections;
}

/**
 * Main calculation function - performs all rental property calculations
 */
export function calculateRentalPropertyMetrics(inputs: RentalPropertyInputs): RentalPropertyResults {
  // Calculate loan amount and mortgage
  const loanAmount = inputs.isPurchasingWithCash 
    ? 0 
    : inputs.purchasePrice - (inputs.downPayment || 0);
  
  const monthlyMortgagePayment = inputs.isPurchasingWithCash 
    ? 0 
    : calculateMortgagePayment(
        loanAmount, 
        inputs.interestRate || 0, 
        inputs.loanTerm || 30
      );
  
  // Calculate expenses
  const expenseBreakdown = calculateMonthlyExpenses(inputs);
  const totalMonthlyExpenses = expenseBreakdown.total;
  
  // Calculate cash flow
  const monthlyCashFlow = inputs.grossMonthlyIncome - totalMonthlyExpenses - monthlyMortgagePayment;
  const annualCashFlow = monthlyCashFlow * 12;
  
  // Calculate NOI (Net Operating Income - income minus expenses, before debt service)
  const netOperatingIncome = (inputs.grossMonthlyIncome * 12) - (totalMonthlyExpenses * 12);
  
  // Calculate total cash needed
  const repairCosts = inputs.isRehabbing ? (inputs.repairCosts || 0) : 0;
  const totalCashNeeded = (inputs.downPayment || inputs.purchasePrice) + 
                          inputs.purchaseClosingCost + 
                          repairCosts;
  
  // Calculate Cash on Cash ROI
  const cashOnCashROI = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0;
  
  // Calculate Cap Rates
  const proFormaCapRate = inputs.purchasePrice > 0 
    ? (netOperatingIncome / inputs.purchasePrice) * 100 
    : 0;
  
  const totalInvestment = inputs.isRehabbing 
    ? inputs.purchasePrice + repairCosts 
    : inputs.purchasePrice;
  const purchaseCapRate = totalInvestment > 0 
    ? (netOperatingIncome / totalInvestment) * 100 
    : 0;
  
  // Calculate Debt Service Coverage Ratio (DSCR)
  const annualDebtService = monthlyMortgagePayment * 12;
  const debtServiceCoverageRatio = annualDebtService > 0 
    ? netOperatingIncome / annualDebtService 
    : 0;
  
  // Calculate Operating Expense Ratio
  const operatingExpenseRatio = inputs.grossMonthlyIncome > 0
    ? (totalMonthlyExpenses / inputs.grossMonthlyIncome) * 100
    : 0;
  
  // Generate 5-year projections
  const cashFlowProjections = calculateCashFlowProjections(
    inputs,
    monthlyMortgagePayment,
    totalMonthlyExpenses,
    loanAmount
  );
  
  // Get 5-year end values
  const fiveYearEnd = cashFlowProjections[cashFlowProjections.length - 1];
  const fiveYearPropertyValue = fiveYearEnd.propertyValue;
  const fiveYearEquityBuildup = fiveYearEnd.equity - (totalInvestment - loanAmount);
  const fiveYearCumulativeCashFlow = fiveYearEnd.cumulativeCashFlow;
  
  // Calculate total return including appreciation, equity, and cash flow
  const salesExpensePercent = (inputs.salesExpenses || 7) / 100;
  const salesExpenses = fiveYearPropertyValue * salesExpensePercent;
  const fiveYearTotalReturn = fiveYearEnd.equity + fiveYearCumulativeCashFlow - salesExpenses - totalCashNeeded;
  
  // Calculate annualized return
  const fiveYearAnnualizedReturn = totalCashNeeded > 0
    ? (Math.pow(1 + (fiveYearTotalReturn / totalCashNeeded), 1/5) - 1) * 100
    : 0;
  
  return {
    // Basic monthly metrics
    monthlyMortgagePayment,
    totalMonthlyIncome: inputs.grossMonthlyIncome,
    totalMonthlyExpenses,
    monthlyExpenseBreakdown: expenseBreakdown,
    monthlyCashFlow,
    
    // Annual metrics
    annualCashFlow,
    netOperatingIncome,
    
    // Investment metrics
    totalCashNeeded,
    loanAmount,
    cashOnCashROI,
    proFormaCapRate,
    purchaseCapRate,
    
    // Long-term projections
    fiveYearAnnualizedReturn,
    fiveYearTotalReturn,
    fiveYearEquityBuildup,
    fiveYearPropertyValue,
    
    // Additional metrics
    debtServiceCoverageRatio,
    operatingExpenseRatio,
    
    // Projections
    cashFlowProjections
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(amount: number, decimals: number = 2): string {
  return `${amount.toFixed(decimals)}%`;
}



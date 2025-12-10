/**
 * Database Helper Functions for Rental Property Calculator
 * Use these functions to save and retrieve calculation results from Supabase
 */

import { supabase } from './supabase';
import { RentalPropertyInputs, RentalPropertyResults } from './rentalCalculations';

export interface SavedAnalysis {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  property_address: string;
  monthly_cash_flow: number;
  cash_on_cash_roi: number;
  five_year_annualized_return: number;
  total_cash_needed: number;
}

/**
 * Save rental property analysis results to database
 */
export async function saveRentalAnalysis(
  inputs: RentalPropertyInputs,
  results: RentalPropertyResults
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Prepare data for database
    const dataToSave = {
      owner_id: user.id,
      
      // Property Information
      property_address: inputs.propertyAddress,
      
      // Purchase Details
      purchase_price: inputs.purchasePrice,
      purchase_closing_cost: inputs.purchaseClosingCost,
      is_rehabbing: inputs.isRehabbing,
      after_repair_value: inputs.afterRepairValue,
      repair_costs: inputs.repairCosts,
      itemized_repair_costs: inputs.itemizedRepairCosts || null,
      itemized_closing_costs: inputs.itemizedClosingCosts || null,
      
      // Financing Details
      is_purchasing_with_cash: inputs.isPurchasingWithCash,
      down_payment: inputs.downPayment,
      down_payment_percent: inputs.downPaymentPercent,
      interest_rate: inputs.interestRate,
      loan_term: inputs.loanTerm,
      points_charged: inputs.pointsCharged,
      
      // Rental Income
      gross_monthly_income: inputs.grossMonthlyIncome,
      income_breakdown: inputs.incomeBreakdown || null,
      
      // Expenses
      property_taxes: inputs.propertyTaxes,
      property_taxes_frequency: inputs.propertyTaxesFrequency,
      insurance: inputs.insurance,
      insurance_frequency: inputs.insuranceFrequency,
      repairs_maintenance_percent: inputs.repairsMaintenance,
      capital_expenditures_percent: inputs.capitalExpenditures,
      vacancy_percent: inputs.vacancy,
      management_fees_percent: inputs.managementFees,
      electricity: inputs.electricity,
      gas: inputs.gas,
      water_sewer: inputs.waterSewer,
      hoa_fees: inputs.hoaFees,
      garbage: inputs.garbage,
      other_expense: inputs.otherExpense,
      
      // Growth Rates
      annual_property_value_growth: inputs.annualPropertyValueGrowth,
      annual_income_growth: inputs.annualIncomeGrowth,
      annual_expenses_growth: inputs.annualExpensesGrowth,
      sales_expenses_percent: inputs.salesExpenses,
      
      // Calculated Results
      monthly_mortgage_payment: results.monthlyMortgagePayment,
      total_monthly_expenses: results.totalMonthlyExpenses,
      monthly_cash_flow: results.monthlyCashFlow,
      annual_cash_flow: results.annualCashFlow,
      net_operating_income: results.netOperatingIncome,
      total_cash_needed: results.totalCashNeeded,
      loan_amount: results.loanAmount,
      cash_on_cash_roi: results.cashOnCashROI,
      pro_forma_cap_rate: results.proFormaCapRate,
      purchase_cap_rate: results.purchaseCapRate,
      debt_service_coverage_ratio: results.debtServiceCoverageRatio,
      operating_expense_ratio: results.operatingExpenseRatio,
      five_year_annualized_return: results.fiveYearAnnualizedReturn,
      five_year_total_return: results.fiveYearTotalReturn,
      five_year_equity_buildup: results.fiveYearEquityBuildup,
      five_year_property_value: results.fiveYearPropertyValue,
      
      // Complex data as JSONB
      cash_flow_projections: results.cashFlowProjections,
      expense_breakdown: results.monthlyExpenseBreakdown
    };

    const { data, error } = await supabase
      .from('rental_property_calculator_results')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('Error saving analysis:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('Unexpected error saving analysis:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all saved analyses for the current user
 */
export async function getUserAnalyses(): Promise<{ success: boolean; data?: SavedAnalysis[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('rental_property_calculator_results')
      .select(`
        id,
        owner_id,
        created_at,
        updated_at,
        property_address,
        monthly_cash_flow,
        cash_on_cash_roi,
        five_year_annualized_return,
        total_cash_needed
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching analyses:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SavedAnalysis[] };
  } catch (error) {
    console.error('Unexpected error fetching analyses:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get a specific analysis by ID
 */
export async function getAnalysisById(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('rental_property_calculator_results')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching analysis:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error fetching analysis:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete an analysis
 */
export async function deleteAnalysis(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('rental_property_calculator_results')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error deleting analysis:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting analysis:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing analysis
 */
export async function updateAnalysis(
  id: string,
  inputs: RentalPropertyInputs,
  results: RentalPropertyResults
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Prepare update data (same structure as saveRentalAnalysis)
    const dataToUpdate = {
      // All the same fields as in saveRentalAnalysis
      property_address: inputs.propertyAddress,
      purchase_price: inputs.purchasePrice,
      // ... (include all fields)
    };

    const { error } = await supabase
      .from('rental_property_calculator_results')
      .update(dataToUpdate)
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error updating analysis:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating analysis:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}



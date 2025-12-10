import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Home, Calendar, PiggyBank, Save, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { 
  RentalPropertyResults as Results,
  RentalPropertyInputs,
  formatCurrency, 
  formatPercent 
} from '../lib/rentalCalculations';
import { saveRentalAnalysis } from '../lib/rentalDatabaseHelpers';

interface RentalPropertyResultsProps {
  results: Results;
  inputs: RentalPropertyInputs;
  propertyAddress: string;
  onBack: () => void;
}

export default function RentalPropertyResults({ results, inputs, propertyAddress, onBack }: RentalPropertyResultsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const handleSaveReport = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const result = await saveRentalAnalysis(inputs, results);
      
      if (result.success) {
        setSaveStatus('success');
        setSaveMessage('Analysis saved successfully! View it in My Reports.');
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 5000);
      } else {
        setSaveStatus('error');
        setSaveMessage(result.error || 'Failed to save analysis. Please try again.');
      }
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage('An unexpected error occurred. Please try again.');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };
  // Prepare data for cash flow chart (yearly aggregation for cleaner visualization)
  const yearlyCashFlowData = [];
  for (let year = 1; year <= 5; year++) {
    const yearData = results.cashFlowProjections.filter(p => p.year === year);
    const avgMonthlyIncome = yearData.reduce((sum, p) => sum + p.income, 0) / 12;
    const avgMonthlyExpenses = yearData.reduce((sum, p) => sum + p.expenses, 0) / 12;
    const avgMonthlyCashFlow = yearData.reduce((sum, p) => sum + p.cashFlow, 0) / 12;
    const endOfYearEquity = yearData[yearData.length - 1].equity;
    const endOfYearPropertyValue = yearData[yearData.length - 1].propertyValue;
    
    yearlyCashFlowData.push({
      year: `Year ${year}`,
      income: Math.round(avgMonthlyIncome),
      expenses: Math.round(avgMonthlyExpenses),
      mortgage: Math.round(results.monthlyMortgagePayment),
      cashFlow: Math.round(avgMonthlyCashFlow),
      equity: Math.round(endOfYearEquity),
      propertyValue: Math.round(endOfYearPropertyValue)
    });
  }

  // Prepare expense breakdown data for pie/bar chart
  const expenseBreakdownData = [
    { name: 'Property Taxes', value: Math.round(results.monthlyExpenseBreakdown.propertyTaxes) },
    { name: 'Insurance', value: Math.round(results.monthlyExpenseBreakdown.insurance) },
    { name: 'Repairs & Maintenance', value: Math.round(results.monthlyExpenseBreakdown.repairsMaintenance) },
    { name: 'Capital Expenditures', value: Math.round(results.monthlyExpenseBreakdown.capitalExpenditures) },
    { name: 'Vacancy', value: Math.round(results.monthlyExpenseBreakdown.vacancy) },
    { name: 'Management Fees', value: Math.round(results.monthlyExpenseBreakdown.managementFees) },
    { name: 'Utilities', value: Math.round(results.monthlyExpenseBreakdown.electricity + results.monthlyExpenseBreakdown.gas + results.monthlyExpenseBreakdown.waterSewer) },
    { name: 'HOA & Other', value: Math.round(results.monthlyExpenseBreakdown.hoaFees + results.monthlyExpenseBreakdown.garbage + results.monthlyExpenseBreakdown.other) }
  ].filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Calculator
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Rental Property Analysis Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Home className="w-4 h-4" />
            {propertyAddress}
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Monthly Cash Flow */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Cash Flow</h3>
              {results.monthlyCashFlow >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${results.monthlyCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(results.monthlyCashFlow)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Annual: {formatCurrency(results.annualCashFlow)}
            </p>
          </div>

          {/* Cash on Cash ROI */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash on Cash ROI</h3>
              <DollarSign className="w-5 h-5 text-brand-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatPercent(results.cashOnCashROI)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Annual return on investment
            </p>
          </div>

          {/* Total Cash Needed */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cash Needed</h3>
              <PiggyBank className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(results.totalCashNeeded)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Down payment + closing costs
            </p>
          </div>

          {/* 5-Year Return */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">5-Year Annualized Return</h3>
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatPercent(results.fiveYearAnnualizedReturn)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total return: {formatCurrency(results.fiveYearTotalReturn)}
            </p>
          </div>
        </div>

        {/* Income & Expenses Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Income */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Monthly Income
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Gross Monthly Income</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(results.totalMonthlyIncome)}
                </span>
              </div>
            </div>
          </div>

          {/* Expenses Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Monthly Expenses
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Operating Expenses</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(results.totalMonthlyExpenses)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Mortgage Payment</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(results.monthlyMortgagePayment)}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Total Monthly Cost</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(results.totalMonthlyExpenses + results.monthlyMortgagePayment)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow Over Time Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Cash Flow Projection (5 Years)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={yearlyCashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F9FAFB' }}
              />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Monthly Income" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Monthly Expenses" />
              <Line type="monotone" dataKey="cashFlow" stroke="#3B82F6" strokeWidth={2} name="Monthly Cash Flow" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Expense Breakdown Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Monthly Expense Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseBreakdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F9FAFB' }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Bar dataKey="value" fill="#8B5CF6" name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Investment Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Investment Metrics
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Net Operating Income (NOI)</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(results.netOperatingIncome)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Pro Forma Cap Rate</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatPercent(results.proFormaCapRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Purchase Cap Rate</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatPercent(results.purchaseCapRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Debt Service Coverage Ratio</span>
                <span className={`font-semibold ${results.debtServiceCoverageRatio >= 1.25 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {results.debtServiceCoverageRatio.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Operating Expense Ratio</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatPercent(results.operatingExpenseRatio)}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Year Projections */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              5-Year Projections
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Property Value</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(results.fiveYearPropertyValue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Equity Buildup</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(results.fiveYearEquityBuildup)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Return</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(results.fiveYearTotalReturn)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Annualized Return</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {formatPercent(results.fiveYearAnnualizedReturn)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Expense Breakdown Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Detailed Monthly Expense Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 text-gray-600 dark:text-gray-400 font-medium">Category</th>
                  <th className="pb-3 text-right text-gray-600 dark:text-gray-400 font-medium">Amount</th>
                  <th className="pb-3 text-right text-gray-600 dark:text-gray-400 font-medium">% of Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="py-3 text-gray-900 dark:text-gray-100">Property Taxes</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.propertyTaxes)}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.propertyTaxes / results.totalMonthlyIncome) * 100, 1)}</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900 dark:text-gray-100">Insurance</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.insurance)}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.insurance / results.totalMonthlyIncome) * 100, 1)}</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900 dark:text-gray-100">Repairs & Maintenance</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.repairsMaintenance)}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.repairsMaintenance / results.totalMonthlyIncome) * 100, 1)}</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900 dark:text-gray-100">Capital Expenditures</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.capitalExpenditures)}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.capitalExpenditures / results.totalMonthlyIncome) * 100, 1)}</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900 dark:text-gray-100">Vacancy</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.vacancy)}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.vacancy / results.totalMonthlyIncome) * 100, 1)}</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900 dark:text-gray-100">Management Fees</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.managementFees)}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.managementFees / results.totalMonthlyIncome) * 100, 1)}</td>
                </tr>
                {results.monthlyExpenseBreakdown.electricity > 0 && (
                  <tr>
                    <td className="py-3 text-gray-900 dark:text-gray-100">Electricity</td>
                    <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.electricity)}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.electricity / results.totalMonthlyIncome) * 100, 1)}</td>
                  </tr>
                )}
                {results.monthlyExpenseBreakdown.gas > 0 && (
                  <tr>
                    <td className="py-3 text-gray-900 dark:text-gray-100">Gas</td>
                    <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.gas)}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.gas / results.totalMonthlyIncome) * 100, 1)}</td>
                  </tr>
                )}
                {results.monthlyExpenseBreakdown.waterSewer > 0 && (
                  <tr>
                    <td className="py-3 text-gray-900 dark:text-gray-100">Water & Sewer</td>
                    <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.waterSewer)}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.waterSewer / results.totalMonthlyIncome) * 100, 1)}</td>
                  </tr>
                )}
                {results.monthlyExpenseBreakdown.hoaFees > 0 && (
                  <tr>
                    <td className="py-3 text-gray-900 dark:text-gray-100">HOA Fees</td>
                    <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.hoaFees)}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.hoaFees / results.totalMonthlyIncome) * 100, 1)}</td>
                  </tr>
                )}
                {results.monthlyExpenseBreakdown.garbage > 0 && (
                  <tr>
                    <td className="py-3 text-gray-900 dark:text-gray-100">Garbage</td>
                    <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.garbage)}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.garbage / results.totalMonthlyIncome) * 100, 1)}</td>
                  </tr>
                )}
                {results.monthlyExpenseBreakdown.other > 0 && (
                  <tr>
                    <td className="py-3 text-gray-900 dark:text-gray-100">Other</td>
                    <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.monthlyExpenseBreakdown.other)}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatPercent((results.monthlyExpenseBreakdown.other / results.totalMonthlyIncome) * 100, 1)}</td>
                  </tr>
                )}
                <tr className="font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="py-3 text-gray-900 dark:text-gray-100">Total Expenses</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(results.totalMonthlyExpenses)}</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{formatPercent((results.totalMonthlyExpenses / results.totalMonthlyIncome) * 100, 1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Success/Error Message */}
        {saveStatus !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            saveStatus === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
          }`}>
            {saveStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{saveMessage}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Edit Analysis
          </button>
          <button
            onClick={handleSaveReport}
            disabled={isSaving || saveStatus === 'success'}
            className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 justify-center ${
              saveStatus === 'success'
                ? 'bg-green-500 text-white cursor-not-allowed'
                : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Report
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}


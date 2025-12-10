import { useState } from 'react';
import { ChevronDown, Info, Plus } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';
import RentalPropertyResults from './RentalPropertyResults';
import { 
  calculateRentalPropertyMetrics, 
  RentalPropertyInputs, 
  RentalPropertyResults as Results 
} from '../lib/rentalCalculations';

export default function LongTermRentalCalculator() {
  const [showResults, setShowResults] = useState(false);
  const [calculationResults, setCalculationResults] = useState<Results | null>(null);
  const [savedInputs, setSavedInputs] = useState<RentalPropertyInputs | null>(null);
  // Property Information
  const [propertyAddress, setPropertyAddress] = useState('');

  // Purchase Details
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseClosingCost, setPurchaseClosingCost] = useState('');
  const [isRehabbing, setIsRehabbing] = useState(false);
  const [showItemizedClosingCosts, setShowItemizedClosingCosts] = useState(false);
  
  // Rehab fields
  const [afterRepairValue, setAfterRepairValue] = useState('');
  const [repairCosts, setRepairCosts] = useState('');
  const [showItemizedRepairCosts, setShowItemizedRepairCosts] = useState(false);
  
  // Itemized Repair Costs
  const [roofing, setRoofing] = useState('');
  const [flooring, setFlooring] = useState('');
  const [landscaping, setLandscaping] = useState('');
  const [painting, setPainting] = useState('');
  const [electrical, setElectrical] = useState('');
  const [plumbing, setPlumbing] = useState('');
  const [concrete, setConcrete] = useState('');
  const [guttersFasia, setGuttersFasia] = useState('');
  const [septic, setSeptic] = useState('');
  const [foundation, setFoundation] = useState('');
  const [deckFencing, setDeckFencing] = useState('');
  const [demolition, setDemolition] = useState('');
  const [cabinets, setCabinets] = useState('');
  const [windowsDoors, setWindowsDoors] = useState('');
  const [carpentry, setCarpentry] = useState('');
  const [hvac, setHvac] = useState('');
  const [permits, setPermits] = useState('');
  const [otherRepair, setOtherRepair] = useState('');
  
  // Itemized Closing Costs
  const [titleEscrowFees, setTitleEscrowFees] = useState('');
  const [appraisalFees, setAppraisalFees] = useState('');
  const [inspectionCosts, setInspectionCosts] = useState('');
  const [attorneyCharges, setAttorneyCharges] = useState('');
  const [recordingFees, setRecordingFees] = useState('');
  const [annualAssessments, setAnnualAssessments] = useState('');
  const [prepaidPropertyTaxes, setPrepaidPropertyTaxes] = useState('');
  const [prepaidFloodInsurance, setPrepaidFloodInsurance] = useState('');
  const [prepaidHazardInsurance, setPrepaidHazardInsurance] = useState('');
  const [pointsOriginationFee, setPointsOriginationFee] = useState('');
  const [otherClosingCost, setOtherClosingCost] = useState('');

  // Financing Details
  const [isPurchasingWithCash, setIsPurchasingWithCash] = useState(false);
  const [downPayment, setDownPayment] = useState('');
  const [downPaymentPercent, setDownPaymentPercent] = useState('25');
  const [interestRate, setInterestRate] = useState('6');
  const [loanTerm, setLoanTerm] = useState('30');
  const [pointsCharged, setPointsCharged] = useState('2');

  // Rental Income
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState('');
  const [showIncomeBreakdown, setShowIncomeBreakdown] = useState(false);
  
  // Income Breakdown
  const [rent, setRent] = useState('');
  const [laundryService, setLaundryService] = useState('');
  const [waterReimbursement, setWaterReimbursement] = useState('');
  const [customIncomeFields, setCustomIncomeFields] = useState<Array<{id: string, name: string, value: string}>>([]);

  // Expenses
  const [propertyTaxes, setPropertyTaxes] = useState('');
  const [propertyTaxesFrequency, setPropertyTaxesFrequency] = useState('Annual');
  const [insurance, setInsurance] = useState('');
  const [insuranceFrequency, setInsuranceFrequency] = useState('Annual');
  const [repairsMaintenance, setRepairsMaintenance] = useState('5');
  const [capitalExpenditures, setCapitalExpenditures] = useState('5');
  const [vacancy, setVacancy] = useState('5');
  const [managementFees, setManagementFees] = useState('10');
  const [electricity, setElectricity] = useState('');
  const [gas, setGas] = useState('');
  const [waterSewer, setWaterSewer] = useState('');
  const [hoaFees, setHoaFees] = useState('');
  const [garbage, setGarbage] = useState('');
  const [otherExpense, setOtherExpense] = useState('');

  // Optional sections
  const [showPropertyValueGrowth, setShowPropertyValueGrowth] = useState(false);
  const [showIncomeGrowth, setShowIncomeGrowth] = useState(false);
  const [showExpenseGrowth, setShowExpenseGrowth] = useState(false);
  
  // Property Value Growth
  const [annualPropertyValueGrowth, setAnnualPropertyValueGrowth] = useState('2');
  
  // Income Growth
  const [annualIncomeGrowth, setAnnualIncomeGrowth] = useState('2');
  
  // Expense Growth & Sales Expenses
  const [annualExpensesGrowth, setAnnualExpensesGrowth] = useState('2');
  const [salesExpenses, setSalesExpenses] = useState('7');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare input data for calculations
    const inputs: RentalPropertyInputs = {
      propertyAddress,
      purchasePrice: parseFloat(purchasePrice) || 0,
      purchaseClosingCost: parseFloat(purchaseClosingCost) || 0,
      isRehabbing,
      afterRepairValue: afterRepairValue ? parseFloat(afterRepairValue) : undefined,
      repairCosts: repairCosts ? parseFloat(repairCosts) : undefined,
      isPurchasingWithCash,
      downPayment: downPayment ? parseFloat(downPayment) : undefined,
      downPaymentPercent: downPaymentPercent ? parseFloat(downPaymentPercent) : undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      loanTerm: loanTerm ? parseInt(loanTerm) : undefined,
      pointsCharged: pointsCharged ? parseFloat(pointsCharged) : undefined,
      grossMonthlyIncome: parseFloat(grossMonthlyIncome) || 0,
      propertyTaxes: parseFloat(propertyTaxes) || 0,
      propertyTaxesFrequency: propertyTaxesFrequency as 'Annual' | 'Monthly',
      insurance: parseFloat(insurance) || 0,
      insuranceFrequency: insuranceFrequency as 'Annual' | 'Monthly',
      repairsMaintenance: parseFloat(repairsMaintenance) || 0,
      capitalExpenditures: parseFloat(capitalExpenditures) || 0,
      vacancy: parseFloat(vacancy) || 0,
      managementFees: parseFloat(managementFees) || 0,
      electricity: electricity ? parseFloat(electricity) : undefined,
      gas: gas ? parseFloat(gas) : undefined,
      waterSewer: waterSewer ? parseFloat(waterSewer) : undefined,
      hoaFees: hoaFees ? parseFloat(hoaFees) : undefined,
      garbage: garbage ? parseFloat(garbage) : undefined,
      otherExpense: otherExpense ? parseFloat(otherExpense) : undefined,
      annualPropertyValueGrowth: annualPropertyValueGrowth ? parseFloat(annualPropertyValueGrowth) : undefined,
      annualIncomeGrowth: annualIncomeGrowth ? parseFloat(annualIncomeGrowth) : undefined,
      annualExpensesGrowth: annualExpensesGrowth ? parseFloat(annualExpensesGrowth) : undefined,
      salesExpenses: salesExpenses ? parseFloat(salesExpenses) : undefined,
    };
    
    // Perform calculations
    const results = calculateRentalPropertyMetrics(inputs);
    setCalculationResults(results);
    setSavedInputs(inputs); // Save inputs to pass to results component
    setShowResults(true);
  };

  // Show results page if calculations are complete
  if (showResults && calculationResults && savedInputs) {
    return (
      <RentalPropertyResults
        results={calculationResults}
        inputs={savedInputs}
        propertyAddress={propertyAddress}
        onBack={() => setShowResults(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Description */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The Tenantry Rental Property Calculator helps you evaluate whether a rental property will cash flow and meet your financial goals by analyzing income, expenses, financing, and key investment metrics. Enter your basic property and loan details to generate a full profitability, cash flow, and ROI assessment, with the ability to adjust assumptions and compare scenarios. By understanding these metrics and the responsibilities of owning a rental, you can make informed decisions and determine whether a property is a smart addition to your portfolio.
        </p>
      </div>

      {/* Property Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Property Information
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Property Address <span className="text-red-500">*</span>
          </label>
          <AddressAutocomplete
            value={propertyAddress}
            onChange={setPropertyAddress}
            placeholder="e.g., 3345 Brucemont"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Purchase Details Section */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Purchase Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Purchase Price */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Purchase Price <span className="text-red-500">*</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  The total price you're paying to purchase the property
                </div>
              </div>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="305,776"
                min="0"
                step="1"
                required
                className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Purchase Closing Cost */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Purchase Closing Cost <span className="text-red-500">*</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Total closing costs including fees, title, escrow, etc.
                </div>
              </div>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                value={purchaseClosingCost}
                onChange={(e) => setPurchaseClosingCost(e.target.value)}
                placeholder="8,700"
                min="0"
                step="1"
                required
                className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* I will be rehabbing this property */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRehabbing(!isRehabbing)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                isRehabbing ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRehabbing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-sm text-gray-700 dark:text-gray-300">
              I will be rehabbing this property
            </label>
          </div>

          {/* Provide itemized closing costs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowItemizedClosingCosts(!showItemizedClosingCosts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                showItemizedClosingCosts ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showItemizedClosingCosts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Provide itemized closing costs
            </label>
          </div>
        </div>

        {/* Rehab Fields - shown when isRehabbing is true */}
        {isRehabbing && (
          <div className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* After Repair Value (ARV) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  After Repair Value (ARV)
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      Expected property value after repairs are completed
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={afterRepairValue}
                    onChange={(e) => setAfterRepairValue(e.target.value)}
                    placeholder="350,000"
                    min="0"
                    step="1"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Repair Costs */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Repair Costs
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      Total estimated cost of repairs and renovations
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={repairCosts}
                    onChange={(e) => setRepairCosts(e.target.value)}
                    placeholder="10,000"
                    min="0"
                    step="1"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Provide itemized repair costs toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowItemizedRepairCosts(!showItemizedRepairCosts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  showItemizedRepairCosts ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showItemizedRepairCosts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Provide itemized repair costs
              </label>
            </div>

            {/* Itemized Repair Costs */}
            {showItemizedRepairCosts && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Roofing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Roofing
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={roofing}
                      onChange={(e) => setRoofing(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Flooring */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Flooring
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={flooring}
                      onChange={(e) => setFlooring(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Landscaping */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Landscaping
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={landscaping}
                      onChange={(e) => setLandscaping(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Painting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Painting
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={painting}
                      onChange={(e) => setPainting(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Electrical */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Electrical
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={electrical}
                      onChange={(e) => setElectrical(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Plumbing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Plumbing
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={plumbing}
                      onChange={(e) => setPlumbing(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Concrete */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Concrete
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={concrete}
                      onChange={(e) => setConcrete(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Gutters/Fasia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gutters/Fasia
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={guttersFasia}
                      onChange={(e) => setGuttersFasia(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Septic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Septic
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={septic}
                      onChange={(e) => setSeptic(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Foundation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Foundation
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={foundation}
                      onChange={(e) => setFoundation(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Deck/Fencing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Deck/Fencing
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={deckFencing}
                      onChange={(e) => setDeckFencing(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Demolition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Demolition
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={demolition}
                      onChange={(e) => setDemolition(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Cabinets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cabinets
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={cabinets}
                      onChange={(e) => setCabinets(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Windows/Doors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Windows/Doors
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={windowsDoors}
                      onChange={(e) => setWindowsDoors(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Carpentry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Carpentry
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={carpentry}
                      onChange={(e) => setCarpentry(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* HVAC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    HVAC
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={hvac}
                      onChange={(e) => setHvac(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Permits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permits
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={permits}
                      onChange={(e) => setPermits(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Other */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Other
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={otherRepair}
                      onChange={(e) => setOtherRepair(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Itemized Closing Costs - shown when showItemizedClosingCosts is true */}
        {showItemizedClosingCosts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            {/* Title & Escrow Fees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title & Escrow Fees
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={titleEscrowFees}
                  onChange={(e) => setTitleEscrowFees(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Appraisal Fees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Appraisal Fees
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={appraisalFees}
                  onChange={(e) => setAppraisalFees(e.target.value)}
                  placeholder="600"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Inspection Costs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Inspection Costs
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={inspectionCosts}
                  onChange={(e) => setInspectionCosts(e.target.value)}
                  placeholder="500"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Attorney Charges */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attorney Charges
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={attorneyCharges}
                  onChange={(e) => setAttorneyCharges(e.target.value)}
                  placeholder="500"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Recording Fees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recording Fees
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={recordingFees}
                  onChange={(e) => setRecordingFees(e.target.value)}
                  placeholder="1,000"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Annual Assessments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Annual Assessments
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={annualAssessments}
                  onChange={(e) => setAnnualAssessments(e.target.value)}
                  placeholder="100"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Prepaid Property Taxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prepaid Property Taxes
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={prepaidPropertyTaxes}
                  onChange={(e) => setPrepaidPropertyTaxes(e.target.value)}
                  placeholder="3,000"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Prepaid Flood Insurance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prepaid Flood Insurance
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={prepaidFloodInsurance}
                  onChange={(e) => setPrepaidFloodInsurance(e.target.value)}
                  placeholder="1,000"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Prepaid Hazard Insurance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prepaid Hazard Insurance
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={prepaidHazardInsurance}
                  onChange={(e) => setPrepaidHazardInsurance(e.target.value)}
                  placeholder="2,000"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Points/Origination Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Points/Origination Fee
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={pointsOriginationFee}
                  onChange={(e) => setPointsOriginationFee(e.target.value)}
                  placeholder="3,000"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Other */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Other
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={otherClosingCost}
                  onChange={(e) => setOtherClosingCost(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Optional Property Value Growth Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowPropertyValueGrowth(!showPropertyValueGrowth)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            <span className="text-gray-400 dark:text-gray-500">Optional</span> Property Value Growth
          </h3>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              showPropertyValueGrowth ? 'rotate-180' : ''
            }`}
          />
        </button>
        {showPropertyValueGrowth && (
          <div className="mt-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Annual Property Value Growth (appreciation)
                <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Expected annual percentage increase in property value
                  </div>
                </div>
              </label>
              <div className="relative w-full md:w-64">
                <input
                  type="number"
                  value={annualPropertyValueGrowth}
                  onChange={(e) => setAnnualPropertyValueGrowth(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financing Details Section */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Financing Details
        </h3>

        {/* I will be purchasing with cash */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="purchasing-with-cash"
            checked={isPurchasingWithCash}
            onChange={(e) => setIsPurchasingWithCash(e.target.checked)}
            className="h-4 w-4 text-brand-500 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500"
          />
          <label htmlFor="purchasing-with-cash" className="text-sm text-gray-700 dark:text-gray-300">
            I will be purchasing with cash
          </label>
        </div>

        {!isPurchasingWithCash && (
          <>
            {/* Down Payment */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Down Payment <span className="text-red-500">*</span>
                <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    The amount you'll pay upfront for the property
                  </div>
                </div>
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    placeholder="76,444"
                    min="0"
                    step="1"
                    required
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div className="relative w-32">
                  <input
                    type="number"
                    value={downPaymentPercent}
                    onChange={(e) => setDownPaymentPercent(e.target.value)}
                    min="0"
                    max="100"
                    step="1"
                    required
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Interest Rate */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interest Rate
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      The annual interest rate on your mortgage
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
              </div>

              {/* Loan Term */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Loan Term
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      The length of your mortgage in years
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    min="1"
                    max="50"
                    step="1"
                    className="w-full pl-4 pr-16 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    years
                  </span>
                </div>
              </div>

              {/* Points Charged */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Points Charged
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      Discount points paid upfront to lower interest rate
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={pointsCharged}
                  onChange={(e) => setPointsCharged(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Rental Income Section */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Rental Income
        </h3>

        {/* Gross Monthly Income */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gross Monthly Income <span className="text-red-500">*</span>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Expected monthly rental income before expenses
              </div>
            </div>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              $
            </span>
            <input
              type="number"
              value={grossMonthlyIncome}
              onChange={(e) => setGrossMonthlyIncome(e.target.value)}
              placeholder="3,000"
              min="0"
              step="1"
              required
              className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Provide income breakdown */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowIncomeBreakdown(!showIncomeBreakdown)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
              showIncomeBreakdown ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showIncomeBreakdown ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Provide income breakdown
          </label>
        </div>

        {/* Income Breakdown Fields */}
        {showIncomeBreakdown && (
          <div className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Rent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rent
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Laundry Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Laundry Service
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    value={laundryService}
                    onChange={(e) => setLaundryService(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Water Reimbursement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Water Reimbursement
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    value={waterReimbursement}
                    onChange={(e) => setWaterReimbursement(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Custom Income Fields */}
            {customIncomeFields.map((field) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {field.name}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={field.value}
                      onChange={(e) => {
                        setCustomIncomeFields(customIncomeFields.map(f => 
                          f.id === field.id ? { ...f, value: e.target.value } : f
                        ));
                      }}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Custom Field Button */}
            <button
              type="button"
              onClick={() => {
                const fieldName = prompt('Enter custom field name:');
                if (fieldName) {
                  setCustomIncomeFields([
                    ...customIncomeFields,
                    { id: Date.now().toString(), name: fieldName, value: '' }
                  ]);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-brand-500 border border-brand-500 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Custom Field
            </button>
          </div>
        )}
      </div>

      {/* Optional Income Growth Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowIncomeGrowth(!showIncomeGrowth)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            <span className="text-gray-400 dark:text-gray-500">Optional</span> Income Growth
          </h3>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              showIncomeGrowth ? 'rotate-180' : ''
            }`}
          />
        </button>
        {showIncomeGrowth && (
          <div className="mt-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Annual Income Growth
                <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Expected annual percentage increase in rental income
                  </div>
                </div>
              </label>
              <div className="relative w-full md:w-64">
                <input
                  type="number"
                  value={annualIncomeGrowth}
                  onChange={(e) => setAnnualIncomeGrowth(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Expenses
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Property Taxes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Property Taxes <span className="text-red-500">*</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Annual or monthly property tax amount
                </div>
              </div>
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={propertyTaxes}
                  onChange={(e) => setPropertyTaxes(e.target.value)}
                  placeholder="1,400"
                  min="0"
                  step="1"
                  required
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div className="relative w-32">
                <select
                  value={propertyTaxesFrequency}
                  onChange={(e) => setPropertyTaxesFrequency(e.target.value)}
                  className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="Annual">Annual</option>
                  <option value="Monthly">Monthly</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Insurance <span className="text-red-500">*</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Property insurance cost (homeowners, landlord, etc.)
                </div>
              </div>
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  placeholder="3,000"
                  min="0"
                  step="1"
                  required
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div className="relative w-32">
                <select
                  value={insuranceFrequency}
                  onChange={(e) => setInsuranceFrequency(e.target.value)}
                  className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="Annual">Annual</option>
                  <option value="Monthly">Monthly</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Percentage-based expenses */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Repairs & Maintenance */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repairs & Maintenance
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Expected repair costs as % of gross monthly income
                </div>
              </div>
            </label>
            <div className="relative">
              <input
                type="number"
                value={repairsMaintenance}
                onChange={(e) => setRepairsMaintenance(e.target.value)}
                min="0"
                max="100"
                step="1"
                className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            </div>
          </div>

          {/* Capital Expenditures */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Capital Expenditures
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Major repairs/replacements as % of gross monthly income
                </div>
              </div>
            </label>
            <div className="relative">
              <input
                type="number"
                value={capitalExpenditures}
                onChange={(e) => setCapitalExpenditures(e.target.value)}
                min="0"
                max="100"
                step="1"
                className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            </div>
          </div>

          {/* Vacancy */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vacancy
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Expected vacancy as % of gross monthly income
                </div>
              </div>
            </label>
            <div className="relative">
              <input
                type="number"
                value={vacancy}
                onChange={(e) => setVacancy(e.target.value)}
                min="0"
                max="100"
                step="1"
                className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            </div>
          </div>

          {/* Management Fees */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Management Fees
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Property management fees as % of gross monthly income
                </div>
              </div>
            </label>
            <div className="relative">
              <input
                type="number"
                value={managementFees}
                onChange={(e) => setManagementFees(e.target.value)}
                min="0"
                max="100"
                step="1"
                className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Maintenance, vacancy, capital expenditures, and management fees are expressed as percentages of gross monthly income.
        </p>

        {/* Utility expenses */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Electricity */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Electricity
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Monthly electricity cost (if paid by landlord)
                </div>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={electricity}
                  onChange={(e) => setElectricity(e.target.value)}
                  placeholder="100"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                per month
              </span>
            </div>
          </div>

          {/* Gas */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gas
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Monthly gas cost (if paid by landlord)
                </div>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={gas}
                  onChange={(e) => setGas(e.target.value)}
                  placeholder="100"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                per month
              </span>
            </div>
          </div>

          {/* Water & Sewer */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Water & Sewer
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Monthly water/sewer cost (if paid by landlord)
                </div>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={waterSewer}
                  onChange={(e) => setWaterSewer(e.target.value)}
                  placeholder="100"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                per month
              </span>
            </div>
          </div>
        </div>

        {/* Other monthly expenses */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* HOA Fees */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              HOA Fees
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Monthly homeowners association fees
                </div>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={hoaFees}
                  onChange={(e) => setHoaFees(e.target.value)}
                  placeholder="45"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                per month
              </span>
            </div>
          </div>

          {/* Garbage */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Garbage
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Monthly garbage collection fees
                </div>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={garbage}
                  onChange={(e) => setGarbage(e.target.value)}
                  placeholder="30"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                per month
              </span>
            </div>
          </div>

          {/* Other */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Other
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Any other monthly expenses
                </div>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={otherExpense}
                  onChange={(e) => setOtherExpense(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                per month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Expense Growth & Sales Expenses Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowExpenseGrowth(!showExpenseGrowth)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            <span className="text-gray-400 dark:text-gray-500">Optional</span> Expense Growth & Sales Expenses
          </h3>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              showExpenseGrowth ? 'rotate-180' : ''
            }`}
          />
        </button>
        {showExpenseGrowth && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Annual Expenses Growth */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Annual Expenses Growth
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      Expected annual percentage increase in expenses
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={annualExpensesGrowth}
                    onChange={(e) => setAnnualExpensesGrowth(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
              </div>

              {/* Sales Expenses */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sales Expenses
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                      Expected expenses as percentage of sale price (e.g., realtor fees, closing costs)
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={salesExpenses}
                    onChange={(e) => setSalesExpenses(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-start pt-6">
        <button
          type="submit"
          className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors"
        >
          Finish analysis
        </button>
      </div>
    </form>
  );
}


import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calculator, Building2, DollarSign, TrendingUp, ArrowLeft, Loader2, Info, ChevronDown, CheckCircle, Download, Sparkles, FileText, PiggyBank } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';
import LongTermRentalCalculator from './LongTermRentalCalculator';
import { supabase } from '../lib/supabase';

type PropertyToolType = 'rental-calculator' | 'rent-estimator' | 'value-estimator' | 'loan-dscr-calculator' | 'cma-report' | null;

interface PropertyAnalysisProps {
  userId?: string;
  onNavigateToSupport?: () => void;
}

export default function PropertyAnalysis({ userId, onNavigateToSupport }: PropertyAnalysisProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedTool, setSelectedTool] = useState<PropertyToolType>(null);
  const [toolAddress, setToolAddress] = useState('');
  const [toolPropertyType, setToolPropertyType] = useState('');
  const [toolRadius, setToolRadius] = useState('1.00');
  const [toolBedrooms, setToolBedrooms] = useState('');
  const [toolBathrooms, setToolBathrooms] = useState('');
  const [toolNumberOfUnits, setToolNumberOfUnits] = useState('');
  const [toolSqft, setToolSqft] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  
  // CMA Report State
  const [yearBuilt, setYearBuilt] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [condition, setCondition] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
      if (user?.user_metadata?.first_name) {
        setFirstName(user.user_metadata.first_name);
      }
    };
    fetchUserData();
  }, []);

  // Reset tool selection when navigating from sidebar
  useEffect(() => {
    const state = location.state as { resetTool?: boolean } | null;
    if (state?.resetTool) {
      setSelectedTool(null);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const toolOptions = [
    {
      id: 'rental-calculator' as PropertyToolType,
      title: 'Rental Property Calculator',
      description: 'Calculate potential returns, cash flow, and key metrics for your rental property investment',
      icon: Calculator,
      isPro: false
    },
    {
      id: 'rent-estimator' as PropertyToolType,
      title: 'Rent Estimator',
      description: 'Get an instant rent estimate with comparable rental data for any address.',
      icon: Building2,
      isPro: false
    },
    {
      id: 'value-estimator' as PropertyToolType,
      title: 'Value Estimator',
      description: 'Get an instant property value estimate with comparable sales data for any address.',
      icon: DollarSign,
      isPro: false
    },
    {
      id: 'loan-dscr-calculator' as PropertyToolType,
      title: 'Loan & DSCR Calculator',
      description: 'Calculate loan payments, DSCR ratios, and analyze financing options for your investment property.',
      icon: PiggyBank,
      isPro: false
    },
    {
      id: 'cma-report' as PropertyToolType,
      title: 'Comparative Market Analysis (CMA) Report',
      description: 'Generate professional CMAs for any address, without needing a realtor or MLS access.',
      icon: TrendingUp,
      isPro: true
    }
  ];

  const resetToolForm = () => {
    setSelectedTool(null);
    setToolAddress('');
    setToolPropertyType('');
    setToolRadius('1.00');
    setToolBedrooms('');
    setToolBathrooms('');
    setToolNumberOfUnits('');
    setToolSqft('');
    setYearBuilt('');
    setLotSize('');
    setCondition('');
    setAdditionalDetails('');
    setIsCalculating(false);
    setIsGenerating(false);
    setGeneratedReportUrl(null);
  };

  const generateReportId = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `report_${timestamp}_${randomStr}`;
  };

  // Handle Tool Submission (Rent/Value Estimators)
  const handleToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedTool === 'rental-calculator' || selectedTool === 'loan-dscr-calculator') {
      return;
    }

    if (selectedTool === 'cma-report') {
      // Handle CMA Report generation
      setIsGenerating(true);
      setGeneratedReportUrl(null);
      
      const reportId = generateReportId();
      const webhookUrl = 'https://tenantry.app.n8n.cloud/webhook/cma';
      
      const reportData = {
        owner_id: userId,
        user_email: userEmail,
        first_name: firstName,
        report_id: reportId,
        doc_type: 'cma',
        reportType: 'comparative',
        address: toolAddress,
        propertyType: toolPropertyType,
        bedrooms: toolBedrooms ? parseInt(toolBedrooms) : undefined,
        bathrooms: toolBathrooms ? parseFloat(toolBathrooms) : undefined,
        numberOfUnits: (toolPropertyType === 'Multi-Family' || toolPropertyType === 'Apartment') ? toolNumberOfUnits : undefined,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
        sqft: toolSqft ? parseInt(toolSqft) : undefined,
        lotSize: lotSize ? parseInt(lotSize) : undefined,
        condition: condition || undefined,
        maxDistance: parseFloat(toolRadius),
        additionalDetails
      };
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportData),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Webhook response:', result);
          
          const filePath = `${userId}/${reportId}_cma`;
          const { data } = supabase.storage
            .from('user_documents')
            .getPublicUrl(filePath);
          
          const downloadUrl = data.publicUrl;
          setGeneratedReportUrl(downloadUrl);
          setIsGenerating(false);
        } else {
          console.error('Webhook error:', response.status, response.statusText);
          alert('Failed to generate report. Please try again.');
          setIsGenerating(false);
        }
      } catch (error) {
        console.error('Error calling webhook:', error);
        alert('Failed to connect to the report service. Please try again.');
        setIsGenerating(false);
      }
      return;
    }

    setIsCalculating(true);
    
    const isRentEstimator = selectedTool === 'rent-estimator';
    
    // Prepare search criteria
    const searchCriteria = {
      addressLine1: toolAddress.split(',')[0]?.trim(),
      bedrooms: toolBedrooms !== '' ? parseInt(toolBedrooms) : null,
      bathrooms: toolBathrooms !== '' ? parseFloat(toolBathrooms) : null,
      squareFootage: toolSqft !== '' ? parseInt(toolSqft) : null,
      radius: parseFloat(toolRadius),
    };

    console.log('🔍 Checking Supabase for cached estimate...');
    console.log('Search criteria:', searchCriteria);

    try {
      // Check Supabase for existing estimate
      const tableName = isRentEstimator ? 'rent_estimates' : 'property_estimates';
      const idColumn = isRentEstimator ? 'rent_estimate_id' : 'property_estimate_id';
      
      let query = supabase
        .from(tableName)
        .select(idColumn)
        .ilike('addressLine1', `%${searchCriteria.addressLine1}%`);

      // Add exact matching for bedrooms, bathrooms, square footage, and radius
      if (searchCriteria.bedrooms !== null) {
        query = query.eq('bedrooms', searchCriteria.bedrooms);
      }
      if (searchCriteria.bathrooms !== null) {
        query = query.eq('bathrooms', searchCriteria.bathrooms);
      }
      if (searchCriteria.squareFootage !== null) {
        query = query.eq('squareFootage', searchCriteria.squareFootage);
      }
      // Match radius exactly
      query = query.eq('radius', searchCriteria.radius);

      // Get the most recent estimate
      query = query.order('created_at', { ascending: false }).limit(1);

      const { data: cachedEstimate, error: queryError } = await query;

      if (queryError) {
        console.error('❌ Supabase query error:', queryError);
        // Continue to webhook on error
      } else if (cachedEstimate && cachedEstimate.length > 0) {
        const estimateId = isRentEstimator 
          ? (cachedEstimate[0] as any).rent_estimate_id 
          : (cachedEstimate[0] as any).property_estimate_id;
        console.log('✅ Found cached estimate:', estimateId);
        
        // Navigate to results with cached estimate
        const resultsPath = isRentEstimator 
          ? `/app/property-analysis/results/${estimateId}`
          : `/app/property-analysis/value-results/${estimateId}`;
        navigate(resultsPath);
        setIsCalculating(false);
        return;
      } else {
        console.log('⚠️ No cached estimate found, calling webhook...');
      }
    } catch (cacheError) {
      console.error('❌ Error checking cache:', cacheError);
      // Continue to webhook on error
    }

    // If no cached data, proceed with webhook call
    console.log('📡 Calling webhook for new estimate...');
    
    const estimateData = {
      owner_id: userId,
      address: toolAddress,
      propertyType: toolPropertyType,
      radius: parseFloat(toolRadius),
      bedrooms: toolBedrooms !== '' ? parseInt(toolBedrooms) : undefined,
      bathrooms: toolBathrooms !== '' ? parseFloat(toolBathrooms) : undefined,
      sqft: toolSqft !== '' ? parseInt(toolSqft) : undefined,
    };

    const webhookUrl = isRentEstimator 
      ? 'https://tenantry.app.n8n.cloud/webhook/rent-estimator'
      : 'https://tenantry.app.n8n.cloud/webhook/value-estimator';

    // For value estimator, add the necessary fields
    if (!isRentEstimator) {
      Object.assign(estimateData, {
        maxRadius: parseFloat(toolRadius),
        numberOfUnits: (toolPropertyType === 'Multi-Family' || toolPropertyType === 'Apartment') 
          ? toolNumberOfUnits 
          : undefined,
      });
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateData),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate estimate');
      }

      const responseData = await response.json();
      console.log('📥 Webhook response:', responseData);
      
      const estimateId = isRentEstimator
        ? (responseData.rent_estimate_id || responseData.estimate_id || responseData.id)
        : (responseData.property_estimate_id || responseData.estimate_id || responseData.id);
      
      if (estimateId) {
        console.log('✅ Navigating to results:', estimateId);
        const resultsPath = isRentEstimator 
          ? `/app/property-analysis/results/${estimateId}`
          : `/app/property-analysis/value-results/${estimateId}`;
        navigate(resultsPath);
      } else {
        console.error('❌ No estimate ID returned from webhook. Response:', responseData);
        alert('No estimate ID received from server. Please check the n8n workflow response.');
      }
      
    } catch (error) {
      console.error('❌ Error calculating estimate:', error);
      alert(`Failed to calculate estimate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {!selectedTool && (
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Property Analysis</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Estimate values, calculate returns, and generate detailed property reports
            </p>
          </div>
        )}

        {!selectedTool ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {toolOptions.map((option) => {
              const Icon = option.icon;
              const isClickable = option.id !== 'loan-dscr-calculator'; // Only loan-dscr-calculator is not clickable
              const Element = isClickable ? 'button' : 'div';
              return (
                <Element
                  key={option.id}
                  onClick={isClickable ? () => setSelectedTool(option.id) : undefined}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[180px] transition-all duration-200 text-left relative ${
                    isClickable 
                      ? 'hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md hover:-translate-y-1 cursor-pointer' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  {option.isPro && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-brand-500 text-white text-xs font-semibold px-2 py-1 rounded">
                        PRO
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                      <Icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {option.description}
                  </p>
                </Element>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {(() => {
                  const ToolIcon = toolOptions.find(t => t.id === selectedTool)?.icon || Calculator;
                  return <ToolIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />;
                })()}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {toolOptions.find(t => t.id === selectedTool)?.title}
                </h2>
              </div>
              <button
                onClick={resetToolForm}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Property Analysis
              </button>
            </div>

            {selectedTool === 'rental-calculator' ? (
              <LongTermRentalCalculator />
            ) : (
              <form onSubmit={handleToolSubmit} className="space-y-6">
                <fieldset disabled={isCalculating || isGenerating || !!generatedReportUrl} className="space-y-6">
                  {/* Property Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Property Address
                    </label>
                    <AddressAutocomplete
                      value={toolAddress}
                      onChange={setToolAddress}
                      placeholder="e.g., 123 Main St, Wilmington, NC 28401"
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Property Type
                    </label>
                    <div className="relative">
                      <select
                        value={toolPropertyType}
                        onChange={(e) => setToolPropertyType(e.target.value)}
                        className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      >
                        <option value="">Select property type</option>
                        <option value="Single Family">Single Family</option>
                        <option value="Condo">Condo</option>
                        <option value="Townhouse">Townhouse</option>
                        <option value="Manufactured">Manufactured</option>
                        <option value="Multi-Family">Multi-Family (2-4 units)</option>
                        <option value="Apartment">Apartment (5+ units)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Radius */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Radius
                      <div className="group relative">
                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                          Select the maximum distance to find comparable properties
                        </div>
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        value={toolRadius}
                        onChange={(e) => setToolRadius(e.target.value)}
                        className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      >
                        <option value="0.50">0.50 mi</option>
                        <option value="0.75">0.75 mi</option>
                        <option value="1.00">1.00 mi</option>
                        <option value="1.50">1.50 mi</option>
                        <option value="2.00">2.00 mi</option>
                        <option value="3.00">3.00 mi</option>
                        <option value="5.00">5.00 mi</option>
                        <option value="10.0">10.0 mi</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bedrooms <span className="text-xs text-gray-500 dark:text-gray-400">(per unit)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={toolBedrooms}
                        onChange={(e) => setToolBedrooms(e.target.value)}
                        className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      >
                        <option value="">Select bedrooms</option>
                        <option value="0">Studio</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6+</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bathrooms <span className="text-xs text-gray-500 dark:text-gray-400">(per unit)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={toolBathrooms}
                        onChange={(e) => setToolBathrooms(e.target.value)}
                        className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      >
                        <option value="">Select bathrooms</option>
                        <option value="1">1</option>
                        <option value="1.5">1.5</option>
                        <option value="2">2</option>
                        <option value="2.5">2.5</option>
                        <option value="3">3</option>
                        <option value="3.5">3.5</option>
                        <option value="4">4</option>
                        <option value="4.5">4.5</option>
                        <option value="5">5+</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Square Footage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Square Footage <span className="text-xs text-gray-500 dark:text-gray-400">(per unit)</span>
                    </label>
                    <input
                      type="number"
                      value={toolSqft}
                      onChange={(e) => setToolSqft(e.target.value)}
                      placeholder="e.g., 2000"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  {/* Number of Units - for Value Estimator and CMA with Multi-Family/Apartment */}
                  {(selectedTool === 'value-estimator' || selectedTool === 'cma-report') && (toolPropertyType === 'Multi-Family' || toolPropertyType === 'Apartment') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Number of Units
                      </label>
                      <div className="relative">
                        <select
                          value={toolNumberOfUnits}
                          onChange={(e) => setToolNumberOfUnits(e.target.value)}
                          className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          required
                        >
                          <option value="">Select number of units</option>
                          {toolPropertyType === 'Multi-Family' ? (
                            <>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                            </>
                          ) : (
                            Array.from({ length: 96 }, (_, i) => i + 5).map((num) => (
                              <option key={num} value={num.toString()}>
                                {num === 100 ? '100+' : num}
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* CMA-specific fields */}
                  {selectedTool === 'cma-report' && (
                    <>
                      {/* Year Built */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Year Built
                        </label>
                        <input
                          type="number"
                          value={yearBuilt}
                          onChange={(e) => setYearBuilt(e.target.value)}
                          placeholder="e.g., 2005"
                          min="1800"
                          max={new Date().getFullYear()}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>

                      {/* Lot Size (acres) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Lot Size (acres)
                        </label>
                        <input
                          type="number"
                          value={lotSize}
                          onChange={(e) => setLotSize(e.target.value)}
                          placeholder="e.g., 0.18"
                          min="0.01"
                          step="0.01"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>

                      {/* Condition */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Condition
                        </label>
                        <div className="relative">
                          <select
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">Select condition</option>
                            <option value="Excellent - Like new, recently renovated">Excellent - Like new, recently renovated</option>
                            <option value="Good - Well maintained, minor wear">Good - Well maintained, minor wear</option>
                            <option value="Average - Normal wear and tear">Average - Normal wear and tear</option>
                            <option value="Fair - Some repairs needed">Fair - Some repairs needed</option>
                            <option value="Poor - Significant repairs needed">Poor - Significant repairs needed</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Additional Details
                        </label>
                        <textarea
                          value={additionalDetails}
                          onChange={(e) => setAdditionalDetails(e.target.value)}
                          placeholder="Add any important details such as recent renovations or deferred maintenance. This will improve report accuracy."
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                        />
                      </div>

                      {/* Info Box for CMA */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          📊 Your report will include: Property value comparisons, market appreciation rates, days on market, and price per square foot analysis
                        </p>
                      </div>
                    </>
                  )}
                </fieldset>

                {/* Loading State */}
                {(isCalculating || isGenerating) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          {selectedTool === 'cma-report' ? 'Generating your report...' : 'Calculating...'}
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {selectedTool === 'cma-report' 
                            ? 'Estimated time: 3-5 minutes. You\'ll receive an email with your report shortly.'
                            : 'Please wait while we process your request...'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success State for CMA */}
                {generatedReportUrl && !isGenerating && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                          Report generated successfully!
                        </h3>
                        <div className="space-y-3">
                          <a
                            href={generatedReportUrl}
                            download
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Download Your Report
                          </a>
                          <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>
                              Tip: Your report has been added to the Tenantry AI knowledge base. 
                              <button 
                                type="button"
                                className="font-semibold underline hover:no-underline ml-1"
                                onClick={() => onNavigateToSupport?.()}
                              >
                                Ask us anything about your report!
                              </button>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                {!isCalculating && !isGenerating && !generatedReportUrl && (
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetToolForm}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {selectedTool === 'cma-report' ? 'Generate Report' : 'Calculate Estimate'}
                    </button>
                  </div>
                )}

                {/* New Report Button */}
                {generatedReportUrl && !isGenerating && (
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetToolForm}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                    >
                      Generate Another Report
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

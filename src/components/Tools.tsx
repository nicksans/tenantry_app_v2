import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calculator, ChevronDown, Loader2, Info, DollarSign, Building2, ArrowLeft, TrendingUp } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';
import MarketReports from './MarketReports';
import LongTermRentalCalculator from './LongTermRentalCalculator';
import TimelineCompare from './TimelineCompare';

type QuickToolType = 'rent-estimator' | 'value-estimator' | 'rental-calculator' | 'timeline-compare' | null;

interface ToolsProps {
  userId?: string;
}

export default function Tools({ userId }: ToolsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Quick Tools State
  const [selectedQuickTool, setSelectedQuickTool] = useState<QuickToolType>(null);
  const [quickToolAddress, setQuickToolAddress] = useState('');
  const [quickToolPropertyType, setQuickToolPropertyType] = useState('');
  const [quickToolRadius, setQuickToolRadius] = useState('1.00');
  const [quickToolBedrooms, setQuickToolBedrooms] = useState('');
  const [quickToolBathrooms, setQuickToolBathrooms] = useState('');
  const [quickToolNumberOfUnits, setQuickToolNumberOfUnits] = useState('');
  const [quickToolSqft, setQuickToolSqft] = useState('');
  const [isCalculatingQuick, setIsCalculatingQuick] = useState(false);

  // Reset tool selection when navigating from sidebar
  useEffect(() => {
    const state = location.state as { resetTool?: boolean } | null;
    if (state?.resetTool) {
      setSelectedQuickTool(null);
      // Clear the state so it doesn't reset again on other navigations
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const quickToolOptions = [
    {
      id: 'timeline-compare' as QuickToolType,
      title: 'Timeline Compare',
      description: 'Compare economic indicators, population trends, and rental market data across multiple cities or zip codes.',
      icon: TrendingUp
    },
    {
      id: 'rent-estimator' as QuickToolType,
      title: 'Rent Estimator',
      description: 'Get an instant rent estimate with comparable rental data for any address.',
      icon: Building2
    },
    {
      id: 'value-estimator' as QuickToolType,
      title: 'Value Estimator',
      description: 'Get an instant property value estimate with comparable sales data for any address.',
      icon: DollarSign
    },
    {
      id: 'rental-calculator' as QuickToolType,
      title: 'Rental Property Calculator',
      description: 'Calculate potential returns, cash flow, and key metrics for your rental property investment',
      icon: Calculator
    },
    {
      id: null,
      title: 'Market Finder',
      description: 'Discover real estate markets that match your investment criteria and goals.',
      icon: Building2
    },
    {
      id: null,
      title: 'Fix & Flip Calculator',
      description: 'Calculate potential profits and analyze fix-and-flip investment opportunities.',
      icon: Calculator
    },
    {
      id: null,
      title: 'Rehab Estimator',
      description: 'Estimate renovation costs and budget for property rehabilitation projects.',
      icon: Building2
    },
    {
      id: null,
      title: 'Mortgage Calculator',
      description: 'Calculate mortgage payments, interest, and amortization schedules.',
      icon: Calculator
    }
  ];

  const resetQuickToolForm = () => {
    setSelectedQuickTool(null);
    setQuickToolAddress('');
    setQuickToolPropertyType('');
    setQuickToolRadius('1.00');
    setQuickToolBedrooms('');
    setQuickToolBathrooms('');
    setQuickToolNumberOfUnits('');
    setQuickToolSqft('');
    setIsCalculatingQuick(false);
  };

  // Handle Quick Tool Submission (Rent/Value Estimators)
  const handleQuickToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedQuickTool === 'rental-calculator' || selectedQuickTool === 'timeline-compare') {
      return;
    }

    setIsCalculatingQuick(true);
    
    const estimateData = {
      owner_id: userId,
      address: quickToolAddress,
      propertyType: quickToolPropertyType,
      radius: parseFloat(quickToolRadius),
      bedrooms: quickToolBedrooms !== '' ? parseInt(quickToolBedrooms) : undefined,
      bathrooms: quickToolBathrooms !== '' ? parseFloat(quickToolBathrooms) : undefined,
      sqft: quickToolSqft !== '' ? parseInt(quickToolSqft) : undefined,
    };

    const isRentEstimator = selectedQuickTool === 'rent-estimator';
    const webhookUrl = isRentEstimator 
      ? 'https://tenantry.app.n8n.cloud/webhook/rent-estimator'
      : 'https://tenantry.app.n8n.cloud/webhook/value-estimator';

    // For value estimator, add the necessary fields
    if (!isRentEstimator) {
      Object.assign(estimateData, {
        maxRadius: parseFloat(quickToolRadius),
        numberOfUnits: (quickToolPropertyType === 'Multi-Family' || quickToolPropertyType === 'Apartment') 
          ? quickToolNumberOfUnits 
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
          ? `/app/tools/results/${estimateId}`
          : `/app/tools/value-results/${estimateId}`;
        navigate(resultsPath);
      } else {
        console.error('❌ No estimate ID returned from webhook. Response:', responseData);
        alert('No estimate ID received from server. Please check the n8n workflow response.');
      }
      
    } catch (error) {
      console.error('❌ Error calculating estimate:', error);
      alert(`Failed to calculate estimate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculatingQuick(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Only show main header and description when no tool is selected */}
        {!selectedQuickTool && (
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Analysis Tools</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Access fast, accurate tools to estimate rents, evaluate property values, and generate comprehensive market reports
            </p>
          </div>
        )}

        {/* Quick Tools Section */}
        <div className="mb-12">
          {/* Only show section header when no tool is selected */}
          {!selectedQuickTool && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-12 bg-brand-500 rounded"></div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Quick Tools</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Get instant property estimates and calculations in seconds
              </p>
            </>
          )}
          
          {!selectedQuickTool ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickToolOptions.map((option, index) => {
                const Icon = option.icon;
                const isClickable = option.id !== null;
                const Element = isClickable ? 'button' : 'div';
                return (
                  <Element
                    key={option.id || `tool-${index}`}
                    onClick={isClickable ? () => setSelectedQuickTool(option.id) : undefined}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[180px] transition-all duration-200 text-left ${
                      isClickable 
                        ? 'hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md hover:-translate-y-1 cursor-pointer' 
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
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
                    const ToolIcon = quickToolOptions.find(t => t.id === selectedQuickTool)?.icon || Calculator;
                    return <ToolIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />;
                  })()}
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {quickToolOptions.find(t => t.id === selectedQuickTool)?.title}
                  </h2>
                </div>
                <button
                  onClick={resetQuickToolForm}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Analysis Tools
                </button>
              </div>

              {selectedQuickTool === 'rental-calculator' ? (
                <LongTermRentalCalculator />
              ) : selectedQuickTool === 'timeline-compare' ? (
                <TimelineCompare />
              ) : (
                <form onSubmit={handleQuickToolSubmit} className="space-y-6">
                  <fieldset disabled={isCalculatingQuick} className="space-y-6">
                    {/* Property Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Property Address
                      </label>
                      <AddressAutocomplete
                        value={quickToolAddress}
                        onChange={setQuickToolAddress}
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
                          value={quickToolPropertyType}
                          onChange={(e) => setQuickToolPropertyType(e.target.value)}
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
                          value={quickToolRadius}
                          onChange={(e) => setQuickToolRadius(e.target.value)}
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
                          value={quickToolBedrooms}
                          onChange={(e) => setQuickToolBedrooms(e.target.value)}
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
                          value={quickToolBathrooms}
                          onChange={(e) => setQuickToolBathrooms(e.target.value)}
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
                        value={quickToolSqft}
                        onChange={(e) => setQuickToolSqft(e.target.value)}
                        placeholder="e.g., 2000"
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>

                    {/* Number of Units - for Value Estimator with Multi-Family/Apartment */}
                    {selectedQuickTool === 'value-estimator' && (quickToolPropertyType === 'Multi-Family' || quickToolPropertyType === 'Apartment') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Number of Units
                        </label>
                        <div className="relative">
                          <select
                            value={quickToolNumberOfUnits}
                            onChange={(e) => setQuickToolNumberOfUnits(e.target.value)}
                            className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                          >
                            <option value="">Select number of units</option>
                            {quickToolPropertyType === 'Multi-Family' ? (
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
                  </fieldset>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetQuickToolForm}
                      disabled={isCalculatingQuick}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCalculatingQuick}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCalculatingQuick ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        'Calculate Estimate'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Pro Tools Section - Only show when no Quick Tool is selected */}
        {!selectedQuickTool && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 bg-brand-500 rounded"></div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pro Tools</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Generate detailed, downloadable market research reports for any location
            </p>
            <MarketReports userId={userId} hideTitle={true} />
          </div>
        )}
      </div>
    </div>
  );
}

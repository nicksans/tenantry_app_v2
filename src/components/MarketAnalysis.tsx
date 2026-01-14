import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, DollarSign, Users, ArrowLeft, Loader2, CheckCircle, Download, Sparkles, Info, ChevronDown, LineChart, Map } from 'lucide-react';
import TimelineCompare from './TimelineCompare';
import MapView from './MapView';
import LocationAutocomplete from './LocationAutocomplete';
import { supabase } from '../lib/supabase';

type MarketToolType = 'timeline-compare' | 'map-view' | 'rental-market-analysis' | 'market-finder' | 'market-forecaster' | null;
type LocationType = 'state' | 'city' | 'zip';

interface MarketAnalysisProps {
  userId?: string;
  onNavigateToSupport?: () => void;
}

export default function MarketAnalysis({ userId, onNavigateToSupport }: MarketAnalysisProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedTool, setSelectedTool] = useState<MarketToolType>(null);
  
  // RMA Report State
  const [locationType, setLocationType] = useState<LocationType>('state');
  const [locationValue, setLocationValue] = useState('');
  const [rentalStrategy, setRentalStrategy] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [numberOfUnits, setNumberOfUnits] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  
  // Market Finder State
  const [region, setRegion] = useState('');
  const [marketType, setMarketType] = useState('');
  const [proximityCity, setProximityCity] = useState('');
  const [primaryObjective, setPrimaryObjective] = useState('');
  const [minPurchasePrice, setMinPurchasePrice] = useState('');
  const [maxPurchasePrice, setMaxPurchasePrice] = useState('');
  
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
      id: 'timeline-compare' as MarketToolType,
      title: 'Timeline View',
      description: 'Compare economic indicators, population trends, and rental market data across multiple cities or zip codes.',
      icon: LineChart,
      isPro: false
    },
    {
      id: 'map-view' as MarketToolType,
      title: 'Map View',
      description: 'Visualize market data and trends on an interactive map interface.',
      icon: Map,
      isPro: false
    },
    {
      id: 'rental-market-analysis' as MarketToolType,
      title: 'Rental Market Analysis (RMA) Report',
      description: 'Get comprehensive insights into any rental market (state, city, or zip) with accurate, up-to-date data.',
      icon: DollarSign,
      isPro: true
    },
    {
      id: 'market-finder' as MarketToolType,
      title: 'Market Finder',
      description: 'Find emerging rental markets that meet your criteria for cashflow and appreciation.',
      icon: Users,
      isPro: true
    },
    {
      id: 'market-forecaster' as MarketToolType,
      title: 'Market Forecaster',
      description: 'Predict future market trends and rental prices using AI-powered forecasting models.',
      icon: TrendingUp,
      isPro: true
    }
  ];

  const usStates = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' },
  ];

  const generateReportId = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `report_${timestamp}_${randomStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsGenerating(true);
    setGeneratedReportUrl(null);
    
    const reportId = generateReportId();
    
    let reportData: any;
    let webhookUrl: string;
    let filenameSuffix: string;
    
    if (selectedTool === 'market-finder') {
      webhookUrl = 'https://tenantry.app.n8n.cloud/webhook/market-finder-report';
      filenameSuffix = 'rentalmarketfinder';
      
      reportData = {
        owner_id: userId,
        user_email: userEmail,
        first_name: firstName,
        report_id: reportId,
        doc_type: 'rental_market_finder',
        reportType: 'rental-market',
        region,
        marketType,
        proximityCity: proximityCity || undefined,
        primaryObjective: primaryObjective || undefined,
        minPurchasePrice: minPurchasePrice || undefined,
        maxPurchasePrice: maxPurchasePrice || undefined,
        rentalStrategy: rentalStrategy || undefined,
        propertyType,
        additionalDetails
      };
    } else {
      // RMA Report
      webhookUrl = 'https://tenantry.app.n8n.cloud/webhook/rental-market-analysis';
      filenameSuffix = 'rentalmarketreport';
      
      let city = '';
      let state = '';
      
      if (locationType === 'city' && locationValue) {
        const parts = locationValue.split(',').map(part => part.trim());
        if (parts.length >= 2) {
          city = parts[0];
          state = parts[1];
        } else {
          city = locationValue;
        }
      }
      
      reportData = {
        owner_id: userId,
        user_email: userEmail,
        first_name: firstName,
        report_id: reportId,
        doc_type: 'rental_market_analysis',
        reportType: 'rental',
        locationType,
        locationValue,
        ...(locationType === 'city' && {
          city,
          state
        }),
        rentalStrategy: rentalStrategy || undefined,
        propertyType,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
        numberOfUnits: (propertyType === 'multi-family' || propertyType === 'apartment') ? numberOfUnits : undefined,
        additionalDetails
      };
    }
    
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
        
        const filePath = `${userId}/${reportId}_${filenameSuffix}`;
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
  };

  const resetForm = () => {
    setSelectedTool(null);
    setLocationType('state');
    setLocationValue('');
    setRentalStrategy('');
    setPropertyType('');
    setBedrooms('');
    setBathrooms('');
    setNumberOfUnits('');
    setAdditionalDetails('');
    setRegion('');
    setMarketType('');
    setProximityCity('');
    setPrimaryObjective('');
    setMinPurchasePrice('');
    setMaxPurchasePrice('');
    setIsGenerating(false);
    setGeneratedReportUrl(null);
  };

  return (
    <div className="p-6">
      <div className={selectedTool === 'map-view' ? 'max-w-[1800px] mx-auto' : 'max-w-6xl mx-auto'}>
        {!selectedTool && (
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Market Analysis</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Compare markets, analyze rental trends, and discover emerging investment opportunities
            </p>
          </div>
        )}

        {!selectedTool ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {toolOptions.map((option) => {
              const Icon = option.icon;
              const isClickable = option.id !== 'market-forecaster'; // Only Market Forecaster is not clickable yet
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
                  const ToolIcon = toolOptions.find(t => t.id === selectedTool)?.icon || TrendingUp;
                  return <ToolIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />;
                })()}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {toolOptions.find(t => t.id === selectedTool)?.title}
                </h2>
              </div>
              {selectedTool !== 'map-view' && (
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Market Analysis
                </button>
              )}
            </div>

            {selectedTool === 'timeline-compare' ? (
              <TimelineCompare />
            ) : selectedTool === 'map-view' ? (
              <MapView />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset disabled={isGenerating || !!generatedReportUrl} className="space-y-6">
                  {selectedTool === 'market-finder' ? (
                    <>
                      {/* Region Dropdown */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Region
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                              Limit the search to a specific U.S. region
                            </div>
                          </div>
                        </label>
                        <div className="relative">
                          <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                          >
                            <option value="">Select a region</option>
                            <option value="all">Any Region</option>
                            <option value="northeast">Northeast</option>
                            <option value="southeast">Southeast</option>
                            <option value="midwest">Midwest</option>
                            <option value="southwest">Southwest</option>
                            <option value="west">West</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Location Type Dropdown */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Location Type
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                              The type of location you are interested in
                            </div>
                          </div>
                        </label>
                        <div className="relative">
                          <select
                            value={marketType}
                            onChange={(e) => setMarketType(e.target.value)}
                            className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                          >
                            <option value="">Select location type</option>
                            <option value="state">State</option>
                            <option value="city">City</option>
                            <option value="zip">Zip Code</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Nearby City Input */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nearby city
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                              Select a city to stay within a close proximity to (within 50 miles)
                            </div>
                          </div>
                        </label>
                        <LocationAutocomplete
                          value={proximityCity}
                          onChange={setProximityCity}
                          locationType="city"
                          placeholder="e.g., Wilmington, NC"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>

                      {/* Primary Objective Radio Buttons */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Primary Objective
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                              Choose whether you want to prioritize cash flow, long-term appreciation, or a balanced mix of both
                            </div>
                          </div>
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'cash-flow', label: 'Maximize Cash Flow (Higher Cap Rate)' },
                            { value: 'appreciation', label: 'Maximize Appreciation (Lower Cap Rate)' },
                            { value: 'balanced', label: 'Balanced Cash Flow and Appreciation (Mid Cap Rate)' },
                            { value: 'no-preference', label: 'No Preference' }
                          ].map((objective) => (
                            <label key={objective.value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="primaryObjective"
                                value={objective.value}
                                checked={primaryObjective === objective.value}
                                onChange={(e) => setPrimaryObjective(e.target.value)}
                                className="w-4 h-4 text-brand-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-500"
                                required
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{objective.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Min Purchase Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Min Purchase Price
                        </label>
                        <input
                          type="text"
                          value={minPurchasePrice}
                          onChange={(e) => setMinPurchasePrice(e.target.value)}
                          placeholder="e.g., $100,000"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>

                      {/* Max Purchase Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Purchase Price
                        </label>
                        <input
                          type="text"
                          value={maxPurchasePrice}
                          onChange={(e) => setMaxPurchasePrice(e.target.value)}
                          placeholder="e.g., $250,000"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>

                      {/* Rental Strategy for Market Finder */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Rental Strategy
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                              Select the type of rental strategy you would like the report to focus on
                            </div>
                          </div>
                        </label>
                        <div className="relative">
                          <select
                            value={rentalStrategy}
                            onChange={(e) => setRentalStrategy(e.target.value)}
                            className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                          >
                            <option value="">Select rental strategy</option>
                            <option value="short-term">Short-Term Rental</option>
                            <option value="medium-term">Medium-Term Rental</option>
                            <option value="long-term">Long-Term Rental</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Property Type for Market Finder */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Property Type
                        </label>
                        <div className="relative">
                          <select
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
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
                    </>
                  ) : (
                    <>
                      {/* RMA Report fields */}
                      {/* Location Type Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Location Type
                        </label>
                        <div className="relative">
                          <select
                            value={locationType}
                            onChange={(e) => {
                              const newType = e.target.value as LocationType;
                              setLocationType(newType);
                              setLocationValue('');
                            }}
                            className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="state">State</option>
                            <option value="city">City</option>
                            <option value="zip">Zip Code</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Location Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Enter {locationType === 'city' ? 'City' : locationType === 'zip' ? 'Zip Code' : 'State'}
                        </label>
                        {locationType === 'state' ? (
                          <div className="relative">
                            <select
                              value={locationValue}
                              onChange={(e) => setLocationValue(e.target.value)}
                              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              required
                            >
                              <option value="">Select a state</option>
                              {usStates.map((state) => (
                                <option key={state.value} value={state.label}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          </div>
                        ) : (
                          <LocationAutocomplete
                            value={locationValue}
                            onChange={setLocationValue}
                            locationType={locationType}
                            placeholder={
                              locationType === 'city'
                                ? 'e.g., Wilmington, NC'
                                : 'e.g., 90210'
                            }
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                          />
                        )}
                      </div>

                      {/* Rental Strategy */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Rental Strategy
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                              Select the type of rental strategy you would like the report to focus on
                            </div>
                          </div>
                        </label>
                        <div className="relative">
                          <select
                            value={rentalStrategy}
                            onChange={(e) => setRentalStrategy(e.target.value)}
                            className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                          >
                            <option value="">Select rental strategy</option>
                            <option value="short-term">Short-Term Rental</option>
                            <option value="medium-term">Medium-Term Rental</option>
                            <option value="long-term">Long-Term Rental</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Property Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Property Type
                        </label>
                        <div className="relative">
                          <select
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
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

                      {/* Number of Units */}
                      {(propertyType === 'multi-family' || propertyType === 'apartment') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Number of Units
                          </label>
                          <div className="relative">
                            <select
                              value={numberOfUnits}
                              onChange={(e) => setNumberOfUnits(e.target.value)}
                              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              required
                            >
                              <option value="">Select number of units</option>
                              {propertyType === 'multi-family' ? (
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

                      {/* Bedrooms */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Bedrooms <span className="text-xs text-gray-500 dark:text-gray-400">(per unit)</span>
                        </label>
                        <div className="relative">
                          <select
                            value={bedrooms}
                            onChange={(e) => setBedrooms(e.target.value)}
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
                            value={bathrooms}
                            onChange={(e) => setBathrooms(e.target.value)}
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
                    </>
                  )}

                  {/* Additional Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Details
                    </label>
                    <textarea
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      placeholder="Add any important details or specific criteria for the report."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                    />
                  </div>

                  {/* Info Box */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTool === 'market-finder'
                        ? '📊 Your report will include: Population statistics, median household income, age distribution, education levels, and employment data'
                        : '📊 Your report will include: Average rent prices, vacancy rates, year-over-year trends, and rental market forecasts'}
                    </p>
                  </div>
                </fieldset>

                {/* Loading State */}
                {isGenerating && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Generating your report...
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Estimated time: 3-5 minutes. You'll receive an email with your report shortly.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success State */}
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
                {!isGenerating && !generatedReportUrl && (
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                    >
                      Generate Report
                    </button>
                  </div>
                )}

                {/* New Report Button */}
                {generatedReportUrl && !isGenerating && (
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
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

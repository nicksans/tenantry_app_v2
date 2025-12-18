import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, ChevronDown, FileText, Download, Loader2, CheckCircle, Sparkles, Info } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import AddressAutocomplete from './AddressAutocomplete';
import { supabase } from '../lib/supabase';

type ReportType = 'rental' | 'comparative' | 'rental-market' | null;
type LocationType = 'state' | 'city' | 'zip';

interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: typeof TrendingUp;
}

interface MarketReportsProps {
  userId?: string;
  onNavigateToSupport?: () => void;
  hideTitle?: boolean;
}

export default function MarketReports({ userId, onNavigateToSupport, hideTitle = false }: MarketReportsProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);
  const [locationType, setLocationType] = useState<LocationType>('state');
  const [locationValue, setLocationValue] = useState('');
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [numberOfUnits, setNumberOfUnits] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [sqft, setSqft] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [condition, setCondition] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [maxDistance, setMaxDistance] = useState('1.00');
  const [rentalStrategy, setRentalStrategy] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  
  // New fields for Rental Market Finder
  const [region, setRegion] = useState('');
  const [marketType, setMarketType] = useState('');
  const [proximityCity, setProximityCity] = useState('');
  const [primaryObjective, setPrimaryObjective] = useState('');
  const [minPurchasePrice, setMinPurchasePrice] = useState('');
  const [maxPurchasePrice, setMaxPurchasePrice] = useState('');

  // Fetch user email and first name on mount
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

  const reportOptions: ReportOption[] = [
    {
      id: 'rental',
      title: 'Rental Market Analysis',
      description: 'Get comprehensive insights into any rental market (state, city, or zip) with accurate, up-to-date data.',
      icon: DollarSign
    },
    {
      id: 'comparative',
      title: 'Comparative Market Analysis',
      description: 'Generate professional CMAs for any address, without needing a realtor or MLS access.',
      icon: TrendingUp
    },
    {
      id: 'rental-market',
      title: 'Rental Market Finder',
      description: 'Find emerging rental markets that meet your criteria for cashflow and appreciation.',
      icon: Users
    }
  ];

  // Generate a unique report ID for file naming
  const generateReportId = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `report_${timestamp}_${randomStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Start loading state
    setIsGenerating(true);
    setGeneratedReportUrl(null);
    
    // Generate a unique ID for this report
    const reportId = generateReportId();
    
    let reportData: any;
    let webhookUrl: string;
    let filenameSuffix: string;
    
    if (selectedReport === 'comparative') {
      // CMA Report - use address
      webhookUrl = 'https://tenantry.app.n8n.cloud/webhook/cma';
      filenameSuffix = 'cma';
      
      reportData = {
        owner_id: userId,
        user_email: userEmail,
        first_name: firstName,
        report_id: reportId,
        doc_type: 'cma',
        reportType: selectedReport,
        address,
        propertyType,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
        numberOfUnits: (propertyType === 'multi-family' || propertyType === 'apartment') ? numberOfUnits : undefined,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
        sqft: sqft ? parseInt(sqft) : undefined,
        lotSize: lotSize ? parseInt(lotSize) : undefined,
        condition: condition || undefined,
        maxDistance: parseFloat(maxDistance),
        additionalDetails
      };
    } else if (selectedReport === 'rental-market') {
      // Rental Market Finder - use new fields
      webhookUrl = 'https://tenantry.app.n8n.cloud/webhook/market-finder-report';
      filenameSuffix = 'rentalmarketfinder';
      
      reportData = {
        owner_id: userId,
        user_email: userEmail,
        first_name: firstName,
        report_id: reportId,
        doc_type: 'rental_market_finder',
        reportType: selectedReport,
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
      // Rental Market Analysis Report - use location type
      webhookUrl = 'https://tenantry.app.n8n.cloud/webhook/rental-market-analysis';
      filenameSuffix = 'rentalmarketreport';
      
      // Parse city and state if location type is city
      let city = '';
      let state = '';
      
      if (locationType === 'city' && locationValue) {
        // Format is typically "City, ST" or "City, State"
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
        reportType: selectedReport,
        locationType,
        locationValue,
        // Add separate city and state fields when location type is city
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
    
    console.log('Sending data to n8n webhook:', reportData);
    
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
        
        // Get the proper download URL from Supabase Storage
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
    setSelectedReport(null);
    setLocationType('state');
    setLocationValue('');
    setAddress('');
    setPropertyType('');
    setRentalStrategy('');
    setBedrooms('');
    setBathrooms('');
    setNumberOfUnits('');
    setYearBuilt('');
    setSqft('');
    setLotSize('');
    setCondition('');
    setMaxDistance('1.00');
    setAdditionalDetails('');
    setIsGenerating(false);
    setGeneratedReportUrl(null);
    // Reset new Rental Market Finder fields
    setRegion('');
    setMarketType('');
    setProximityCity('');
    setPrimaryObjective('');
    setMinPurchasePrice('');
    setMaxPurchasePrice('');
  };

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

  return (
    <div className={hideTitle ? '' : 'p-6'}>
      <div className={hideTitle ? '' : 'max-w-4xl mx-auto'}>
        {!hideTitle && (
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Pro Tools</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Generate detailed, downloadable market research reports for any location
            </p>
          </div>
        )}

      {!selectedReport ? (
        // Report Type Selection
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedReport(option.id)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[180px] hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-left relative"
              >
                <div className="absolute top-4 right-4">
                  <span className="bg-brand-500 text-white text-xs font-semibold px-2 py-1 rounded">
                    PRO
                  </span>
                </div>
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
              </button>
            );
          })}
        </div>
      ) : (
        // Report Form
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {reportOptions.find(r => r.id === selectedReport)?.title}
              </h2>
            </div>
            <button
              onClick={resetForm}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Change Report Type
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={isGenerating || !!generatedReportUrl} className="space-y-6">
            
            {/* Conditional Field: Address for CMA, Location Type for others */}
            {selectedReport === 'comparative' ? (
              <>
                {/* Address field for CMA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Property Address
                  </label>
                  <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    placeholder="e.g., 123 Main St, Wilmington, NC 28401"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                {/* Radius field for CMA */}
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
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(e.target.value)}
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
              </>
            ) : selectedReport === 'rental-market' ? (
              // Rental Market Finder fields
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
              </>
            ) : (
              // Location Type fields for Rental Market Analysis Report
              <>
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
                        // Clear location value when switching types
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
              </>
            )}

            {/* Rental Strategy Dropdown - For Rental Market Analysis and Rental Market Finder */}
            {(selectedReport === 'rental' || selectedReport === 'rental-market') && (
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
            )}

            {/* Property Type Dropdown */}
            {selectedReport === 'rental-market' ? (
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
            ) : (
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
            )}

            {/* Number of Units - Shown for Multi-Family and Apartment (except Rental Market Finder) */}
            {(propertyType === 'multi-family' || propertyType === 'apartment') && selectedReport !== 'rental-market' && (
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
                      // Multi-Family: only 2, 3, 4
                      <>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </>
                    ) : (
                      // Apartment: 5 and up
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

            {/* Bedrooms - Hidden for Rental Market Finder */}
            {selectedReport !== 'rental-market' && (
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
            )}

            {/* Bathrooms - Hidden for Rental Market Finder */}
            {selectedReport !== 'rental-market' && (
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
            )}

            {/* CMA-specific fields */}
            {selectedReport === 'comparative' && (
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

                {/* Square Footage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Square Footage <span className="text-xs text-gray-500 dark:text-gray-400">(per unit)</span>
                  </label>
                  <input
                    type="number"
                    value={sqft}
                    onChange={(e) => setSqft(e.target.value)}
                    placeholder="e.g., 2000"
                    min="1"
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
                placeholder="Add any important details such as recent renovations or deferred maintenance. This will improve report accuracy."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
              />
            </div>

            {/* Report-specific fields */}
            {selectedReport === 'rental' && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📊 Your report will include: Average rent prices, vacancy rates, year-over-year trends, and rental market forecasts
                </p>
              </div>
            )}

            {selectedReport === 'comparative' && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📊 Your report will include: Property value comparisons, market appreciation rates, days on market, and price per square foot analysis
                </p>
              </div>
            )}

            {selectedReport === 'rental-market' && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📊 Your report will include: Population statistics, median household income, age distribution, education levels, and employment data
                </p>
              </div>
            )}
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
                  type="button"
                  className="px-6 py-3 border border-brand-500 dark:border-brand-400 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors font-medium"
                >
                  View Sample Report
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                >
                  Generate Report
                </button>
              </div>
            )}

            {/* New Report Button (after success) */}
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
        </div>
      )}
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, ChevronDown, FileText, Download, Trash2, Loader2, CheckCircle, Sparkles, AlertTriangle, X } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import AddressAutocomplete from './AddressAutocomplete';
import { supabase } from '../lib/supabase';

type ReportType = 'rental' | 'comparative' | 'demographics' | null;
type LocationType = 'state' | 'city' | 'zip';

interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: typeof TrendingUp;
}

interface SavedReport {
  id: string;
  reportType: string;
  location: string;
  locationType: string;
  createdAt: Date;
  downloadUrl: string;
}

interface MarketReportsProps {
  userId?: string;
  onNavigateToEmma?: () => void;
}

export default function MarketReports({ userId, onNavigateToEmma }: MarketReportsProps) {
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Fetch user email on mount
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUserEmail();
  }, []);

  // Load saved reports from localStorage on mount
  useEffect(() => {
    if (userId) {
      const storageKey = `market_reports_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert date strings back to Date objects
          const reports = parsed.map((report: any) => ({
            ...report,
            createdAt: new Date(report.createdAt)
          }));
          setSavedReports(reports);
        } catch (error) {
          console.error('Error loading saved reports:', error);
        }
      }
    }
  }, [userId]);

  // Save reports to localStorage whenever they change
  useEffect(() => {
    if (userId && savedReports.length > 0) {
      const storageKey = `market_reports_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(savedReports));
    }
  }, [savedReports, userId]);

  const reportOptions: ReportOption[] = [
    {
      id: 'rental',
      title: 'Rental Market Report',
      description: 'Generate a detailed rental market analysis for any state, city, or zip code.',
      icon: DollarSign
    },
    {
      id: 'comparative',
      title: 'Comparative Market Analysis',
      description: 'Run a comparative market analysis for any address to see comps and determine property value.',
      icon: TrendingUp
    },
    {
      id: 'demographics',
      title: 'Neighborhood Demographics',
      description: 'Detailed demographic information including population, income, and household data',
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
    
    // Get the report type display name
    const reportTypeDisplay = reportOptions.find(r => r.id === selectedReport)?.title || 'Report';
    
    let reportData: any;
    let webhookUrl: string;
    let filenameSuffix: string;
    let displayLocation: string;
    let locationTypeDisplay: string;
    
    if (selectedReport === 'comparative') {
      // CMA Report - use address
      webhookUrl = 'https://tenantry.app.n8n.cloud/webhook/cma';
      filenameSuffix = 'cma';
      displayLocation = address;
      locationTypeDisplay = 'Address';
      
      reportData = {
        owner_id: userId,
        user_email: userEmail,
        report_id: reportId,
        doc_type: 'market_report',
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
    } else {
      // Rental Market Report - use location type
      webhookUrl = 'https://tenantry.app.n8n.cloud/webhook/rental-market-analysis';
      filenameSuffix = 'rentalmarketreport';
      displayLocation = locationValue;
      locationTypeDisplay = locationType === 'city' ? 'City' : locationType === 'state' ? 'State' : 'Zip Code';
      
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
        report_id: reportId,
        doc_type: 'market_report',
        reportType: selectedReport,
        locationType,
        locationValue,
        // Add separate city and state fields when location type is city
        ...(locationType === 'city' && {
          city,
          state
        }),
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
        
        // Add the report to saved reports
        const newReport: SavedReport = {
          id: reportId,
          reportType: reportTypeDisplay,
          location: displayLocation,
          locationType: locationTypeDisplay,
          createdAt: new Date(),
          downloadUrl
        };
        
        setSavedReports(prev => [newReport, ...prev]);
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
  };

  const handleDownloadReport = (report: SavedReport) => {
    // Open the download URL in a new tab
    window.open(report.downloadUrl, '_blank');
  };

  const handleDeleteReport = (reportId: string) => {
    // Show confirmation UI
    setReportToDelete(reportId);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    
    try {
      console.log('Deleting report with ID:', reportToDelete);
      console.log('Owner ID:', userId);
      
      // Call the n8n webhook to delete the report
      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/delete-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_id: reportToDelete,
          owner_id: userId,
        }),
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Remove the report from saved reports
      setSavedReports(prev => {
        const updated = prev.filter(report => report.id !== reportToDelete);
        // Update localStorage immediately
        if (userId) {
          const storageKey = `market_reports_${userId}`;
          if (updated.length === 0) {
            localStorage.removeItem(storageKey);
          } else {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          }
        }
        return updated;
      });
      
      // Clear the deletion state
      setReportToDelete(null);
      
    } catch (error) {
      console.error('Error deleting report:', error);
      setDeleteError('Failed to delete report. Please try again.');
      setTimeout(() => setDeleteError(null), 7000);
      setReportToDelete(null);
    }
  };

  const cancelDeleteReport = () => {
    setReportToDelete(null);
  };

  const getReportIcon = (reportType: string) => {
    if (reportType.includes('Rental')) return DollarSign;
    if (reportType.includes('Demographics')) return Users;
    return TrendingUp;
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Market Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">
        Generate detailed market research reports for any location
        </p>
      </div>

      {!selectedReport ? (
        // Report Type Selection
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedReport(option.id)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all text-left"
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

                {/* Maximum Distance field for CMA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Distance for Comparables (miles)
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Select the maximum distance to find comparable properties
                  </p>
                </div>
              </>
            ) : (
              // Location Type fields for Rental Market Report
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
                      className="w-full pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  )}
                </div>
              </>
            )}

            {/* Property Type Dropdown */}
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
                  <option value="single-family">Single Family</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="manufactured">Manufactured</option>
                  <option value="multi-family">Multi-Family (2-4 units)</option>
                  <option value="apartment">Apartment (5+ units)</option>
                  <option value="land">Land</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Number of Units - Shown for Multi-Family and Apartment */}
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

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bedrooms
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
                Bathrooms
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
                    Square Footage
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

                {/* Lot Size (sqft) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lot Size (sqft)
                  </label>
                  <input
                    type="number"
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                    placeholder="e.g., 8000"
                    min="1"
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

            {selectedReport === 'demographics' && (
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
                      Estimated time: ~2 minutes. Please don't close this window.
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
                          Tip: Your report has been added to Emma's knowledge base. 
                          <button 
                            type="button"
                            className="font-semibold underline hover:no-underline ml-1"
                            onClick={() => onNavigateToEmma?.()}
                          >
                            Ask her anything about your report!
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

      {/* Your Market Reports Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Your Market Reports</h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {savedReports.length} report{savedReports.length !== 1 ? 's' : ''} saved
          </span>
        </div>

        {/* Delete Confirmation Message */}
        {reportToDelete && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Delete Report?
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  Are you sure you want to delete this report? Emma will also forget its contents. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={cancelDeleteReport}
                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteReport}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Delete Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Error Message */}
        {deleteError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-100">Delete failed</h4>
              <p className="text-sm text-red-700 dark:text-red-300">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="flex-shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {savedReports.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
            <p>No reports generated yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedReports.map((report) => {
              const ReportIcon = getReportIcon(report.reportType);
              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ReportIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {report.reportType}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {report.locationType} • {report.location} • {report.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownloadReport(report)}
                      className="p-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                      title="Download report"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Delete report"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


import { useState } from 'react';
import { X, ChevronRight, ChevronDown, TrendingUp, Loader2 } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Variable {
  id: string;
  name: string;
  description?: string;
}

interface VariableCategory {
  id: string;
  name: string;
  count: number;
  variables: Variable[];
}

interface LocationWithType {
  value: string;
  type: 'city' | 'zip' | 'state';
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number; // Dynamic keys for each location
}

export default function FreeFormTool() {
  const [selectedLocations, setSelectedLocations] = useState<LocationWithType[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [locationType, setLocationType] = useState<'city' | 'zip' | 'state'>('zip');
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [locationsWithNoData, setLocationsWithNoData] = useState<string[]>([]);
  
  // Paid variables state
  const [rentalMarketExpanded, setRentalMarketExpanded] = useState(false);
  const [saleMarketExpanded, setSaleMarketExpanded] = useState(false);
  const [rentalFilterType, setRentalFilterType] = useState<'propertyType' | 'bedrooms'>('propertyType');
  const [rentalPropertyType, setRentalPropertyType] = useState<string>('All');
  const [rentalBedrooms, setRentalBedrooms] = useState<number | null>(null);
  const [saleFilterType, setSaleFilterType] = useState<'propertyType' | 'bedrooms'>('propertyType');
  const [salePropertyType, setSalePropertyType] = useState<string>('All');
  const [saleBedrooms, setSaleBedrooms] = useState<number | null>(null);

  // Property type options
  const propertyTypes = [
    'All',
    'Single-Family',
    'Townhouse',
    'Condo',
    'Multi-Family (2-4 units)',
    'Apartment (5+ units)',
    'Land',
    'Manufactured'
  ];

  // Bedroom options
  const bedroomOptions = [1, 2, 3, 4, 5, 6];

  // Paid variable categories for Rental Market
  const rentalMarketVariables: Variable[] = [
    { id: 'rentalData.history[month].averageRent', name: 'Average Rent' },
    { id: 'rentalData.history[month].medianRent', name: 'Median Rent' },
    { id: 'rentalData.history[month].averageRentPerSquareFoot', name: 'Average Rent per Sq Ft' },
    { id: 'rentalData.history[month].medianRentPerSquareFoot', name: 'Median Rent per Sq Ft' },
    { id: 'rentalData.history[month].newListings', name: 'New Rental Listings' },
    { id: 'rentalData.history[month].totalListings', name: 'Total Rental Listings' },
    { id: 'rentalData.history[month].averageDaysOnMarket', name: 'Average Days on Market (Rentals)' },
    { id: 'rentalData.history[month].medianDaysOnMarket', name: 'Median Days on Market (Rentals)' },
  ];

  // Paid variable categories for Sale Market
  const saleMarketVariables: Variable[] = [
    { id: 'saleData.history[month].averagePrice', name: 'Average Sale Price' },
    { id: 'saleData.history[month].medianPrice', name: 'Median Sale Price' },
    { id: 'saleData.history[month].averagePricePerSquareFoot', name: 'Average Price per Sq Ft' },
    { id: 'saleData.history[month].medianPricePerSquareFoot', name: 'Median Price per Sq Ft' },
    { id: 'saleData.history[month].newListings', name: 'New Listings' },
    { id: 'saleData.history[month].totalListings', name: 'Total Active Listings' },
    { id: 'saleData.history[month].averageDaysOnMarket', name: 'Average Days on Market' },
    { id: 'saleData.history[month].medianDaysOnMarket', name: 'Median Days on Market' },
  ];

  // Variable categories with actual counts
  const variableCategories: VariableCategory[] = [
    {
      id: 'demographics',
      name: 'Demographics',
      count: 6,
      variables: [
        { id: 'Count_Person', name: 'Total Population', description: 'Total number of people' },
        { id: 'Count_Person_Male', name: 'Male Population', description: 'Total male population' },
        { id: 'Count_Person_Female', name: 'Female Population', description: 'Total female population' },
        { id: 'Median_Age_Person', name: 'Median Age', description: 'Median age of population' },
        { id: 'Count_Person_PerArea', name: 'Population Density', description: 'People per square mile' },
        { id: 'Count_Household', name: 'Total Households', description: 'Number of households' },
      ]
    },
    {
      id: 'economy',
      name: 'Economy',
      count: 3,
      variables: [
        { id: 'Median_Income_Household', name: 'Median Household Income' },
        { id: 'UnemploymentRate_Person', name: 'Unemployment Rate' },
        { id: 'gdp', name: 'GDP Per Capita' },
      ]
    },
    {
      id: 'education',
      name: 'Education',
      count: 4,
      variables: [
        { id: 'high_school_grad', name: 'High School Graduation Rate' },
        { id: 'bachelors_degree', name: "Bachelor's Degree Attainment" },
        { id: 'enrollment', name: 'School Enrollment' },
        { id: 'student_teacher_ratio', name: 'Student-Teacher Ratio' },
      ]
    },
    {
      id: 'environment',
      name: 'Environment',
      count: 3,
      variables: [
        { id: 'air_quality', name: 'Air Quality Index' },
        { id: 'walkability', name: 'Walkability Score' },
        { id: 'green_space', name: 'Green Space Percentage' },
      ]
    },
    {
      id: 'health',
      name: 'Health',
      count: 3,
      variables: [
        { id: 'life_expectancy', name: 'Life Expectancy' },
        { id: 'health_insurance', name: 'Health Insurance Coverage' },
        { id: 'hospitals', name: 'Hospitals Per Capita' },
      ]
    },
    {
      id: 'housing',
      name: 'Housing',
      count: 9,
      variables: [
        { id: 'median_home_value', name: 'Median Home Value' },
        { id: 'Monthly_Median_GrossRent_HousingUnit', name: 'Median Rent' },
        { id: 'Count_HousingUnit', name: 'Total Housing Units' },
        { id: 'Count_HousingUnit_WithMortgage_OccupiedHousingUnit_OwnerOccupied', name: 'Housing With A Mortgage' },
        { id: 'Count_HousingUnit_WithoutMortgage_OccupiedHousingUnit_OwnerOccupied', name: 'Housing Without A Mortgage' },
        { id: 'Count_HousingUnit_VacantHousingUnit', name: 'Vacant Housing Units' },
        { id: 'Count_HousingUnit_OwnerOccupied', name: 'Owner-Occupied Housing Units' },
        { id: 'Count_HousingUnit_RenterOccupied', name: 'Renter-Occupied Housing Units' },
        { id: 'new_construction', name: 'New Construction Permits' },
      ]
    },
    {
      id: 'crime',
      name: 'Crime',
      count: 4,
      variables: [
        { id: 'Count_CriminalActivities_CombinedCrime', name: 'Total Criminal Activity' },
        { id: 'Count_CriminalActivities_ViolentCrime', name: 'Violent Crime' },
        { id: 'Count_CriminalActivities_Burglary', name: 'Burglaries' },
        { id: 'Count_CriminalActivities_Robbery', name: 'Robberies' },
      ]
    },
  ];

  // Auto-add location when user selects from autocomplete
  const handleLocationChange = (value: string) => {
    setLocationInput(value);
    // If there's a value and it's not already in the list, add it automatically
    if (value && selectedLocations.length < 3) {
      const alreadyExists = selectedLocations.some(loc => loc.value === value);
      if (!alreadyExists) {
        const newLocation: LocationWithType = {
          value: value,
          type: locationType
        };
        setSelectedLocations([...selectedLocations, newLocation]);
        // Clear the input after adding
        setTimeout(() => setLocationInput(''), 100);
      }
    }
  };

  const handleRemoveLocation = (location: LocationWithType) => {
    setSelectedLocations(selectedLocations.filter(l => l.value !== location.value));
  };

  const handleGenerateReport = async () => {
    if (selectedLocations.length === 0 || !selectedVariable) {
      alert('Please select at least one location and one variable');
      return;
    }

    setIsGenerating(true);
    setShowResults(false);

    try {
      // Check if this is a rentcast (paid) variable
      const isRentcastVariable = selectedVariable.id.includes('rentalData.history') || 
                                  selectedVariable.id.includes('saleData.history');
      
      // Prepare the request body
      const requestBody: any = {
        locationType: locationType,
        locations: selectedLocations.map(loc => loc.value),
        variable: {
          id: selectedVariable.id,
          name: selectedVariable.name,
          description: selectedVariable.description
        }
      };

      // Add rentcast-specific data if it's a paid variable
      if (isRentcastVariable) {
        requestBody.source = 'rentcast';
        
        // Determine if this is rental or sale market
        const isRentalMarket = selectedVariable.id.includes('rentalData');
        
        // Add market type to the request
        requestBody.marketType = isRentalMarket ? 'Rental' : 'Sale';
        
        if (isRentalMarket) {
          // Only send the filter that's currently selected
          if (rentalFilterType === 'propertyType') {
            requestBody.propertyType = rentalPropertyType;
          } else {
            if (rentalBedrooms !== null) {
              requestBody.bedrooms = rentalBedrooms;
            }
          }
        } else {
          // Only send the filter that's currently selected
          if (saleFilterType === 'propertyType') {
            requestBody.propertyType = salePropertyType;
          } else {
            if (saleBedrooms !== null) {
              requestBody.bedrooms = saleBedrooms;
            }
          }
        }
      }

      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/free-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to generate report: ${response.status} ${response.statusText}`);
      }

      // Get response as text first to see what we're getting
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 500)); // Log first 500 chars
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        throw new Error('Webhook returned empty response. The n8n workflow may need to be updated to handle this request.');
      }
      
      // Try to parse it as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        console.error('Response text:', responseText);
        throw new Error('Invalid JSON response from webhook. Check n8n workflow configuration.');
      }
      
      console.log('Report generated:', data);
      
      // Process the data for the chart
      const { processedData, noDataLocations } = processChartData(data);
      setChartData(processedData);
      setLocationsWithNoData(noDataLocations);
      setShowResults(true);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const processChartData = (apiData: any[]): { processedData: ChartDataPoint[], noDataLocations: string[] } => {
    console.log('🔍 Processing data:', apiData);
    
    // Extract location data from the API response
    const locationDataMap: { [date: string]: ChartDataPoint } = {};
    const locationsFound = new Set<string>();
    const noDataLocationsSet = new Set<string>();
    
    apiData.forEach((locationData, index) => {
      console.log(`📊 Processing location ${index}:`, locationData);
      
      // Get the actual location name from our selected locations array (by index)
      const actualLocationName = selectedLocations[index]?.value;
      
      if (!actualLocationName) {
        console.log('⚠️ No location found at index', index);
        return;
      }
      
      const byVariable = locationData.byVariable;
      
      // Check if there's any data for this variable
      if (!byVariable || Object.keys(byVariable).length === 0) {
        console.log('⚠️ No variable data found for location', actualLocationName);
        noDataLocationsSet.add(actualLocationName);
        return;
      }
      
      const variableKey = Object.keys(byVariable)[0]; // Get the variable key (e.g., "Count_Person")
      console.log('🔑 Variable key:', variableKey);
      
      const byEntity = byVariable[variableKey]?.byEntity;
      
      // Check if there are any entities
      if (!byEntity || Object.keys(byEntity).length === 0) {
        console.log('⚠️ No entity data found for', actualLocationName);
        noDataLocationsSet.add(actualLocationName);
        return;
      }
      
      console.log('🏠 Entities:', Object.keys(byEntity));
      
      // Get the first (and should be only) entity key
      const entityKey = Object.keys(byEntity)[0];
      console.log('📍 Using location name:', actualLocationName, 'for entity:', entityKey);
      
      const orderedFacets = byEntity[entityKey].orderedFacets;
      
      // Check if this location has observations
      if (!orderedFacets || orderedFacets.length === 0 || !orderedFacets[0].observations || orderedFacets[0].observations.length === 0) {
        console.log(`⚠️ No observations for ${actualLocationName}`);
        noDataLocationsSet.add(actualLocationName);
        return;
      }
      
      // Use the first facet's observations
      const observations = orderedFacets[0].observations;
      console.log(`📈 Observations for ${actualLocationName}:`, observations.length);
      locationsFound.add(actualLocationName);
      
      observations.forEach((obs: any) => {
        if (!locationDataMap[obs.date]) {
          locationDataMap[obs.date] = { date: obs.date };
        }
        // Use the actual location name (e.g., "New Haven, CT") instead of the geoId
        locationDataMap[obs.date][actualLocationName] = obs.value;
      });
    });
    
    // Check for locations that were requested but not found in the response
    selectedLocations.forEach(loc => {
      if (!locationsFound.has(loc.value)) {
        console.log(`⚠️ No data found for requested location: ${loc.value}`);
        noDataLocationsSet.add(loc.value);
      }
    });
    
    // Convert to array and sort by date
    const result = Object.values(locationDataMap).sort((a, b) => 
      parseInt(a.date) - parseInt(b.date)
    );
    
    const noDataLocations = Array.from(noDataLocationsSet);
    
    console.log('✅ Processed chart data:', result);
    console.log('⚠️ Locations with no data:', noDataLocations);
    
    return { processedData: result, noDataLocations };
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleVariableSelect = (variable: Variable) => {
    setSelectedVariable(variable);
    // Reset chart when selecting a new variable
    setShowResults(false);
    setChartData(null);
    setLocationsWithNoData([]);
  };

  // Check if the selected variable is an income/currency variable
  const isCurrencyVariable = (variableId: string) => {
    const currencyVariables = [
      'Median_Income_Household', 
      'median_income', 
      'gdp',
      'Monthly_Median_GrossRent_HousingUnit',
      'median_home_value'
    ];
    return currencyVariables.includes(variableId);
  };

  // Format value as currency if needed
  const formatValue = (value: number) => {
    if (selectedVariable && isCurrencyVariable(selectedVariable.id)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString();
  };

  const filteredCategories = variableCategories.map(category => ({
    ...category,
    variables: category.variables.filter(v => 
      v.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.variables.length > 0);

  return (
    <div className="space-y-6">
      {/* Location Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Locations to Compare (up to 3)
        </label>
        
        {/* Location Type Toggle */}
        <div className="mb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLocationType('zip')}
              disabled={selectedLocations.length > 0}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                locationType === 'zip'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${
                selectedLocations.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Zip Code
            </button>
            <button
              type="button"
              onClick={() => setLocationType('city')}
              disabled={selectedLocations.length > 0}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                locationType === 'city'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${
                selectedLocations.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              City
            </button>
            <button
              type="button"
              onClick={() => setLocationType('state')}
              disabled={selectedLocations.length > 0}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                locationType === 'state'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${
                selectedLocations.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              State
            </button>
          </div>
          {selectedLocations.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Remove all locations to switch between location types
            </p>
          )}
        </div>
        
        {/* Selected Locations */}
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedLocations.map((location) => (
            <div
              key={location.value}
              className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-lg border border-brand-200 dark:border-brand-800"
            >
              <span className="text-xs text-brand-600 dark:text-brand-400 font-medium uppercase">
                {location.type}:
              </span>
              <span className="text-sm font-medium">{location.value}</span>
              <button
                onClick={() => handleRemoveLocation(location)}
                className="hover:bg-brand-100 dark:hover:bg-brand-800 rounded-full p-0.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {selectedLocations.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No locations selected yet
            </p>
          )}
        </div>

        {/* Add Location Input */}
        {selectedLocations.length < 3 && (
          <div>
              <LocationAutocomplete
              value={locationInput}
              onChange={handleLocationChange}
              locationType={locationType}
              placeholder={
                locationType === 'zip' 
                  ? 'Enter zip code (e.g., 28401)' 
                  : locationType === 'city'
                  ? 'Enter city (e.g., Wilmington, NC)'
                  : 'Enter state (e.g., North Carolina)'
              }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6">
        {/* Left Sidebar - Variable Selection */}
        <div className="w-80 shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter variables"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
              />
            </div>

            {/* Variable Categories */}
            <div className="max-h-[600px] overflow-y-auto">
              {/* Paid Variables Section - Only visible when zip code is selected */}
              {locationType === 'zip' && (
                <>
                  {/* Paid Section Header */}
                  <div className="p-3 bg-brand-50 dark:bg-brand-900/20 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wide">
                        Premium Market Data
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-brand-500 text-white rounded-full font-medium">
                        Upgrade
                      </span>
                    </div>
                  </div>

                  {/* Rental Market Section */}
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setRentalMarketExpanded(!rentalMarketExpanded)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left bg-gradient-to-r from-brand-50/50 to-transparent dark:from-brand-900/10"
                    >
                      <div className="flex items-center gap-2">
                        {rentalMarketExpanded ? (
                          <ChevronDown className="w-4 h-4 text-brand-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-brand-500" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          Rental Market
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({rentalMarketVariables.length})
                      </span>
                    </button>

                    {rentalMarketExpanded && (
                      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                        {/* Rental Market Filters */}
                        <div className="p-3 space-y-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {/* Filter Type Toggle */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Filter by:
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setRentalFilterType('propertyType')}
                                className={`flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                                  rentalFilterType === 'propertyType'
                                    ? 'bg-brand-500 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Property Type
                              </button>
                              <button
                                onClick={() => setRentalFilterType('bedrooms')}
                                className={`flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                                  rentalFilterType === 'bedrooms'
                                    ? 'bg-brand-500 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Bedrooms
                              </button>
                            </div>
                          </div>
                          
                          {/* Property Type Options */}
                          {rentalFilterType === 'propertyType' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Select Property Type
                              </label>
                              <select
                                value={rentalPropertyType}
                                onChange={(e) => setRentalPropertyType(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                              >
                                {propertyTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          {/* Bedroom Options */}
                          {rentalFilterType === 'bedrooms' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Select Bedrooms
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setRentalBedrooms(null)}
                                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                                    rentalBedrooms === null
                                      ? 'bg-brand-500 text-white shadow-sm'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  All
                                </button>
                                {bedroomOptions.map(num => (
                                  <button
                                    key={num}
                                    onClick={() => setRentalBedrooms(num)}
                                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                                      rentalBedrooms === num
                                        ? 'bg-brand-500 text-white shadow-sm'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Rental Variables */}
                        {rentalMarketVariables.map((variable) => (
                          <button
                            key={variable.id}
                            onClick={() => handleVariableSelect(variable)}
                            className={`w-full text-left px-3 py-2 pl-8 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l-4 ${
                              selectedVariable?.id === variable.id
                                ? 'border-brand-500 bg-gray-100 dark:bg-gray-800'
                                : 'border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {variable.name}
                              </div>
                              <span className="text-xs px-1.5 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
                                Pro
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sale Market Section */}
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setSaleMarketExpanded(!saleMarketExpanded)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left bg-gradient-to-r from-brand-50/50 to-transparent dark:from-brand-900/10"
                    >
                      <div className="flex items-center gap-2">
                        {saleMarketExpanded ? (
                          <ChevronDown className="w-4 h-4 text-brand-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-brand-500" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          Sale Market
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({saleMarketVariables.length})
                      </span>
                    </button>

                    {saleMarketExpanded && (
                      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                        {/* Sale Market Filters */}
                        <div className="p-3 space-y-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {/* Filter Type Toggle */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Filter by:
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSaleFilterType('propertyType')}
                                className={`flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                                  saleFilterType === 'propertyType'
                                    ? 'bg-brand-500 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Property Type
                              </button>
                              <button
                                onClick={() => setSaleFilterType('bedrooms')}
                                className={`flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                                  saleFilterType === 'bedrooms'
                                    ? 'bg-brand-500 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Bedrooms
                              </button>
                            </div>
                          </div>
                          
                          {/* Property Type Options */}
                          {saleFilterType === 'propertyType' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Select Property Type
                              </label>
                              <select
                                value={salePropertyType}
                                onChange={(e) => setSalePropertyType(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                              >
                                {propertyTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          {/* Bedroom Options */}
                          {saleFilterType === 'bedrooms' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Select Bedrooms
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setSaleBedrooms(null)}
                                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                                    saleBedrooms === null
                                      ? 'bg-brand-500 text-white shadow-sm'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  All
                                </button>
                                {bedroomOptions.map(num => (
                                  <button
                                    key={num}
                                    onClick={() => setSaleBedrooms(num)}
                                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                                      saleBedrooms === num
                                        ? 'bg-brand-500 text-white shadow-sm'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sale Variables */}
                        {saleMarketVariables.map((variable) => (
                          <button
                            key={variable.id}
                            onClick={() => handleVariableSelect(variable)}
                            className={`w-full text-left px-3 py-2 pl-8 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l-4 ${
                              selectedVariable?.id === variable.id
                                ? 'border-brand-500 bg-gray-100 dark:bg-gray-800'
                                : 'border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {variable.name}
                              </div>
                              <span className="text-xs px-1.5 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
                                Pro
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* Divider between Premium and Free variables (only show when zip is selected) */}
              {locationType === 'zip' && (
                <div className="border-t-4 border-gray-200 dark:border-gray-700 my-2"></div>
              )}
              
              {/* Free Variable Categories */}
              {filteredCategories.map((category) => (
                <div key={category.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expandedCategories.includes(category.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({category.variables.length})
                    </span>
                  </button>

                  {/* Variables List */}
                  {expandedCategories.includes(category.id) && (
                    <div className="bg-gray-50 dark:bg-gray-900">
                      {category.variables.map((variable) => (
                        <button
                          key={variable.id}
                          onClick={() => handleVariableSelect(variable)}
                          className={`w-full text-left px-3 py-2 pl-8 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l-4 ${
                            selectedVariable?.id === variable.id
                              ? 'border-brand-500 bg-gray-100 dark:bg-gray-800'
                              : 'border-transparent'
                          }`}
                        >
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {variable.name}
                          </div>
                          {variable.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {variable.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Chart Area */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {/* Header with Selected Variable and Display Results Button */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                {selectedVariable ? (
                  <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Selected variable:</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-full border border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium">{selectedVariable.name}</span>
                    <button
                      onClick={() => setSelectedVariable(null)}
                      className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Select a variable from the left panel
                  </span>
                )}
              </div>

              {/* Display Results Button - Always visible, only clickable when both selected */}
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating || selectedLocations.length === 0 || !selectedVariable}
                className={`px-6 py-2.5 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                  selectedLocations.length > 0 && selectedVariable && !isGenerating
                    ? 'bg-brand-500 hover:bg-brand-600 text-white cursor-pointer'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Display Results
                  </>
                )}
              </button>
            </div>

            {/* Chart Area */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 min-h-[600px] flex flex-col items-center justify-center">
              {!showResults && (selectedLocations.length === 0 || !selectedVariable) ? (
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Data to Display
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                    {selectedLocations.length === 0 && !selectedVariable
                      ? 'Select at least one location and one variable to view the comparison chart'
                      : selectedLocations.length === 0
                      ? 'Select at least one location to view the comparison chart'
                      : 'Select a variable from the left panel and click "Display Results"'}
                  </p>
                </div>
              ) : !showResults ? (
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 text-brand-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Ready to Generate
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                    Click "Display Results" to generate the comparison chart
                  </p>
                </div>
              ) : chartData && selectedVariable ? (
                <div className="w-full flex flex-col" style={{ height: '600px' }}>
                  <div className="mb-4 text-center">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {selectedVariable.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Comparing {selectedLocations.length} {selectedLocations.length === 1 ? 'location' : 'locations'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Data points: {chartData.length}
                    </p>
                  </div>
                  
                  {/* Warning for locations with no data */}
                  {locationsWithNoData.length > 0 && (
                    <div className="mb-4 mx-auto max-w-2xl">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              No data available for {locationsWithNoData.length} {locationsWithNoData.length === 1 ? 'location' : 'locations'}
                      </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                              {locationsWithNoData.join(', ')} - Data for this variable is not available for {locationsWithNoData.length === 1 ? 'this location' : 'these locations'}
                      </p>
                    </div>
                  </div>
                      </div>
                    </div>
                  )}

                  {/* Chart */}
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          width={100}
                          tickFormatter={(value) => {
                            if (selectedVariable && isCurrencyVariable(selectedVariable.id)) {
                              return `$${(value / 1000).toFixed(0)}k`;
                            }
                            return value.toLocaleString();
                          }}
                          label={{ 
                            value: selectedVariable.name, 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle' }
                          }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatValue(value), '']}
                          labelFormatter={(label) => `Year: ${label}`}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        {selectedLocations.map((location, index) => (
                          <Line
                            key={location.value}
                            type="monotone"
                            dataKey={location.value}
                            name={location.value}
                            stroke={['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Data Source */}
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    Source: <a href="https://datacommons.org" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-600 underline">Data Commons</a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


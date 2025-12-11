import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, TrendingUp, Loader2, ChevronUp } from 'lucide-react';
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

export default function TimelineCompare() {
  const [selectedLocations, setSelectedLocations] = useState<LocationWithType[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [locationType, setLocationType] = useState<'city' | 'zip' | 'state'>('zip');
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [locationsWithNoData, setLocationsWithNoData] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Paid variables state
  const [rentalFilterType, setRentalFilterType] = useState<'propertyType' | 'bedrooms'>('propertyType');
  const [rentalPropertyType, setRentalPropertyType] = useState<string>('All');
  const [rentalBedrooms, setRentalBedrooms] = useState<number | null>(null);
  const [saleFilterType, setSaleFilterType] = useState<'propertyType' | 'bedrooms'>('propertyType');
  const [salePropertyType, setSalePropertyType] = useState<string>('All');
  const [saleBedrooms, setSaleBedrooms] = useState<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    { id: 'averageRent', name: 'Average Rent' },
    { id: 'medianRent', name: 'Median Rent' },
    { id: 'averageRentPerSquareFoot', name: 'Average Rent per Sq Ft' },
    { id: 'medianRentPerSquareFoot', name: 'Median Rent per Sq Ft' },
    { id: 'newListings', name: 'New Rental Listings' },
    { id: 'totalListings', name: 'Total Rental Listings' },
    { id: 'averageDaysOnMarket', name: 'Average Days on Market (Rentals)' },
    { id: 'medianDaysOnMarket', name: 'Median Days on Market (Rentals)' },
  ];

  // Paid variable categories for Sale Market
  const saleMarketVariables: Variable[] = [
    { id: 'averagePrice', name: 'Average Sale Price' },
    { id: 'medianPrice', name: 'Median Sale Price' },
    { id: 'averagePricePerSquareFoot', name: 'Average Price per Sq Ft' },
    { id: 'medianPricePerSquareFoot', name: 'Median Price per Sq Ft' },
    { id: 'newListings', name: 'New Listings' },
    { id: 'totalListings', name: 'Total Active Listings' },
    { id: 'averageDaysOnMarket', name: 'Average Days on Market' },
    { id: 'medianDaysOnMarket', name: 'Median Days on Market' },
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
    setAiSummary('');

    try {
      // Check if this is a rentcast (paid) variable by checking if it's in our premium variable lists
      const isRentalMarketVariable = rentalMarketVariables.some(v => v.id === selectedVariable.id);
      const isSaleMarketVariable = saleMarketVariables.some(v => v.id === selectedVariable.id);
      const isRentcastVariable = isRentalMarketVariable || isSaleMarketVariable;
      
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

      // Add rentcast-specific data if it's a paid variable and location type is Zip
      if (isRentcastVariable && locationType === 'zip') {
        requestBody.source = 'rentcast';
        
        // Determine if this is rental or sale market
        const isRentalMarket = isRentalMarketVariable;
        
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
      
      // Generate AI summary if we have valid data
      if (processedData && processedData.length > 0) {
        generateAISummary(processedData);
      }
      
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

  const generateAISummary = async (data: ChartDataPoint[]) => {
    if (!data || data.length === 0 || !selectedVariable) {
      return;
    }

    setIsGeneratingSummary(true);
    setAiSummary('');

    try {
      // Prepare data summary for the AI
      const locationNames = selectedLocations.map(loc => loc.value);
      
      // Create a simplified data summary
      const dataSummary = locationNames.map(location => {
        const values = data.map(point => ({
          date: point.date,
          value: point[location] as number
        })).filter(v => v.value !== undefined);
        
        if (values.length === 0) return null;
        
        const firstValue = values[0].value;
        const lastValue = values[values.length - 1].value;
        const percentChange = ((lastValue - firstValue) / firstValue * 100).toFixed(1);
        
        return {
          location,
          firstValue,
          lastValue,
          percentChange,
          dataPoints: values.length,
          trend: parseFloat(percentChange) > 0 ? 'up' : parseFloat(percentChange) < 0 ? 'down' : 'flat'
        };
      }).filter(Boolean);

      // Create the prompt for the AI
      const prompt = `You are analyzing a timeline chart comparing "${selectedVariable.name}" across different locations.

Data Summary:
${dataSummary.map(d => `- ${d?.location}: ${d?.firstValue} (${data[0].date}) → ${d?.lastValue} (${data[data.length - 1].date}), ${d?.percentChange}% change, trending ${d?.trend}`).join('\n')}

Provide exactly 2 sentences that highlight 1-2 core insights from this data. Follow these rules:
- If the data is not available for all locations, mention that in the summary.
- Include a mention of the most recent data point, and how it's trending.
- Look at overall direction: Is each series trending up, down, or mostly flat?
- Compare series: Which locations are higher or lower? Who grew faster based on the percent change?
- Note any significant changes or patterns in the data
- Be neutral and factual - no speculation about causes
- Keep it concise and insightful`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: 'openai/gpt-4.1-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenRouter API error:', errorData);
        throw new Error('Failed to generate AI summary');
      }

      const result = await response.json();
      const summary = result.choices[0].message.content.trim();
      setAiSummary(summary);
      
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('Unable to generate AI summary at this time.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleVariableSelect = (variable: Variable) => {
    setSelectedVariable(variable);
    setIsDropdownOpen(false);
    // Reset chart when selecting a new variable
    setShowResults(false);
    setChartData(null);
    setLocationsWithNoData([]);
    setAiSummary('');
  };

  // Helper function to check if a variable is a Pro variable
  const isProVariable = (variable: Variable | null) => {
    if (!variable) return false;
    return rentalMarketVariables.some(v => v.id === variable.id) || 
           saleMarketVariables.some(v => v.id === variable.id);
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

  // Custom tooltip component with percentage change
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !chartData) return null;

    // Find the current data point index
    const currentIndex = chartData.findIndex(d => d.date === label);
    const previousData = currentIndex > 0 ? chartData[currentIndex - 1] : null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Year: {label}</p>
        {payload.map((entry: any, index: number) => {
          const currentValue = entry.value;
          const locationName = entry.name;
          
          // Calculate percentage change from previous period
          let percentChange = null;
          if (previousData && previousData[locationName] !== undefined) {
            const previousValue = previousData[locationName] as number;
            if (previousValue !== 0) {
              percentChange = ((currentValue - previousValue) / previousValue) * 100;
            }
          }

          return (
            <div key={index} className="mb-1 last:mb-0">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {locationName}
                </span>
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatValue(currentValue)}
                </p>
                {percentChange !== null && (
                  <p className={`text-xs font-medium ${
                    percentChange > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : percentChange < 0 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}% from previous
                  </p>
                )}
                {percentChange === null && currentIndex === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    First period
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredCategories = variableCategories.map(category => ({
    ...category,
    variables: category.variables.filter(v => 
      v.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.variables.length > 0);

  const filteredRentalVariables = rentalMarketVariables.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSaleVariables = saleMarketVariables.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Three Steps in a Row */}
      <div className="grid grid-cols-3 gap-0">
        {/* Step 1: Choose Geo-level */}
        <div className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
          <label className="block text-base font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">
            1. Choose Geo-level
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLocationType('zip')}
              disabled={selectedLocations.length > 0}
              className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                locationType === 'zip'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${
                selectedLocations.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Zip
            </button>
            <button
              type="button"
              onClick={() => {
                setLocationType('city');
                // Clear Pro variable if one is selected when switching away from Zip
                if (isProVariable(selectedVariable)) {
                  setSelectedVariable(null);
                }
              }}
              disabled={selectedLocations.length > 0}
              className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
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
              onClick={() => {
                setLocationType('state');
                // Clear Pro variable if one is selected when switching away from Zip
                if (isProVariable(selectedVariable)) {
                  setSelectedVariable(null);
                }
              }}
              disabled={selectedLocations.length > 0}
              className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Remove all locations to switch
            </p>
          )}
        </div>

        {/* Step 2: Enter Location */}
        <div className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
          <label className="block text-base font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">
            2. Enter Locations (up to 3)
          </label>
          {selectedLocations.length < 3 ? (
            <LocationAutocomplete
              value={locationInput}
              onChange={handleLocationChange}
              locationType={locationType}
              placeholder={
                locationType === 'zip' 
                  ? 'e.g., 28401' 
                  : locationType === 'city'
                  ? 'e.g., Miami, FL'
                  : 'e.g., California'
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          ) : (
            <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-center font-medium">
              Maximum 3 locations
            </div>
          )}
          
          {/* Selected Locations */}
          {selectedLocations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {selectedLocations.map((location) => (
                <div
                  key={location.value}
                  className="flex items-center gap-1 px-2 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded text-xs border border-brand-200 dark:border-brand-800"
                >
                  <span className="font-medium">{location.value}</span>
                  <button
                    onClick={() => handleRemoveLocation(location)}
                    className="hover:bg-brand-100 dark:hover:bg-brand-800 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Select Variables */}
        <div className="relative px-6 py-4" ref={dropdownRef}>
          <label className="block text-base font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">
            3. Select Variables
          </label>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <span className="flex-1 text-left truncate">
              {selectedVariable ? selectedVariable.name : 'Click to select variable'}
            </span>
            {isDropdownOpen ? (
              <ChevronUp className="w-5 h-5 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 flex-shrink-0" />
            )}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto">
              {/* Search Bar */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search variables..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm"
                />
              </div>

              <div className="p-2">
                {/* Premium Market Data - Only for Zip */}
                {locationType === 'zip' && (filteredRentalVariables.length > 0 || filteredSaleVariables.length > 0) && (
                  <>
                    {/* Rental Market */}
                    {filteredRentalVariables.length > 0 && (
                      <div className="mt-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                          Rental Market
                        </div>

                        {/* Rental Variables */}
                        {filteredRentalVariables.map((variable) => (
                          <button
                            key={variable.id}
                            onClick={() => handleVariableSelect(variable)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                              selectedVariable?.id === variable.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                          >
                            <span className="text-sm text-gray-900 dark:text-gray-100">{variable.name}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
                              Pro
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Sale Market */}
                    {filteredSaleVariables.length > 0 && (
                      <div className="mt-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                          Sale Market
                        </div>

                        {/* Sale Variables */}
                        {filteredSaleVariables.map((variable) => (
                          <button
                            key={variable.id}
                            onClick={() => handleVariableSelect(variable)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                              selectedVariable?.id === variable.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                          >
                            <span className="text-sm text-gray-900 dark:text-gray-100">{variable.name}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
                              Pro
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="border-t-2 border-gray-200 dark:border-gray-700 my-2"></div>
                  </>
                )}

                {/* Free Variables */}
                {filteredCategories.map((category) => (
                  <div key={category.id} className="mt-2">
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50">
                      {category.name}
                    </div>
                    {category.variables.map((variable) => (
                      <button
                        key={variable.id}
                        onClick={() => handleVariableSelect(variable)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          selectedVariable?.id === variable.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <div className="text-sm text-gray-900 dark:text-gray-100">{variable.name}</div>
                        {variable.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {variable.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pro Variable Filters - Only show when Pro variable is selected and location type is Zip */}
          {selectedVariable && locationType === 'zip' && 
           (rentalMarketVariables.some(v => v.id === selectedVariable.id) || 
            saleMarketVariables.some(v => v.id === selectedVariable.id)) && (
            <div className="mt-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="space-y-3">
                  {/* Filter Type Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (rentalMarketVariables.some(v => v.id === selectedVariable.id)) {
                          setRentalFilterType('propertyType');
                        } else {
                          setSaleFilterType('propertyType');
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                        ((rentalMarketVariables.some(v => v.id === selectedVariable.id) && rentalFilterType === 'propertyType') ||
                         (saleMarketVariables.some(v => v.id === selectedVariable.id) && saleFilterType === 'propertyType'))
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Property Type
                    </button>
                    <button
                      onClick={() => {
                        if (rentalMarketVariables.some(v => v.id === selectedVariable.id)) {
                          setRentalFilterType('bedrooms');
                        } else {
                          setSaleFilterType('bedrooms');
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                        ((rentalMarketVariables.some(v => v.id === selectedVariable.id) && rentalFilterType === 'bedrooms') ||
                         (saleMarketVariables.some(v => v.id === selectedVariable.id) && saleFilterType === 'bedrooms'))
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Bedrooms
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Filter by either property type or bedrooms
                  </p>

                  {/* Filter Options */}
                  {rentalMarketVariables.some(v => v.id === selectedVariable.id) ? (
                    // Rental Market Filters
                    rentalFilterType === 'propertyType' ? (
                      <select
                        value={rentalPropertyType}
                        onChange={(e) => setRentalPropertyType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {propertyTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setRentalBedrooms(null)}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                            rentalBedrooms === null
                              ? 'bg-brand-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          All
                        </button>
                        {bedroomOptions.map(num => (
                          <button
                            key={num}
                            onClick={() => setRentalBedrooms(num)}
                            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                              rentalBedrooms === num
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    // Sale Market Filters
                    saleFilterType === 'propertyType' ? (
                      <select
                        value={salePropertyType}
                        onChange={(e) => setSalePropertyType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {propertyTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSaleBedrooms(null)}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                            saleBedrooms === null
                              ? 'bg-brand-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          All
                        </button>
                        {bedroomOptions.map(num => (
                          <button
                            key={num}
                            onClick={() => setSaleBedrooms(num)}
                            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                              saleBedrooms === num
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Display Results Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || selectedLocations.length === 0 || !selectedVariable}
          className={`px-8 py-3 rounded-lg transition-colors font-medium text-base flex items-center gap-2 ${
            selectedLocations.length > 0 && selectedVariable && !isGenerating
              ? 'bg-brand-500 hover:bg-brand-600 text-white cursor-pointer'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5" />
              Display Results
            </>
          )}
        </button>
      </div>

      {/* Full Width Chart Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {!showResults && (selectedLocations.length === 0 || !selectedVariable) ? (
          <div className="min-h-[600px] flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Data to Display
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              {selectedLocations.length === 0 && !selectedVariable
                ? 'Select at least one location and one variable to view the comparison chart'
                : selectedLocations.length === 0
                ? 'Select at least one location to view the comparison chart'
                : 'Select a variable and click "Display Results"'}
            </p>
          </div>
        ) : !showResults ? (
          <div className="min-h-[600px] flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-16 h-16 text-brand-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Ready to Generate
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Click "Display Results" to generate the comparison chart
            </p>
          </div>
        ) : chartData && selectedVariable ? (
          <div className="w-full flex flex-col">
            {/* Selected Variable Display */}
            <div className="mb-4 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {selectedVariable.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comparing {selectedLocations.length} {selectedLocations.length === 1 ? 'location' : 'locations'} • {chartData.length} data points
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
                        {locationsWithNoData.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 relative" style={{ height: '550px' }}>
              {/* Watermark - aligned with X axis end */}
              <div className="absolute bottom-8 flex items-center gap-2 pointer-events-none z-10 opacity-50" style={{ right: '46px' }}>
                <img 
                  src="/logo.png" 
                  alt="Tenantry" 
                  className="w-8 h-8"
                />
                <span className="text-base font-bold text-gray-700 dark:text-gray-300">
                  Tenantry
                </span>
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorLine1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLine2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLine3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#d1d5db" 
                    strokeOpacity={0.3}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                    label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#6b7280' }}
                  />
                  <YAxis 
                    width={100}
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
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
                      fill: '#6b7280',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  {selectedLocations.map((location, index) => {
                    const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'];
                    const color = colors[index % colors.length];
                    return (
                      <Line
                        key={location.value}
                        type="monotone"
                        dataKey={location.value}
                        name={location.value}
                        stroke={color}
                        strokeWidth={3}
                        dot={{ 
                          r: 5, 
                          fill: color,
                          strokeWidth: 2,
                          stroke: '#fff'
                        }}
                        activeDot={{ 
                          r: 7,
                          fill: color,
                          strokeWidth: 2,
                          stroke: '#fff'
                        }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tenantry Insights */}
            <div className="mt-6">
              <div className="bg-gradient-to-r from-brand-50 to-blue-50 dark:from-brand-900/30 dark:to-blue-900/30 border border-brand-200 dark:border-brand-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-brand-900 dark:text-brand-100 mb-2">
                      Tenantry Insights
                    </h4>
                    {isGeneratingSummary ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing data trends...</span>
                      </div>
                    ) : aiSummary ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {aiSummary}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Source */}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              Source: <a href="https://datacommons.org" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-600 underline">Data Commons</a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


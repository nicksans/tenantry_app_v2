import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Lock, ArrowLeft, Info, X, Loader2, Download, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

interface Variable {
  id: string;
  name: string;
  key?: string;
  category?: string;
  description?: string;
  value_type?: string;
}

interface LocationWithGeo {
  name: string;
  geoLevel: 'national' | 'state' | 'metro' | 'county' | 'zip';
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface LocationDetailProps {
  locationName: string;
  geoLevel: 'national' | 'state' | 'metro' | 'county' | 'zip';
  variableName: string;
  variableId?: string;
  onBack: () => void;
}

export default function LocationDetail({ locationName, geoLevel, variableName, variableId, onBack }: LocationDetailProps) {
  // Location state
  const [selectedLocations, setSelectedLocations] = useState<LocationWithGeo[]>([
    { name: locationName, geoLevel: geoLevel }
  ]);
  const [locationInput, setLocationInput] = useState('');
  
  // Variable state
  const [selectedVariables, setSelectedVariables] = useState<Variable[]>([]);
  const [databaseVariables, setDatabaseVariables] = useState<Variable[]>([]);
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVariableDropdownOpen, setIsVariableDropdownOpen] = useState(false);
  
  // Chart state
  const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [timelineStart, setTimelineStart] = useState<number>(0);
  const [timelineEnd, setTimelineEnd] = useState<number>(100);
  
  // UI state
  const [showForecastTooltip, setShowForecastTooltip] = useState(false);
  const [showVariable1Tooltip, setShowVariable1Tooltip] = useState(false);
  const [showVariable2Tooltip, setShowVariable2Tooltip] = useState(false);
  const [showFavoriteTooltip, setShowFavoriteTooltip] = useState(false);
  const [showCitySearchTip, setShowCitySearchTip] = useState(false);
  const variableDropdownRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const selectedLocationsRef = useRef(selectedLocations);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedLocationsRef.current = selectedLocations;
  }, [selectedLocations]);

  // Track if input should be visible (less than 3 locations)
  const inputShouldBeVisible = selectedLocations.length < 3;
  
  // Initialize Google Places Autocomplete when input is available
  useEffect(() => {
    // Don't run if input shouldn't be visible (3 locations already selected)
    if (!inputShouldBeVisible) {
      return;
    }
    
    // Small delay to ensure input is in the DOM
    const timeoutId = setTimeout(() => {
      const initAutocomplete = async () => {
        if (!locationInputRef.current) {
          return;
        }
        
        // Clean up existing autocomplete instance before creating a new one
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        }
        
        // Remove any lingering pac-containers
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach(container => container.remove());

        try {
          // Load Google Maps script if not already loaded
          if (!window.google?.maps) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            
            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Failed to load Google Maps script'));
              document.head.appendChild(script);
            });
          }

          // Configure autocomplete to show regions (cities, counties, ZIP codes, states)
          const autocompleteOptions: google.maps.places.AutocompleteOptions = {
            componentRestrictions: { country: 'us' },
            fields: ['address_components', 'formatted_address', 'name'],
            types: ['(regions)'] // Include regions: cities, counties, ZIP codes, states
          };

          const autocomplete = new google.maps.places.Autocomplete(
            locationInputRef.current,
            autocompleteOptions
          );
          
          autocompleteRef.current = autocomplete;

          // Listen for place selection
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            
            if (!place?.address_components) {
              return;
            }

            // Extract location information
            let county = '';
            let city = '';
            let state = '';
            let stateFullName = '';
            let zipCode = '';

            for (const component of place.address_components) {
              const types = component.types;
              
              if (types.includes('administrative_area_level_2')) {
                county = component.long_name;
              }
              if (types.includes('locality') || types.includes('sublocality')) {
                city = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                state = component.short_name;
                stateFullName = component.long_name;
              }
              if (types.includes('postal_code')) {
                zipCode = component.long_name;
              }
            }

          // Determine what was selected and format it
          let locationName = '';
          let detectedGeoLevel: LocationWithGeo['geoLevel'] = 'state';

          if (zipCode) {
            // ZIP code selected
            locationName = zipCode;
            detectedGeoLevel = 'zip';
          } else if (city) {
            // City selected
            locationName = state ? `${city}, ${state}` : city;
            detectedGeoLevel = 'metro';
          } else if (county) {
            // County selected
            locationName = state ? `${county}, ${state}` : county;
            detectedGeoLevel = 'county';
          } else if (stateFullName) {
            // State selected
            locationName = stateFullName;
            detectedGeoLevel = 'state';
          } else {
            // Fallback to the formatted address or name
            locationName = place.name || place.formatted_address || '';
          }

            if (locationName) {
              // Use ref to get current selectedLocations (avoid stale closure)
              const currentLocations = selectedLocationsRef.current;
              
              // Check for duplicates - normalize by extracting ZIP numbers for comparison
              const isDuplicate = currentLocations.some(loc => {
                if (detectedGeoLevel === 'zip' && loc.geoLevel === 'zip') {
                  // For ZIP codes, compare the 5-digit numbers
                  const newZip = locationName.match(/\d{5}/)?.[0];
                  const existingZip = loc.name.match(/\d{5}/)?.[0];
                  return newZip && existingZip && newZip === existingZip;
                }
                // For other types, compare names directly
                return loc.name === locationName;
              });
              
              if (isDuplicate) {
                setLocationInput('');
                return;
              }
              
              if (currentLocations.length < 3) {
                setSelectedLocations([...currentLocations, { name: locationName, geoLevel: detectedGeoLevel }]);
                setLocationInput('');
                // Clear the city search tip when a location is successfully added
                setShowCitySearchTip(false);
                
                // Force reinitialize autocomplete after selection
                setTimeout(() => {
                  if (autocompleteRef.current && locationInputRef.current) {
                    google.maps.event.clearInstanceListeners(autocompleteRef.current);
                    const pacContainers = document.querySelectorAll('.pac-container');
                    pacContainers.forEach(container => container.remove());
                    
                    // Recreate autocomplete
                    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
                      componentRestrictions: { country: 'us' },
                      fields: ['address_components', 'formatted_address', 'name'],
                      types: ['(regions)']
                    };
                    
                    const newAutocomplete = new google.maps.places.Autocomplete(
                      locationInputRef.current,
                      autocompleteOptions
                    );
                    
                    autocompleteRef.current = newAutocomplete;
                    
                    // Re-attach the listener (need to bind the full handler again)
                    newAutocomplete.addListener('place_changed', () => {
                      const place = newAutocomplete.getPlace();
                      if (!place?.address_components) return;
                      
                      let county = '', city = '', state = '', stateFullName = '', zipCode = '';
                      for (const component of place.address_components) {
                        const types = component.types;
                        if (types.includes('administrative_area_level_2')) county = component.long_name;
                        if (types.includes('locality') || types.includes('sublocality')) city = component.long_name;
                        if (types.includes('administrative_area_level_1')) {
                          state = component.short_name;
                          stateFullName = component.long_name;
                        }
                        if (types.includes('postal_code')) zipCode = component.long_name;
                      }
                      
                      let locationName = '';
                      let detectedGeoLevel: LocationWithGeo['geoLevel'] = 'state';
                      
                      if (zipCode) {
                        locationName = zipCode;
                        detectedGeoLevel = 'zip';
                      } else if (city) {
                        locationName = state ? `${city}, ${state}` : city;
                        detectedGeoLevel = 'metro';
                      } else if (county) {
                        locationName = state ? `${county}, ${state}` : county;
                        detectedGeoLevel = 'county';
                      } else if (stateFullName) {
                        locationName = stateFullName;
                        detectedGeoLevel = 'state';
                      } else {
                        locationName = place.name || place.formatted_address || '';
                      }
                      
                      if (locationName) {
                        const currentLocations = selectedLocationsRef.current;
                        // Check for duplicates - normalize by extracting ZIP numbers for comparison
                        const isDuplicate = currentLocations.some(loc => {
                          if (detectedGeoLevel === 'zip' && loc.geoLevel === 'zip') {
                            // For ZIP codes, compare the 5-digit numbers
                            const newZip = locationName.match(/\d{5}/)?.[0];
                            const existingZip = loc.name.match(/\d{5}/)?.[0];
                            return newZip && existingZip && newZip === existingZip;
                          }
                          // For other types, compare names directly
                          return loc.name === locationName;
                        });
                        
                        if (isDuplicate) {
                          setLocationInput('');
                          return;
                        }
                        if (currentLocations.length < 3) {
                          setSelectedLocations([...currentLocations, { name: locationName, geoLevel: detectedGeoLevel }]);
                          setLocationInput('');
                          // Clear the city search tip when a location is successfully added
                          setShowCitySearchTip(false);
                        }
                      }
                    });
                  }
                }, 100);
              }
            }
          });
        } catch (error) {
          console.error('Error loading Google Places:', error);
        }
      };

      initAutocomplete();
    }, 100); // Small delay for DOM to update
    
    return () => clearTimeout(timeoutId);
  }, [inputShouldBeVisible]); // Re-run when input becomes visible again
  
  // Cleanup autocomplete when component unmounts
  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  // Close variable dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on Google Places autocomplete dropdown
      if (target.closest('.pac-container')) {
        return;
      }
      
      if (variableDropdownRef.current && !variableDropdownRef.current.contains(event.target as Node)) {
        setIsVariableDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch variables from database (like MapView)
  useEffect(() => {
    const fetchVariables = async () => {
      setLoadingVariables(true);
      try {
        const { data, error } = await supabase
          .from('variables')
          .select('id, key, label, category, value_type, description')
          .order('label');
        
        if (error) throw error;
        
        const vars: Variable[] = (data || []).map(v => ({
          id: v.id,
          name: v.label,
          key: v.key,
          category: v.category || undefined,
          description: v.description || undefined,
          value_type: v.value_type || undefined
        }));
        
        setDatabaseVariables(vars);
        
        // If we have a variableId, find and set that variable
        if (variableId) {
          const matchedVar = vars.find(v => v.id === variableId);
          if (matchedVar) {
            setSelectedVariables([matchedVar]);
          }
        } else {
          // Otherwise try to match by name
          const matchedVar = vars.find(v => v.name === variableName);
          if (matchedVar) {
            setSelectedVariables([matchedVar]);
          }
        }
      } catch (error) {
        console.error('Error fetching variables:', error);
      } finally {
        setLoadingVariables(false);
      }
    };

    fetchVariables();
  }, [variableName, variableId]);

  // Helper function to format location display name (remove "ZIP " prefix for ZIP codes)
  const formatLocationName = (name: string, geoLevel: string) => {
    if (geoLevel === 'zip' && name.toUpperCase().startsWith('ZIP ')) {
      return name.substring(4); // Remove "ZIP " prefix
    }
    return name;
  };

  // Fetch timeline data when locations or variables change
  useEffect(() => {
    if (selectedVariables.length === 0 || selectedLocations.length === 0) {
      setChartData(null);
      return;
    }

    const fetchTimelineData = async () => {
      setIsLoadingChart(true);
      
      try {
        const allData: Record<string, { date: string; value: number }[]> = {};
        
        // Map frontend geo level names to database geo_level values
        const geoLevelMap: Record<string, string> = {
          'national': 'country',
          'state': 'state',
          'metro': 'msa',
          'county': 'county',
          'zip': 'zip'
        };
        
        // Fetch data for each location and variable combination
        for (const variable of selectedVariables) {
          // Check if this variable needs percentage change data (e.g., ZORDI or Zillow engagement metrics)
          const needsPctChange = variable.key?.toLowerCase().includes('zordi') || 
                                  variable.key?.toLowerCase().includes('engagement') || 
                                  false;
          
          for (const location of selectedLocations) {
          const dbGeoLevel = geoLevelMap[location.geoLevel] || location.geoLevel;
          
          // First, get distinct geo_entity_ids that match this location name
          let query = supabase
            .from('metric_observations_with_geo')
            .select('geo_entity_id, geo_name, geoid')
            .eq('variable_id', variable.id)
            .eq('geo_level', dbGeoLevel);
          
          // Add name filter to reduce initial query size
          const searchName = location.name.toLowerCase().trim();
          
          if (location.geoLevel === 'state') {
            const stateName = searchName.replace(' state', '').trim();
            // Use exact match or starts-with to avoid matching "Kansas" with "Arkansas"
            query = query.or(`geo_name.ilike.${stateName},geo_name.ilike.${stateName} state`);
          } else if (location.geoLevel === 'metro' || location.geoLevel === 'county') {
            // For hyphenated metros like "Phoenix-Mesa-Scottsdale", use just the first part
            const firstPart = searchName.split(',')[0].split('-')[0].trim();
            query = query.ilike('geo_name', `%${firstPart}%`);
          } else if (location.geoLevel === 'zip') {
            // For ZIP codes, filter by the 5-digit ZIP code in geoid
            const zipMatch = location.name.match(/\d{5}/);
            if (zipMatch) {
              query = query.ilike('geoid', `%${zipMatch[0]}%`);
            }
          }
          
          const { data: geoData, error: geoError } = await query.limit(100);
          
          if (geoError) {
            console.error(`Error fetching geo entities for ${location.name}:`, geoError);
            continue;
          }
          
          if (!geoData || geoData.length === 0) {
            console.log(`No geo data found for ${location.name} at ${location.geoLevel} level`);
            // Show tip if user searched for a city/metro and it wasn't found
            if (location.geoLevel === 'metro') {
              setShowCitySearchTip(true);
            }
            continue;
          }
          
          console.log(`Found ${geoData.length} potential matches for ${location.name}:`, geoData.map(d => d.geo_name));
          
          // Find the best matching geo_entity
          let matchingGeoEntity = null;
          
          for (const row of geoData) {
            if (!row.geo_name) continue;
            
            const geoName = row.geo_name.toLowerCase().trim();
            
            // For ZIP codes, match by geoid
            if (location.geoLevel === 'zip') {
              const zipMatch = location.name.match(/\d{5}/);
              const rowZipMatch = row.geoid?.match(/\d{5}/);
              if (zipMatch && rowZipMatch && zipMatch[0] === rowZipMatch[0]) {
                matchingGeoEntity = row.geo_entity_id;
                break;
              }
            }
            
            // For states, match by name (with or without "State" suffix)
            if (location.geoLevel === 'state') {
              const cleanGeoName = geoName.replace(' state', '').trim();
              const cleanSearchName = searchName.replace(' state', '').trim();
              
              console.log(`Comparing state: "${cleanSearchName}" with DB: "${cleanGeoName}"`);
              
              if (cleanGeoName === cleanSearchName || 
                  geoName === searchName ||
                  geoName === cleanSearchName ||
                  cleanGeoName === searchName) {
                matchingGeoEntity = row.geo_entity_id;
                console.log(`✓ State match found: ${row.geo_name} (ID: ${row.geo_entity_id})`);
                break;
              }
            }
            
            // For metros/cities, use flexible matching
            if (location.geoLevel === 'metro') {
              const searchFirst = searchName.split(',')[0].split('-')[0].trim();
              const geoFirst = geoName.split(',')[0].split('-')[0].trim();
              
              const matched = 
                geoName === searchName ||
                geoFirst === searchFirst ||
                geoName.toLowerCase().includes(searchFirst.toLowerCase()) ||
                geoFirst.toLowerCase().includes(searchFirst.toLowerCase()) ||
                searchFirst.toLowerCase().includes(geoFirst.toLowerCase()) ||
                geoName.toLowerCase().startsWith(searchFirst.toLowerCase());
              
              if (matched) {
                matchingGeoEntity = row.geo_entity_id;
                break;
              }
            }
            
            // For counties, try various matching strategies
            if (location.geoLevel === 'county') {
              const searchFirst = searchName.split(',')[0].trim();
              const geoFirst = geoName.split(',')[0].trim();
              
              if (geoName === searchName || 
                  geoFirst === searchFirst ||
                  geoName.includes(searchFirst) ||
                  searchFirst.includes(geoFirst) ||
                  geoName.replace(' county', '').trim() === searchFirst.replace(' county', '').trim()) {
                matchingGeoEntity = row.geo_entity_id;
                break;
              }
            }
          }
          
          if (!matchingGeoEntity) {
            console.log(`❌ No match found for ${location.name} at ${location.geoLevel} level`);
            // Show tip if user searched for a city/metro and it wasn't found
            if (location.geoLevel === 'metro') {
              setShowCitySearchTip(true);
            }
            continue;
          }
          
          console.log(`Fetching timeline data for ${location.name} (entity ID: ${matchingGeoEntity})`);
          
          // Fetch all timeline data for this specific geo_entity_id
          // For variables that need percentage change (ZORDI, engagement metrics), also fetch pct_change_prev
          let timelineQuery = supabase
            .from('metric_observations_with_geo')
            .select(needsPctChange ? 'date, value, pct_change_prev' : 'date, value')
            .eq('variable_id', variable.id)
            .eq('geo_entity_id', matchingGeoEntity)
            .order('date', { ascending: true })
            .limit(5000);
          
          const { data: timelineData, error: timelineError } = await timelineQuery;
          
          if (timelineError) {
            console.error(`Error fetching timeline data:`, timelineError);
            continue;
          }
          
          if (timelineData && timelineData.length > 0) {
            // Successfully found data - hide the city search tip if it was showing
            if (location.geoLevel === 'metro') {
              setShowCitySearchTip(false);
            }
            
            // Create a unique key for this location-variable combination
            const displayName = formatLocationName(location.name, location.geoLevel);
            const seriesKey = selectedVariables.length > 1 
              ? `${displayName} - ${variable.name}` 
              : displayName;
            
            // For variables that need percentage change, use pct_change_prev instead of value
            // (multiply by 100 to convert from decimal to percentage, e.g., -0.115 -> -11.5)
            // Also skip the first date since we can't calculate MoM change for it
            let processedData = timelineData.map((row: any) => ({
              date: row.date,
              value: needsPctChange && row.pct_change_prev !== null && row.pct_change_prev !== undefined
                ? row.pct_change_prev * 100
                : row.value
            }));
            
            // For percentage change variables, skip the first data point (can't calculate MoM for earliest date)
            if (needsPctChange && processedData.length > 1) {
              processedData = processedData.slice(1);
            }
            
            allData[seriesKey] = processedData;
          }
          }
        }
        
        // Combine all location-variable data into chart format
        // Get all unique dates across all series
        const allDates = new Set<string>();
        Object.values(allData).forEach(seriesData => {
          seriesData.forEach(d => allDates.add(d.date));
        });
        
        // Sort dates chronologically
        const sortedDates = Array.from(allDates).sort();
        
        // Build chart data points
        const chartPoints: ChartDataPoint[] = sortedDates.map(date => {
          const point: ChartDataPoint = { date };
          
          // Add data for each series (location-variable combination)
          Object.keys(allData).forEach(seriesKey => {
            const seriesData = allData[seriesKey];
            const dataPoint = seriesData.find(d => d.date === date);
            if (dataPoint) {
              point[seriesKey] = dataPoint.value;
            }
          });
          
          return point;
        });
        
        setChartData(chartPoints.length > 0 ? chartPoints : null);
        
        // Reset timeline range when new data loads
        setTimelineStart(0);
        setTimelineEnd(100);
        
      } catch (error) {
        console.error('Error fetching timeline data:', error);
        setChartData(null);
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchTimelineData();
  }, [selectedVariables, selectedLocations]);

  // Remove a location
  const handleRemoveLocation = (locationName: string) => {
    setSelectedLocations(selectedLocations.filter(loc => loc.name !== locationName));
  };

  // Handle variable selection
  const handleVariableSelect = (variable: Variable) => {
    // Check if already selected
    if (selectedVariables.find(v => v.id === variable.id)) {
      setIsVariableDropdownOpen(false);
      return;
    }
    
    // Add to array (max 2)
    if (selectedVariables.length < 2) {
      setSelectedVariables([...selectedVariables, variable]);
      setIsVariableDropdownOpen(false);
    }
  };

  // Remove a variable
  const handleRemoveVariable = (variableId: string) => {
    setSelectedVariables(selectedVariables.filter(v => v.id !== variableId));
  };

  // Group variables by category, filtering out MoM and YoY variables
  const groupedVariables = databaseVariables
    .filter(v => !v.key?.endsWith('_mm') && !v.key?.endsWith('_yy'))
    .reduce((acc, variable) => {
      const category = variable.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(variable);
      return acc;
    }, {} as Record<string, Variable[]>);

  // Filter variables by search query
  const filteredGroupedVariables = Object.entries(groupedVariables)
    .reduce((acc, [category, variables]) => {
      const filtered = variables.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    }, {} as Record<string, Variable[]>);

  // Filter chart data based on timeline range
  const filteredChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    
    const totalPoints = chartData.length;
    const startIndex = Math.floor((timelineStart / 100) * totalPoints);
    
    // When at 100%, ensure we include the very last point
    const endIndex = timelineEnd === 100 
      ? totalPoints 
      : Math.ceil((timelineEnd / 100) * totalPoints);
    
    const validStartIndex = Math.max(0, Math.min(startIndex, totalPoints - 2));
    const validEndIndex = Math.max(validStartIndex + 2, Math.min(endIndex, totalPoints));
    
    return chartData.slice(validStartIndex, validEndIndex);
  }, [chartData, timelineStart, timelineEnd]);

  // Calculate percentage change for the selected timeline range (for all series)
  const timelinePercentageChanges = useMemo(() => {
    if (!filteredChartData || filteredChartData.length < 2) return [];
    
    // Get all series keys (location names or location-variable combinations) from the first data point
    const seriesKeys = Object.keys(filteredChartData[0]).filter(key => key !== 'date');
    
    if (seriesKeys.length === 0) return [];
    
    const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];
    
    // Calculate percentage change for each series
    const firstPoint = filteredChartData[0];
    const lastPoint = filteredChartData[filteredChartData.length - 1];
    
    return seriesKeys.map((seriesKey, index) => {
      const startValue = Number(firstPoint[seriesKey]);
      const endValue = Number(lastPoint[seriesKey]);
      
      if (!isNaN(startValue) && !isNaN(endValue) && startValue !== 0) {
        const percentChange = ((endValue - startValue) / startValue) * 100;
        const lastValue = endValue;
        return {
          seriesKey,
          percentChange,
          lastValue,
          lineColor: colors[index % colors.length]
        };
      }
      
      return null;
    }).filter(item => item !== null) as { seriesKey: string; percentChange: number; lastValue: number; lineColor: string }[];
  }, [filteredChartData]);

  // Get the value type for a variable
  const getValueType = (variable: Variable | null): string => {
    if (!variable) return 'number';
    return variable.value_type || 'number';
  };

  // Format value based on variable type
  const formatValue = (value: number, seriesName?: string): string => {
    // Try to determine which variable this series belongs to
    let variable: Variable | null = null;
    
    if (seriesName && selectedVariables.length > 1) {
      // Extract variable name from series name like "Location - Variable"
      const varName = seriesName.split(' - ')[1];
      variable = selectedVariables.find(v => v.name === varName) || null;
    } else if (selectedVariables.length === 1) {
      variable = selectedVariables[0];
    }
    
    const valueType = getValueType(variable);
    
    // Check if this is a variable that uses pct_change_prev (already converted to percentage)
    const isZordiVariable = variable?.key?.toLowerCase().includes('zordi') || 
                            variable?.key?.toLowerCase().includes('engagement') || 
                            false;
    
    switch (valueType) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      
      case 'percent':
        // For ZORDI/engagement metrics, value is already a percentage (e.g., -14.545)
        // For other percent metrics, value is a decimal that needs to be multiplied by 100
        if (isZordiVariable) {
          return `${value.toFixed(2)}%`;
        } else {
          return `${(value * 100).toFixed(2)}%`;
        }
      
      case 'number':
      default:
        // For ZORDI/engagement metrics that aren't marked as percent type, still format as percentage
        if (isZordiVariable) {
          return `${value.toFixed(2)}%`;
        }
        return value.toLocaleString();
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !filteredChartData) return null;

    const currentIndex = filteredChartData.findIndex(d => d.date === label);
    const previousData = currentIndex > 0 ? filteredChartData[currentIndex - 1] : null;

    const formattedDate = label.includes('-') && label.split('-').length >= 2
      ? (() => {
          const [year, month, day] = label.split('-').map(Number);
          const date = new Date(year, month - 1, day || 1);
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        })()
      : label;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{formattedDate}</p>
        {payload.map((entry: any, index: number) => {
          const currentValue = entry.value;
          const displayName = entry.name; // This includes the percentage for display
          
          // Extract the actual series key (without the percentage) for data lookup
          const seriesKeyMatch = displayName.match(/^(.+)\s+\([+-][\d.]+%\)$/);
          const seriesKey = seriesKeyMatch ? seriesKeyMatch[1] : displayName;
          
          let percentChange = null;
          if (previousData && previousData[seriesKey] !== undefined) {
            const previousValue = previousData[seriesKey] as number;
            if (previousValue !== 0) {
              percentChange = ((currentValue - previousValue) / previousValue) * 100;
            }
          }

          return (
            <div key={index} className="mb-1.5 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {seriesKey}
                </span>
              </div>
              <div className="ml-5 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatValue(currentValue, seriesKey)}
                </span>
                {percentChange !== null && (
                  <span className={`text-xs ${percentChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}% MoM
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{formatLocationName(locationName, geoLevel)}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm capitalize">{geoLevel} Level Analysis</p>
              </div>
              <div className="relative">
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                  onMouseEnter={() => setShowFavoriteTooltip(true)}
                  onMouseLeave={() => setShowFavoriteTooltip(false)}
                  aria-label="Save to My Markets"
                >
                  <Heart className="w-6 h-6 text-gray-400 group-hover:text-red-500 group-hover:fill-red-500 transition-all" />
                </button>
                {showFavoriteTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-11 z-50 whitespace-nowrap px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-xl">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45"></div>
                    Save this location to My Markets
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-base"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Controls Section - Centered */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
              {/* Location Selector */}
              <div className="relative">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                  Enter Locations <span className="text-xs text-gray-500 dark:text-gray-400 font-normal italic">(Compare up to 3)</span>
                </label>
                
                {/* Search Input */}
                {selectedLocations.length < 3 ? (
                  <>
                    <input
                      ref={locationInputRef}
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Search State, County, City, or ZIP"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D98BA] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                    />
                    {showCitySearchTip && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">
                        💡 Tip: Try searching by county if city data is unavailable
                      </p>
                    )}
                  </>
                ) : (
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                    Maximum 3 locations
                  </div>
                )}
                
                {/* Selected Location Chips */}
                {selectedLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedLocations.map((location) => (
                      <div
                        key={location.name}
                        className="flex items-center gap-1 px-2 py-1 bg-[#0D98BA]/10 dark:bg-[#0D98BA]/20 text-[#0D98BA] rounded text-xs border border-[#0D98BA]/20"
                      >
                        <span className="font-medium">{formatLocationName(location.name, location.geoLevel)}</span>
                        <button
                          onClick={() => handleRemoveLocation(location.name)}
                          className="hover:bg-[#0D98BA]/20 rounded-full p-0.5 transition-colors ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Variable Selector */}
              <div className="relative" ref={variableDropdownRef}>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                  Choose Variables <span className="text-xs text-gray-500 dark:text-gray-400 font-normal italic">(Compare up to 2)</span>
                </label>
                
                {/* Search Input or Max Message */}
                {selectedVariables.length < 2 ? (
                  <button 
                    onClick={() => setIsVariableDropdownOpen(!isVariableDropdownOpen)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm truncate">
                      {selectedVariables.length === 0 ? 'Select a variable...' : 'Add another variable...'}
                    </span>
                    {isVariableDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ) : (
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                    Maximum 2 variables
                  </div>
                )}
                
                {/* Selected Variable Chips */}
                {selectedVariables.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedVariables.map((variable) => (
                      <div
                        key={variable.id}
                        className="flex items-center gap-1 px-2 py-1 bg-[#0D98BA]/10 dark:bg-[#0D98BA]/20 text-[#0D98BA] rounded text-xs border border-[#0D98BA]/20"
                      >
                        <span className="font-medium">{variable.name}</span>
                        <button
                          onClick={() => handleRemoveVariable(variable.id)}
                          className="hover:bg-[#0D98BA]/20 rounded-full p-0.5 transition-colors ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="relative">
                  
                  {/* Variable Dropdown */}
                  {isVariableDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
                      {/* Search Bar */}
                      <div className="sticky top-0 bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search variables..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D98BA] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm"
                        />
                      </div>

                      <div className="p-2">
                        {loadingVariables ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-[#0D98BA]" />
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading variables...</span>
                          </div>
                        ) : (
                          Object.entries(filteredGroupedVariables)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([category, variables]) => (
                              <div key={category} className="mt-2">
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                                  {category}
                                </div>
                                {variables.map((variable) => (
                                  <button
                                    key={variable.id}
                                    onClick={() => handleVariableSelect(variable)}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                      selectedVariables.find(v => v.id === variable.id) ? 'bg-gray-100 dark:bg-gray-700' : ''
                                    }`}
                                  >
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{variable.name}</span>
                                  </button>
                                ))}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section - Full Width */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
            <div className="relative flex items-center justify-center gap-2 mb-4">
              {selectedVariables.length === 1 ? (
                // Single variable - show name with tooltip
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedVariables[0].name}
                  </h2>
                  {selectedVariables[0].description && (
                    <div className="relative">
                      <Info
                        className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"
                        onMouseEnter={() => setShowVariable1Tooltip(true)}
                        onMouseLeave={() => setShowVariable1Tooltip(false)}
                      />
                      {showVariable1Tooltip && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-6 z-50 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl border border-gray-700 dark:border-gray-600">
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 border-l border-t border-gray-700 dark:border-gray-600 transform rotate-45"></div>
                          {selectedVariables[0].description}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : selectedVariables.length === 2 ? (
                // Two variables - show both with "vs" and tooltips
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedVariables[0].name}
                    </h2>
                    {selectedVariables[0].description && (
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"
                          onMouseEnter={() => setShowVariable1Tooltip(true)}
                          onMouseLeave={() => setShowVariable1Tooltip(false)}
                        />
                        {showVariable1Tooltip && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-6 z-50 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl border border-gray-700 dark:border-gray-600">
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 border-l border-t border-gray-700 dark:border-gray-600 transform rotate-45"></div>
                            {selectedVariables[0].description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <span className="text-lg text-gray-500 dark:text-gray-400 font-normal mx-1">vs</span>
                  
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedVariables[1].name}
                    </h2>
                    {selectedVariables[1].description && (
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"
                          onMouseEnter={() => setShowVariable2Tooltip(true)}
                          onMouseLeave={() => setShowVariable2Tooltip(false)}
                        />
                        {showVariable2Tooltip && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-6 z-50 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl border border-gray-700 dark:border-gray-600">
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 border-l border-t border-gray-700 dark:border-gray-600 transform rotate-45"></div>
                            {selectedVariables[1].description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Fallback - no variables selected
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {variableName}
                </h2>
              )}
              
              <button className="absolute right-0 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
            
            {isLoadingChart ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 min-h-[500px] flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <Loader2 className="w-16 h-16 text-[#0D98BA] animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Loading timeline data...
                  </p>
                </div>
              </div>
            ) : !filteredChartData || filteredChartData.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 min-h-[500px] flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="w-16 h-16 text-gray-400 mx-auto mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {selectedVariables.length > 0
                      ? 'No timeline data available for this location and variable combination.'
                      : 'Select a variable to view timeline data.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Chart */}
                <div className="w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg relative overflow-hidden" style={{ height: '600px' }}>
                  {/* Watermark */}
                  <div className="absolute bottom-12 flex items-center gap-2 pointer-events-none z-10 opacity-50" style={{ right: '120px' }}>
                    <img 
                      src="/logo.png" 
                      alt="Tenantry" 
                      className="w-8 h-8"
                    />
                    <span className="text-base font-bold text-gray-700 dark:text-gray-300">
                      Tenantry
                    </span>
                  </div>
                  
                  {filteredChartData && filteredChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%" key={`chart-${selectedLocations.map(l => l.name).join('-')}-${selectedVariables.map(v => v.id).join('-')}`}>
                      <LineChart 
                      data={filteredChartData}
                      margin={{ 
                        top: 20, 
                        right: (() => {
                          // Check if we have mixed value types (dual axes)
                          const valueTypes = selectedVariables.map(v => getValueType(v));
                          const hasMixedTypes = new Set(valueTypes).size > 1;
                          // If dual axes, use small margin (axis takes space). If single, use larger margin to match.
                          return hasMixedTypes ? 20 : 120;
                        })(),
                        left: 20, 
                        bottom: 40 
                      }}
                      key={`chart-${filteredChartData?.length || 0}-${selectedLocations.map(l => l.name).join('-')}-${selectedVariables.map(v => v.id).join('-')}`}
                    >
                      <defs>
                        <linearGradient id="colorLine1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLine2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLine3" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
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
                        tickFormatter={(value) => {
                          if (value.includes('-') && value.split('-').length >= 2) {
                            const [year, month, day] = value.split('-').map(Number);
                            const date = new Date(year, month - 1, day || 1);
                            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          }
                          return value;
                        }}
                        label={{ value: 'Date', position: 'insideBottom', offset: -10, fill: '#6b7280' }}
                      />
                      {(() => {
                        // Check if we have mixed value types
                        const valueTypes = selectedVariables.map(v => getValueType(v));
                        const uniqueValueTypes = [...new Set(valueTypes)];
                        const hasMixedTypes = uniqueValueTypes.length > 1;
                        
                        // Determine primary (left) and secondary (right) value types
                        const leftAxisType = valueTypes[0] || 'number';
                        const rightAxisType = hasMixedTypes ? valueTypes[1] || valueTypes[0] : leftAxisType;
                        
                        // Check if variables use pct_change_prev (already in percentage format)
                        const leftIsZordiVariable = selectedVariables[0]?.key?.toLowerCase().includes('zordi') || 
                                                     selectedVariables[0]?.key?.toLowerCase().includes('engagement') || 
                                                     false;
                        const rightIsZordiVariable = hasMixedTypes && selectedVariables.length > 1
                                                      ? (selectedVariables[1]?.key?.toLowerCase().includes('zordi') || 
                                                         selectedVariables[1]?.key?.toLowerCase().includes('engagement') || 
                                                         false)
                                                      : leftIsZordiVariable;
                        
                        // Get variable names for labels
                        const leftVariableName = selectedVariables[0]?.name || '';
                        const rightVariableName = hasMixedTypes && selectedVariables.length > 1 ? selectedVariables[1]?.name || '' : '';
                        
                        return (
                          <>
                            {/* Left Y-axis */}
                            <YAxis 
                              yAxisId="left"
                              width={100}
                              stroke="#6b7280"
                              tick={{ fill: '#6b7280', fontSize: 12 }}
                              axisLine={{ stroke: '#d1d5db' }}
                              tickFormatter={(value) => {
                                switch (leftAxisType) {
                                  case 'currency':
                                    // Don't divide by 1000 if values are already small
                                    return value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${Math.round(value)}`;
                                  case 'percent':
                                    // For ZORDI/engagement, value is already a percentage
                                    if (leftIsZordiVariable) {
                                      return `${value.toFixed(0)}%`;
                                    }
                                    return `${(value * 100).toFixed(0)}%`;
                                  case 'number':
                                  default:
                                    // For ZORDI/engagement that aren't marked as percent type, format as percentage
                                    if (leftIsZordiVariable) {
                                      return `${value.toFixed(0)}%`;
                                    }
                                    return value.toLocaleString();
                                }
                              }}
                              label={{ 
                                value: leftVariableName, 
                                angle: -90, 
                                position: 'insideLeft',
                                fill: '#6b7280',
                                style: { textAnchor: 'middle' }
                              }}
                            />
                            
                            {/* Right Y-axis (only if mixed types) */}
                            {hasMixedTypes && (
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                width={100}
                                stroke="#6b7280"
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                axisLine={{ stroke: '#d1d5db' }}
                                tickFormatter={(value) => {
                                  switch (rightAxisType) {
                                    case 'currency':
                                      // Don't divide by 1000 if values are already small
                                      return value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${Math.round(value)}`;
                                    case 'percent':
                                      // For ZORDI/engagement, value is already a percentage
                                      if (rightIsZordiVariable) {
                                        return `${value.toFixed(0)}%`;
                                      }
                                      return `${(value * 100).toFixed(0)}%`;
                                    case 'number':
                                    default:
                                      // For ZORDI/engagement that aren't marked as percent type, format as percentage
                                      if (rightIsZordiVariable) {
                                        return `${value.toFixed(0)}%`;
                                      }
                                      return value.toLocaleString();
                                  }
                                }}
                                label={{ 
                                  value: rightVariableName, 
                                  angle: 90, 
                                  position: 'insideRight',
                                  fill: '#6b7280',
                                  style: { textAnchor: 'middle' }
                                }}
                              />
                            )}
                          </>
                        );
                      })()}
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom"
                        align="center"
                        height={36}
                        wrapperStyle={{ 
                          paddingTop: '20px',
                          display: 'flex',
                          justifyContent: 'center',
                          width: '100%'
                        }}
                        iconType="circle"
                        formatter={(value: string) => {
                          // Check if the value contains a percentage
                          const match = value.match(/^(.+)\s+\(([+-][\d.]+%)\)$/);
                          if (match) {
                            const name = match[1];
                            const percentage = match[2];
                            const isPositive = percentage.startsWith('+');
                            return (
                              <span>
                                {name}{' '}
                                <span style={{ 
                                  color: isPositive ? '#22c55e' : '#ef4444'
                                }}>
                                  ({percentage})
                                </span>
                              </span>
                            );
                          }
                          return value;
                        }}
                      />
                      {(() => {
                        const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];
                        let lineIndex = 0;
                        
                        // Check if we have mixed value types
                        const valueTypes = selectedVariables.map(v => getValueType(v));
                        const uniqueValueTypes = [...new Set(valueTypes)];
                        const hasMixedTypes = uniqueValueTypes.length > 1;
                        
                        // Map variables to their axis IDs
                        const variableAxisMap = new Map<string, string>();
                        if (hasMixedTypes) {
                          // First variable type goes to left, second type goes to right
                          const firstType = valueTypes[0];
                          selectedVariables.forEach((variable) => {
                            const varType = getValueType(variable);
                            variableAxisMap.set(variable.id, varType === firstType ? 'left' : 'right');
                          });
                        }
                        
                        return selectedVariables.flatMap((variable) => 
                          selectedLocations.map((location) => {
                            const displayName = formatLocationName(location.name, location.geoLevel);
                            const seriesKey = selectedVariables.length > 1 
                              ? `${displayName} - ${variable.name}` 
                              : displayName;
                            
                            // Check if this series has any data
                            const hasData = filteredChartData?.some(point => 
                              point[seriesKey] !== undefined && point[seriesKey] !== null
                            );
                            
                            // Find the percentage change for this series
                            const percentageInfo = timelinePercentageChanges.find(p => p.seriesKey === seriesKey);
                            
                            // Build legend name based on data availability
                            let legendName: string;
                            if (!hasData) {
                              legendName = `${seriesKey} (No Data)`;
                            } else if (percentageInfo) {
                              legendName = `${seriesKey} (${percentageInfo.percentChange >= 0 ? '+' : ''}${percentageInfo.percentChange.toFixed(1)}%)`;
                            } else {
                              legendName = seriesKey;
                            }
                            
                            // Use gray color for series with no data, otherwise use regular colors
                            const color = !hasData ? '#9ca3af' : colors[lineIndex % colors.length];
                            const yAxisId = hasMixedTypes ? (variableAxisMap.get(variable.id) || 'left') : 'left';
                            lineIndex++;
                            
                            return (
                              <Line
                                key={seriesKey}
                                type="monotone"
                                dataKey={seriesKey}
                                name={legendName}
                                yAxisId={yAxisId}
                                stroke={color}
                                strokeWidth={3}
                                connectNulls={true}
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
                          })
                        );
                      })()}
                    </LineChart>
                  </ResponsiveContainer>
                  )}
                </div>

                {/* Timeline Range Slider */}
                <div className="mt-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Timeline Range:
                    </label>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px] text-right">
                        {filteredChartData && filteredChartData.length > 0 
                          ? (() => {
                              const date = filteredChartData[0].date;
                              if (date.includes('-')) {
                                const [year, month, day] = date.split('-').map(Number);
                                const d = new Date(year, month - 1, day);
                                return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                              }
                              return date;
                            })()
                          : 'Start'}
                      </span>
                      <div className="flex-1 relative h-8 flex items-center">
                        {/* Base track */}
                        <div className="absolute w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg" />
                        
                        {/* Selected range track */}
                        <div 
                          className="absolute h-2 rounded-lg pointer-events-none"
                          style={{
                            left: `${timelineStart}%`,
                            width: `${timelineEnd - timelineStart}%`,
                            backgroundColor: '#0D98BA'
                          }}
                        />
                        
                        {/* Start handle */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={timelineStart}
                          onChange={(e) => {
                            const newStart = Number(e.target.value);
                            if (newStart < timelineEnd - 5) {
                              setTimelineStart(newStart);
                            }
                          }}
                          className="absolute w-full appearance-none bg-transparent cursor-pointer range-slider-start"
                          style={{ zIndex: 5 }}
                        />
                        
                        {/* End handle */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={timelineEnd}
                          onChange={(e) => {
                            const newEnd = Number(e.target.value);
                            if (newEnd > timelineStart + 5) {
                              setTimelineEnd(newEnd);
                            }
                          }}
                          className="absolute w-full appearance-none bg-transparent cursor-pointer range-slider-end"
                          style={{ zIndex: 4 }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px]">
                        {filteredChartData && filteredChartData.length > 0 
                          ? (() => {
                              const date = filteredChartData[filteredChartData.length - 1].date;
                              if (date.includes('-')) {
                                const [year, month, day] = date.split('-').map(Number);
                                const d = new Date(year, month - 1, day);
                                return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                              }
                              return date;
                            })()
                          : 'End'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* AI Summary Section - Full Width */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Summary</h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[120px] flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                AI-generated market insights will appear here based on the selected location and variable...
              </p>
            </div>
          </div>

          {/* Bottom Grid: Highest, Lowest, Market Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Highest Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Highest {selectedVariables.length === 1 ? selectedVariables[0].name : variableName}
              </h2>
              <div className="space-y-2">
                {[
                  { name: 'San Francisco, CA', value: '$4,250' },
                  { name: 'New York, NY', value: '$3,890' },
                  { name: 'Boston, MA', value: '$3,650' },
                  { name: 'Seattle, WA', value: '$3,420' },
                  { name: 'Los Angeles, CA', value: '$3,280' },
                  { name: 'San Diego, CA', value: '$3,150' },
                  { name: 'Washington, DC', value: '$3,050' },
                  { name: 'Miami, FL', value: '$2,980' },
                  { name: 'Denver, CO', value: '$2,850' },
                  { name: 'Portland, OR', value: '$2,720' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-6">
                        #{idx + 1}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-[#0D98BA]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lowest Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Lowest {selectedVariables.length === 1 ? selectedVariables[0].name : variableName}
              </h2>
              <div className="space-y-2">
                {[
                  { name: 'Wichita, KS', value: '$950' },
                  { name: 'Toledo, OH', value: '$980' },
                  { name: 'Tulsa, OK', value: '$1,020' },
                  { name: 'Memphis, TN', value: '$1,050' },
                  { name: 'Oklahoma City, OK', value: '$1,080' },
                  { name: 'Little Rock, AR', value: '$1,120' },
                  { name: 'Des Moines, IA', value: '$1,150' },
                  { name: 'Fort Wayne, IN', value: '$1,180' },
                  { name: 'Dayton, OH', value: '$1,210' },
                  { name: 'Akron, OH', value: '$1,240' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-6">
                        #{idx + 1}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Forecast Section */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Market Forecast</h2>
                    <div className="relative">
                      <Info
                        className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors"
                        onMouseEnter={() => setShowForecastTooltip(true)}
                        onMouseLeave={() => setShowForecastTooltip(false)}
                      />
                      {showForecastTooltip && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-6 z-50 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl border border-gray-700 dark:border-gray-600">
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 border-l border-t border-gray-700 dark:border-gray-600 transform rotate-45"></div>
                          The forecasted percentage changes in home/rent prices over the next 12 months. This forecast takes into account local factors like recent appreciation, market rent trends, days on market, inventory levels, price cuts, and new construction, as well as macro trends like mortgage rates, to predict future price movements.
                        </div>
                      )}
                    </div>
                  </div>
                  <Lock className="w-5 h-5 text-[#0D98BA]" />
                </div>

                {/* Paywall Preview */}
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#0D98BA] animate-pulse"></div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">12-Month Forecast</span>
                    </div>
                    <div className="relative">
                      <div className="filter blur-sm select-none">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">+8.5%</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Projected Price Change</div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>

                  {/* Factors Preview */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Forecast Factors:</h3>
                    <div className="space-y-2">
                      {[
                        'Recent Appreciation',
                        'Inventory Levels',
                        'Price Cuts',
                        'New Construction',
                        'Days on Market',
                        'Mortgage Rates',
                        'Local Market Factors'
                      ].map((factor, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                          <span className="filter blur-[2px]">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button className="w-full bg-[#0D98BA] hover:bg-[#0B7A94] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-sm">
                      Unlock Forecasts
                    </button>
                    <p className="text-gray-500 dark:text-gray-400 text-xs text-center mt-3">
                      Get AI-powered market predictions and insights
                    </p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#0D98BA] text-sm">✓</span>
                      </div>
                      <div>
                        <div className="text-gray-900 dark:text-white text-sm font-medium">Advanced Analytics</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Deep market analysis & trends</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#0D98BA] text-sm">✓</span>
                      </div>
                      <div>
                        <div className="text-gray-900 dark:text-white text-sm font-medium">Monthly Updates</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Fresh forecasts every month</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#0D98BA] text-sm">✓</span>
                      </div>
                      <div>
                        <div className="text-gray-900 dark:text-white text-sm font-medium">Export Reports</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Download detailed PDFs</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

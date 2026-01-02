import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, Info, Search } from 'lucide-react';
import { Map as MapGL, NavigationControl } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../lib/supabase';
import centerOfMass from '@turf/center-of-mass';

interface Variable {
  id: string;
  name: string;
  description?: string;
  category?: string;
  key?: string;
  value_type?: string;
}

interface MetricObservation {
  geo_entity_id: string;
  variable_id: string;
  value: number;
  date: string;
  geo_entity: {
    id: string;
    geoid: string;
    geo_level: string;
    name: string;
    state_abbr: string;
    county_fips: string;
    zcta: string;
  };
}

export default function MapView() {
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [stateData, setStateData] = useState<any>(null);
  const [zipData, setZipData] = useState<any>(null);
  const [countyData, setCountyData] = useState<any>(null);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingZips, setLoadingZips] = useState(false);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [loadingMetros, setLoadingMetros] = useState(false);
  const [metroData, setMetroData] = useState<any>(null);
  const [nationalData, setNationalData] = useState<any>(null);
  const [loadingNational, setLoadingNational] = useState(false);
  
  // Track last loaded bounds for ZIP codes
  const lastZipBoundsRef = useRef<{ west: number; east: number; south: number; north: number } | null>(null);
  
  // Tooltip state
  const [hoveredFeature, setHoveredFeature] = useState<{
    name: string;
    value: number;
    date?: string;
    x: number;
    y: number;
  } | null>(null);
  const [showTooltip, setShowTooltip] = useState(true);
  
  // Location search state
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationAutocomplete, setLocationAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  
  // New state for database variables and metric data
  const [databaseVariables, setDatabaseVariables] = useState<Variable[]>([]);
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [metricData, setMetricData] = useState<MetricObservation[]>([]);
  const [loadingMetricData, setLoadingMetricData] = useState(false);
  
  // Hover tooltip state
  const [hoveredVariable, setHoveredVariable] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);

  // Variable sources - map variable keys to their data sources
  const variableSources: Record<string, string> = {
    'market_rent': 'Zillow Observed Rent Index (ZORI)',
    'market_rent_metro_sfr': 'Zillow Observed Rent Index (ZORI)',
    'market_rent_metro_mfr': 'Zillow Observed Rent Index (ZORI)',
    'zordi_metro_all': 'Zillow Observed Renter Demand Index (ZORDI)'
  };

  // Available geographic levels for each variable
  const variableGeoLevels: Record<string, string> = {
    'market_rent': 'National, State, Metro, County, ZIP',
    'market_rent_metro_sfr': 'National, State, Metro, County, ZIP',
    'market_rent_metro_mfr': 'National, State, Metro, County, ZIP'
  };

  // Restrict map to US boundaries
  const US_BOUNDS: [[number, number], [number, number]] = [
    [-171.791110603, 18.91619], // Southwest coordinates (includes Alaska and Hawaii)
    [-66.96466, 71.3577635769]  // Northeast coordinates
  ];

  // Mapbox token
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // Initial map view (centered on US, starting at state level)
  const [viewState, setViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3.6 // Start at state level, zoomed out as much as possible
  });

  // Determine geo-level based on zoom level
  const getGeoLevel = (zoom: number): 'national' | 'state' | 'metro' | 'county' | 'zip' => {
    if (zoom < 3.5) return 'national';
    if (zoom < 5.5) return 'state';
    if (zoom < 7.5) return 'metro';
    if (zoom < 10) return 'county';
    return 'zip';
  };

  // Fetch all variables from database on mount
  useEffect(() => {
    const fetchVariables = async () => {
      setLoadingVariables(true);
      try {
        const { data, error } = await supabase
          .from('variables')
          .select('id, key, label, category, value_type, description')
          .order('label');
        
        if (error) throw error;
        
        // Transform to Variable format
        const vars: Variable[] = (data || []).map(v => ({
          id: v.id,
          name: v.label,
          key: v.key,
          category: v.category || undefined,
          description: v.description || undefined,
          value_type: v.value_type || undefined
        }));
        
        // Variables loaded successfully
        
        setDatabaseVariables(vars);
      } catch (error) {
        console.error('Error fetching variables:', error);
      } finally {
        setLoadingVariables(false);
      }
    };

    fetchVariables();
  }, []);

  // Fetch metric data when variable is selected
  useEffect(() => {
    if (!selectedVariable || !selectedVariable.id) {
      setMetricData([]);
      return;
    }

    const fetchMetricData = async () => {
      setLoadingMetricData(true);
      
      try {
        // Check if this is a ZORDI variable (uses pre-calculated pct_change_prev field)
        const isZordiVariable = selectedVariable.key?.toLowerCase().includes('zordi') || false;
        
        // First, get the most recent date for this variable
        const { data: dateData, error: dateError } = await supabase
          .from('metric_observations')
          .select('date')
          .eq('variable_id', selectedVariable.id)
          .order('date', { ascending: false })
          .limit(1);
        
        if (dateError) throw dateError;
        if (!dateData || dateData.length === 0) {
          setMetricData([]);
          setLoadingMetricData(false);
          return;
        }

        const mostRecentDate = dateData[0].date;
        
        // Fetch ALL observations for this variable on that date
        let allData: any[] = [];
        let fetchMore = true;
        let offset = 0;
        const batchSize = 1000;
        
        while (fetchMore) {
          const { data: batchData, error } = await supabase
            .from('metric_observations')
            .select(`
              geo_entity_id,
              variable_id,
              value,
              date,
              ${isZordiVariable ? 'pct_change_prev,' : ''}
              geo_entity:geo_entities (
                id,
                geoid,
                geo_level,
                name,
                state_abbr,
                county_fips,
                cbsa_code,
                zcta
              )
            `)
            .eq('variable_id', selectedVariable.id)
            .eq('date', mostRecentDate)
            .order('geo_entity_id')
            .range(offset, offset + batchSize - 1);
          
          if (error) throw error;
          
          if (batchData && batchData.length > 0) {
            allData = allData.concat(batchData);
            offset += batchSize;
            fetchMore = batchData.length === batchSize;
          } else {
            fetchMore = false;
          }
        }
        
        // For ZORDI variables, use pct_change_prev as the value (multiply by 100 since it's stored as decimal)
        if (isZordiVariable) {
          allData = allData.map(obs => ({
            ...obs,
            value: obs.pct_change_prev !== null && obs.pct_change_prev !== undefined 
              ? obs.pct_change_prev * 100  // Convert from decimal to percentage (e.g., -0.115 -> -11.5)
              : obs.value
          }));
        }
        
        const data = allData;
        
        console.log(`📊 Loaded ${data.length} observations for ${selectedVariable.name} (${selectedVariable.key})`);
        
        setMetricData(data as any || []);
      } catch (error) {
        console.error('Error fetching metric data:', error);
        setMetricData([]);
      } finally {
        setLoadingMetricData(false);
      }
    };

    fetchMetricData();
  }, [selectedVariable]);

  // Calculate color scale for heat map
  // Helper to determine if a variable should be displayed as currency
  const isCurrencyVariable = (variable: Variable | null): boolean => {
    if (!variable) return false;
    if (variable.value_type === 'currency') return true;
    // Also treat as currency if name includes rent, price, or income
    const name = variable.name?.toLowerCase() || '';
    const key = variable.key?.toLowerCase() || '';
    // Exclude variables with "demand" in the name (e.g., "Rental Demand")
    if (name.includes('demand')) return false;
    // Exclude ZORDI variables (e.g., "zordi_metro_all")
    if (key.includes('zordi')) return false;
    return name.includes('rent') || name.includes('price') || name.includes('income');
  };

  // Helper to determine if a variable should be displayed as percentage
  const isPercentageVariable = (variable: Variable | null): boolean => {
    if (!variable) return false;
    if (variable.value_type === 'percent') return true;
    const key = variable.key?.toLowerCase() || '';
    // ZORDI variables should be displayed as percentages (they're percentage changes)
    if (key.includes('zordi')) return true;
    return false;
  };

  const getColorForValue = (value: number, min: number, max: number): string => {
    if (max === min) return '#a5b4fc'; // Default color if all values are the same (light purple)
    
    // Clamp value to min/max range (so outliers get the extreme colors)
    const clampedValue = Math.max(min, Math.min(max, value));
    const normalized = (clampedValue - min) / (max - min);
    
    // 5-color scale: blue (low) → white (middle) → red (high)
    const colors = [
      { stop: 0, color: [59, 130, 246] },      // Blue-500 (lowest values)
      { stop: 0.25, color: [147, 197, 253] },  // Blue-300 (low values)
      { stop: 0.5, color: [255, 255, 255] },   // White (medium values)
      { stop: 0.75, color: [252, 165, 165] },  // Red-300 (high values)
      { stop: 1, color: [239, 68, 68] }        // Red-500 (highest values)
    ];
    
    // Find the two colors to interpolate between
    let lowerColor = colors[0];
    let upperColor = colors[1];
    
    for (let i = 0; i < colors.length - 1; i++) {
      if (normalized >= colors[i].stop && normalized <= colors[i + 1].stop) {
        lowerColor = colors[i];
        upperColor = colors[i + 1];
        break;
      }
    }
    
    // Interpolate between the two colors
    const range = upperColor.stop - lowerColor.stop;
    const rangeNormalized = (normalized - lowerColor.stop) / range;
    
    const r = Math.round(lowerColor.color[0] + (upperColor.color[0] - lowerColor.color[0]) * rangeNormalized);
    const g = Math.round(lowerColor.color[1] + (upperColor.color[1] - lowerColor.color[1]) * rangeNormalized);
    const b = Math.round(lowerColor.color[2] + (upperColor.color[2] - lowerColor.color[2]) * rangeNormalized);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Create value lookup map for current geo level
  const createValueMap = () => {
    const geoLevel = getGeoLevel(viewState.zoom);
    const valueMap = new Map<string, { value: number; date: string }>();
    
    // Creating value map for the current geo level
    
    // For national level, calculate average of all state data
    if (geoLevel === 'national') {
      const nationalObs = metricData.find(obs => {
        const geoEntity = Array.isArray(obs.geo_entity) ? obs.geo_entity[0] : obs.geo_entity;
        return geoEntity.geo_level === 'national' || geoEntity.geo_level === 'country';
      });
      
      if (nationalObs) {
        return new Map([['__national__', { value: nationalObs.value, date: nationalObs.date }]]);
      } else {
        // Calculate aggregate from state data - use most recent date
        const stateObs = metricData
          .filter(obs => {
            const geoEntity = Array.isArray(obs.geo_entity) ? obs.geo_entity[0] : obs.geo_entity;
            return geoEntity.geo_level === 'state' && obs.value;
          });
        
        if (stateObs.length > 0) {
          const avgValue = stateObs.reduce((a, b) => a + b.value, 0) / stateObs.length;
          // Use the most recent date from the state observations
          const mostRecentDate = stateObs.reduce((latest, obs) => 
            obs.date > latest ? obs.date : latest, stateObs[0].date
          );
          return new Map([['__national__', { value: avgValue, date: mostRecentDate }]]);
        }
      }
      return valueMap;
    }
    
    metricData.forEach(obs => {
      if (!obs.geo_entity || !obs.value) return;
      
      const geoEntity = Array.isArray(obs.geo_entity) ? obs.geo_entity[0] : obs.geo_entity;
      
      // Match geo_level, accounting for aliases: 'msa' -> 'metro', 'country' -> 'national'
      let entityGeoLevel = geoEntity.geo_level;
      if (entityGeoLevel === 'msa') entityGeoLevel = 'metro';
      if (entityGeoLevel === 'country') entityGeoLevel = 'national';
      if (entityGeoLevel !== geoLevel) return;
      
      // Create lookup key based on geo level
      let key = '';
      if (geoLevel === 'state') {
        key = geoEntity.name; // Match by state name
      } else if (geoLevel === 'metro') {
        // ALWAYS use CBSA code for metro matching - normalize to string and trim
        key = geoEntity.cbsa_code?.toString().trim();
      } else if (geoLevel === 'county') {
        // Use county_fips directly (it already has 'county:' prefix in database)
        key = geoEntity.county_fips || geoEntity.geoid;
      } else if (geoLevel === 'zip') {
        key = geoEntity.zcta; // Match by ZCTA
      }
      
      if (key) {
        valueMap.set(key, { value: obs.value, date: obs.date });
      }
    });
    
    // ValueMap created successfully
    
    return valueMap;
  };

  // Get min and max values for color scaling
  const getValueRange = () => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // Helper function to calculate percentile-based range (excludes outliers)
    const getPercentileRange = (values: number[]) => {
      if (values.length === 0) return { min: 0, max: 0, actualMin: 0, actualMax: 0 };
      
      // Sort values
      const sorted = [...values].sort((a, b) => a - b);
      
      // Get actual min/max
      const actualMin = sorted[0];
      const actualMax = sorted[sorted.length - 1];
      
      // Use 5th and 95th percentiles for color scaling
      const p5Index = Math.floor(sorted.length * 0.05);
      const p95Index = Math.floor(sorted.length * 0.95);
      
      return {
        min: sorted[p5Index] || sorted[0],
        max: sorted[p95Index] || sorted[sorted.length - 1],
        actualMin,
        actualMax
      };
    };
    
    // For national level, use all state values for range
    if (geoLevel === 'national') {
      const values = metricData
        .filter(obs => {
          if (!obs.geo_entity || !obs.value) return false;
          const geoEntity = Array.isArray(obs.geo_entity) ? obs.geo_entity[0] : obs.geo_entity;
          return geoEntity.geo_level === 'state' || geoEntity.geo_level === 'national' || geoEntity.geo_level === 'country';
        })
        .map(obs => obs.value);
      
      return getPercentileRange(values);
    }
    
    const values = metricData
      .filter(obs => {
        if (!obs.geo_entity || !obs.value) return false;
        const geoEntity = Array.isArray(obs.geo_entity) ? obs.geo_entity[0] : obs.geo_entity;
        // Handle aliases: 'msa' -> 'metro', 'country' -> 'national'
        let entityGeoLevel = geoEntity.geo_level;
        if (entityGeoLevel === 'msa') entityGeoLevel = 'metro';
        if (entityGeoLevel === 'country') entityGeoLevel = 'national';
        return entityGeoLevel === geoLevel;
      })
      .map(obs => obs.value);
    
    return getPercentileRange(values);
  };

  // Load national boundaries when at national level
  useEffect(() => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // Load national data when at national level
    if (geoLevel === 'national' && !nationalData && !loadingNational) {
      setLoadingNational(true);
      fetch('/data/us-nation.json')
        .then(response => response.json())
        .then(data => {
          setNationalData(data);
          setLoadingNational(false);
        })
        .catch(error => {
          console.error('Error loading national boundary:', error);
          setLoadingNational(false);
        });
    }
    
    // Clear national data when zooming in from national level
    if (geoLevel !== 'national' && nationalData) {
      setNationalData(null);
    }
  }, [viewState.zoom, nationalData, loadingNational]);

  // Load state boundaries when at state level
  useEffect(() => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // Load state data when at state level
    if (geoLevel === 'state' && !stateData && !loadingStates) {
      setLoadingStates(true);
      fetch('/data/us-states.json')
        .then(response => response.json())
        .then(data => {
          setStateData(data);
          setLoadingStates(false);
        })
        .catch(error => {
          console.error('Error loading states:', error);
          setLoadingStates(false);
        });
    }
    
    // Clear state data when not at state level
    if (geoLevel !== 'state' && geoLevel !== 'national' && stateData) {
      setStateData(null);
    }
  }, [viewState.zoom, stateData, loadingStates]);

  // Load metro boundaries when at metro level
  useEffect(() => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // Load metro data when at metro level
    if (geoLevel === 'metro' && !metroData && !loadingMetros) {
      setLoadingMetros(true);
      fetch('/data/us-metros.json')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // Metro data loaded successfully
          
          // Handle GeometryCollection format (convert to FeatureCollection)
          if (data.type === 'GeometryCollection' && data.geometries) {
            // Converting GeometryCollection to FeatureCollection
            const featureCollection = {
              type: 'FeatureCollection',
              features: data.geometries.map((geometry: any, index: number) => {
                // Geometry properties processed
                return {
                  type: 'Feature',
                  id: geometry.id || index,
                  properties: geometry.properties || {},
                  geometry: {
                    type: geometry.type,
                    coordinates: geometry.coordinates
                  }
                };
              })
            };
            // Feature collection converted
            setMetroData(featureCollection);
            setLoadingMetros(false);
            return;
          }
          
          // Handle standard FeatureCollection format
          if (!data.features || !Array.isArray(data.features)) {
            console.error('Metro data is not a valid GeoJSON FeatureCollection');
            setLoadingMetros(false);
            return;
          }
          
          // Using standard FeatureCollection format
          
          // Clean metro names by removing state abbreviations (everything after comma)
          const cleanedData = {
            ...data,
            features: data.features.map((feature: any) => ({
              ...feature,
              properties: {
                ...feature.properties,
                // Create a cleaned name without state abbreviation
                NAME: feature.properties.NAME?.split(',')[0]?.trim() || feature.properties.NAME,
                NAMELSAD: feature.properties.NAMELSAD?.split(',')[0]?.trim() || feature.properties.NAMELSAD
              }
            }))
          };
          
          setMetroData(cleanedData);
          setLoadingMetros(false);
        })
        .catch(error => {
          console.error('Error loading metro areas:', error);
          setLoadingMetros(false);
          // Metro data not available, user will see the yellow notification
        });
    }
    
    // Clear metro data when zooming out from metro level
    if (geoLevel !== 'metro' && metroData) {
      setMetroData(null);
    }
  }, [viewState.zoom, metroData, loadingMetros]);

  // Load ZIP codes when zooming to zip level (viewport-based)
  useEffect(() => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // Only proceed at zip level
    if (geoLevel !== 'zip') {
      if (zipData) {
        setZipData(null);
        lastZipBoundsRef.current = null;
      }
      return;
    }
    
    // Don't reload if already loading
    if (loadingZips) return;
    
    // Get current map bounds
    const bounds = mapRef.current?.getBounds();
    
    if (!bounds) {
      return;
    }
    
    // Check if we need to reload based on bounds change
    const currentBounds = {
      west: bounds.getWest(),
      east: bounds.getEast(),
      south: bounds.getSouth(),
      north: bounds.getNorth()
    };
    
    // If we have data and bounds haven't changed significantly (within 10%), don't reload
    if (zipData && lastZipBoundsRef.current) {
      const lastBounds = lastZipBoundsRef.current;
      const widthChange = Math.abs((currentBounds.east - currentBounds.west) - (lastBounds.east - lastBounds.west)) / (lastBounds.east - lastBounds.west);
      const heightChange = Math.abs((currentBounds.north - currentBounds.south) - (lastBounds.north - lastBounds.south)) / (lastBounds.north - lastBounds.south);
      const centerLngShift = Math.abs((currentBounds.east + currentBounds.west) / 2 - (lastBounds.east + lastBounds.west) / 2) / (lastBounds.east - lastBounds.west);
      const centerLatShift = Math.abs((currentBounds.north + currentBounds.south) / 2 - (lastBounds.north + lastBounds.south) / 2) / (lastBounds.north - lastBounds.south);
      
      // Only reload if bounds changed significantly (zoomed or panned more than 30%)
      if (widthChange < 0.3 && heightChange < 0.3 && centerLngShift < 0.3 && centerLatShift < 0.3) {
        return;
      }
    }
    
    setLoadingZips(true);
    lastZipBoundsRef.current = currentBounds;
    
    // Load full ZIP data but filter features based on viewport
    fetch('/data/us-zip-codes.json')
      .then(response => response.json())
      .then(data => {
        // Filter features to only include those in viewport
        const filteredFeatures = data.features.filter((feature: any) => {
          if (!feature?.geometry || !feature.geometry.coordinates) return false;
          
          // Get coordinates to check
          const geometry = feature.geometry;
          let coordsToCheck: number[][] = [];
          
          try {
            if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates) && geometry.coordinates[0]) {
              coordsToCheck = geometry.coordinates[0];
            } else if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates) && geometry.coordinates[0]?.[0]) {
              // For MultiPolygon, check the first polygon's outer ring
              coordsToCheck = geometry.coordinates[0][0];
            } else {
              return false; // Invalid geometry structure
            }
            
            // Ensure we have valid coordinates
            if (!Array.isArray(coordsToCheck) || coordsToCheck.length === 0) return false;
            
            // Check if any coordinate is within bounds (with a small buffer)
            const buffer = 0.5; // degrees
            return coordsToCheck.some((coord: number[]) => {
              if (!Array.isArray(coord) || coord.length < 2) return false;
              const [lng, lat] = coord;
              if (typeof lng !== 'number' || typeof lat !== 'number') return false;
              
              return lng >= currentBounds.west - buffer && 
                     lng <= currentBounds.east + buffer && 
                     lat >= currentBounds.south - buffer && 
                     lat <= currentBounds.north + buffer;
            });
          } catch (err) {
            // Skip features with malformed geometry
            return false;
          }
        });
        
        // ZIP codes loaded for viewport
        
        setZipData({
          type: 'FeatureCollection',
          features: filteredFeatures
        });
        setLoadingZips(false);
      })
      .catch(error => {
        console.error('Error loading ZIP codes:', error);
        setLoadingZips(false);
      });
  }, [viewState.zoom, viewState.latitude, viewState.longitude, loadingZips]);
  // Note: Removed the separate moveend listener as we now handle updates in the main effect

  // Load county boundaries when at county level
  useEffect(() => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // Load county data when at county level
    if (geoLevel === 'county' && !countyData && !loadingCounties) {
      // Loading county GeoJSON data
      setLoadingCounties(true);
      fetch('/data/us-counties.json')
        .then(response => response.json())
        .then(data => {
          // County data loaded
          setCountyData(data);
          setLoadingCounties(false);
        })
        .catch(error => {
          console.error('❌ Error loading counties:', error);
          setLoadingCounties(false);
        });
    }
    
    // Clear county data when zooming out from county level
    if (geoLevel !== 'county' && countyData) {
      setCountyData(null);
    }
  }, [viewState.zoom, countyData, loadingCounties]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setHoveredVariable(null);
        setTooltipPosition(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle variable selection
  const handleVariableSelect = (variable: Variable) => {
    setSelectedVariable(variable);
    setIsDropdownOpen(false);
    setHoveredVariable(null);
    setTooltipPosition(null);
  };

  // Render state or national boundaries on the map
  useEffect(() => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // For national level, we need nationalData; for state level, we need stateData
    const requiredData = geoLevel === 'national' ? nationalData : stateData;
    if (!mapRef.current || !mapLoaded || !requiredData) return;
    
    const map = mapRef.current.getMap();
    
    // Skip rendering if we're not at the right level
    if (geoLevel !== 'state' && geoLevel !== 'national') {
      // Remove layers if we're not at the right level
      if (map.getLayer('state-fill')) {
        map.removeLayer('state-fill');
      }
      if (map.getLayer('state-boundaries')) {
        map.removeLayer('state-boundaries');
      }
      if (map.getLayer('state-labels')) {
        map.removeLayer('state-labels');
      }
      if (map.getSource('state-labels-source')) {
        map.removeSource('state-labels-source');
      }
      if (map.getSource('state-boundaries')) {
        map.removeSource('state-boundaries');
      }
      return;
    }
    
    // If a variable is selected but data is still loading, don't render yet
    if (selectedVariable && loadingMetricData) {
      return;
    }
    
    // Remove old state layers if exist
    if (map.getLayer('state-fill')) {
      map.removeLayer('state-fill');
    }
    if (map.getLayer('state-boundaries')) {
      map.removeLayer('state-boundaries');
    }
    if (map.getLayer('state-labels')) {
      map.removeLayer('state-labels');
    }
    if (map.getSource('state-labels-source')) {
      map.removeSource('state-labels-source');
    }
    if (map.getSource('state-boundaries')) {
      map.removeSource('state-boundaries');
    }
    
    const valueMap = createValueMap();
    const { min, max } = getValueRange();
    const isPercentage = isPercentageVariable(selectedVariable);
    const isCurrency = isCurrencyVariable(selectedVariable);
    const isZordi = selectedVariable?.key?.toLowerCase().includes('zordi') || false;
    
    let dataToRender;
    
    if (geoLevel === 'national') {
      // National level: use the us-nation.json file
      const nationalValue = valueMap.get('__national__');
      
      dataToRender = {
        ...nationalData,
        features: nationalData.features.map((feature: any, index: number) => ({
          ...feature,
          id: feature.id || `national-${index}`,
          properties: {
            ...feature.properties,
            name: 'United States',
            value: nationalValue?.value,
            date: nationalValue?.date,
            color: nationalValue?.value !== undefined ? getColorForValue(nationalValue.value, min, max) : '#e5e7eb',
            isPercentage: isPercentage,
            isCurrency: isCurrency,
            isZordi: isZordi,
            isNational: true
          }
        }))
      };
    } else {
      // State level: use us-states.json and show individual state data
      dataToRender = {
        ...stateData,
        features: stateData.features.map((feature: any, index: number) => {
          const stateName = feature.properties.name;
          const dataPoint = valueMap.get(stateName);
          
          return {
            ...feature,
            id: feature.id || `state-${index}`,
            properties: {
              ...feature.properties,
              value: dataPoint?.value,
              date: dataPoint?.date,
              color: dataPoint?.value !== undefined ? getColorForValue(dataPoint.value, min, max) : '#f3f4f6',
              isPercentage: isPercentage,
              isCurrency: isCurrency,
              isZordi: isZordi,
              isNational: false,
              variableName: selectedVariable?.name || ''
            }
          };
        })
      };
    }
    
    map.addSource('state-boundaries', {
      type: 'geojson',
      data: dataToRender,
      generateId: true
    });
    
    // Create a separate deduplicated source for labels only
    let labelFeatures;
    
    if (geoLevel === 'national') {
      // For national level, show only one label in the center of the US
      const firstFeature = dataToRender.features[0];
      labelFeatures = [{
        type: 'Feature',
        id: 'national',
        geometry: {
          type: 'Point',
          coordinates: [-98.5795, 39.8283] // Center of US
        },
        properties: firstFeature.properties
      }];
    } else {
      // For state level, convert to Point features at the centroid to avoid multiple labels for MultiPolygons
      const seenStates = new Set<string>();
      labelFeatures = dataToRender.features
        .filter((feature: any) => {
          const stateName = feature.properties?.name;
          if (!stateName || seenStates.has(stateName)) {
            return false;
          }
          seenStates.add(stateName);
          return true;
        })
        .map((feature: any) => {
          // Use Turf's centerOfMass for better centroid calculation
          const center = centerOfMass(feature);
          
          // Return a Point feature instead of the original polygon
          return {
            type: 'Feature',
            id: feature.id,
            geometry: center.geometry,
            properties: feature.properties
          };
        });
    }
    
    const uniqueStateLabels = {
      type: 'FeatureCollection' as const,
      features: labelFeatures
    };
    
    // State level rendering
    
    map.addSource('state-labels-source', {
      type: 'geojson',
      data: uniqueStateLabels,
      generateId: true
    });
    
    // Add fill layer (for hover effect and heat map)
    map.addLayer({
      id: 'state-fill',
      type: 'fill',
      source: 'state-boundaries',
      paint: {
        'fill-color': selectedVariable && metricData.length > 0
          ? ['get', 'color']
          : '#f3f4f6',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          1.0,
          [
            'case',
            ['has', 'value'],
            0.7, // Normal opacity for data
            0.6  // Slightly more translucent for no data
          ]
        ]
      }
    });
    
    // Add line layer (for borders)
    // For national level, show outer country border; for state level, show state borders
    map.addLayer({
      id: 'state-boundaries',
      type: 'line',
      source: 'state-boundaries',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#4b5563',  // Darker gray on hover
          [
            'case',
            ['has', 'value'],
            geoLevel === 'national' ? '#4b5563' : '#6b7280', // Darker for national, normal gray for states
            '#d1d5db' // Light gray for no data
          ]
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          geoLevel === 'national' ? 5 : 4,  // Extra thick border for hover at national
          geoLevel === 'national' ? 3 : 2   // Thicker normal border at national
        ],
        'line-opacity': geoLevel === 'national' ? 1.0 : 0.8  // Full opacity for national border
      }
    });
    
    // Add text labels for state names and values (using deduplicated source)
    // Use symbol-sort-key with state name to help with deduplication
    map.addLayer({
      id: 'state-labels',
      type: 'symbol',
      source: 'state-labels-source',
      layout: {
        'text-field': [
          'format',
          [
            'case',
            ['get', 'isNational'],
            'United States',
            ['get', 'name']
          ],
          { 'font-scale': ['case', ['get', 'isNational'], 1.3, 0.9] },
          '\n',
          {},
          [
            'case',
            ['has', 'value'],
            // Has value - show it
            [
              'case',
              ['get', 'isZordi'],
              // ZORDI format: already a percentage, show as whole number
              [
                'concat',
                [
                  'number-format',
                  ['round', ['get', 'value']],
                  { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
                ],
                '%'
              ],
              ['get', 'isPercentage'],
              // Percentage format (multiply by 100 for non-ZORDI)
              [
                'concat',
                [
                  'number-format',
                  ['*', ['get', 'value'], 100],
                  { 'min-fraction-digits': 2, 'max-fraction-digits': 2 }
                ],
                '%'
              ],
              ['get', 'isCurrency'],
              // Currency format
              [
                'concat',
                '$',
                [
                  'number-format',
                  ['round', ['get', 'value']],
                  { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
                ]
              ],
              // Default number format
              [
                'number-format',
                ['round', ['get', 'value']],
                { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
              ]
            ],
            // No data - show message
            selectedVariable ? 'No Data' : ''
          ],
          { 'font-scale': [
              'case',
              ['has', 'value'],
              ['case', ['get', 'isNational'], 1.5, 1.1],
              0.6
            ]
          }
        ],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': ['case', ['get', 'isNational'], 18, 13],
        'text-letter-spacing': 0.05,
        'symbol-placement': 'point',
        'symbol-spacing': 100000,
        'text-max-width': 10,
        'text-allow-overlap': geoLevel === 'national'
      },
      paint: {
        'text-color': [
          'case',
          ['has', 'value'],
          '#1f2937', // Normal dark gray for values
          '#9ca3af'  // Light gray for "no data" text
        ],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2.5,
        'text-halo-blur': 1
      }
    });
    
    // Cleanup function
    return () => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        if (map.getLayer('state-labels')) {
          map.removeLayer('state-labels');
        }
        if (map.getLayer('state-fill')) {
          map.removeLayer('state-fill');
        }
        if (map.getLayer('state-boundaries')) {
          map.removeLayer('state-boundaries');
        }
        if (map.getSource('state-labels-source')) {
          map.removeSource('state-labels-source');
        }
        if (map.getSource('state-boundaries')) {
          map.removeSource('state-boundaries');
        }
      }
    };
  }, [stateData, nationalData, mapLoaded, selectedVariable, metricData, viewState.zoom, loadingMetricData]);

  // Render county boundaries on the map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !countyData) return;
    
    // Rendering county layer
    
    const map = mapRef.current.getMap();
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // If we're not at county level, remove layers and return
    if (geoLevel !== 'county') {
      if (map.getLayer('county-fill')) {
        map.removeLayer('county-fill');
      }
      if (map.getLayer('county-boundaries')) {
        map.removeLayer('county-boundaries');
      }
      if (map.getLayer('county-labels')) {
        map.removeLayer('county-labels');
      }
      if (map.getSource('county-boundaries')) {
        map.removeSource('county-boundaries');
      }
      return;
    }
    
    // If a variable is selected but data is still loading, don't render yet
    if (selectedVariable && loadingMetricData) {
      return;
    }
    
    // Remove old county layers if exist
    if (map.getLayer('county-fill')) {
      map.removeLayer('county-fill');
    }
    if (map.getLayer('county-boundaries')) {
      map.removeLayer('county-boundaries');
    }
    if (map.getLayer('county-labels')) {
      map.removeLayer('county-labels');
    }
    if (map.getSource('county-boundaries')) {
      map.removeSource('county-boundaries');
    }
    
    const valueMap = createValueMap();
    const { min, max } = getValueRange();
    const isPercentage = isPercentageVariable(selectedVariable);
    const isCurrency = isCurrencyVariable(selectedVariable);
    const isZordi = selectedVariable?.key?.toLowerCase().includes('zordi') || false;
    
    // DEBUG: Log county matching
    // County level data matching
    
    // Add colors to features based on metric data
    let matchCount = 0;
    const countyDataWithValues = {
      ...countyData,
      features: countyData.features.map((feature: any, index: number) => {
        // Extract FIPS code from GEO_ID (format: '0500000US01001' -> '01001')
        let countyFips = null;
        if (feature.properties.GEO_ID) {
          countyFips = feature.properties.GEO_ID.replace('0500000US', '');
        } else if (feature.properties.GEOID) {
          countyFips = feature.properties.GEOID;
        } else if (feature.properties.geoid) {
          countyFips = feature.properties.geoid;
        } else if (feature.properties.FIPS) {
          countyFips = feature.properties.FIPS;
        } else if (feature.properties.fips) {
          countyFips = feature.properties.fips;
        }
        
        // Try to match with 'county:' prefix
        let dataPoint = null;
        if (countyFips) {
          dataPoint = valueMap.get(`county:${countyFips}`);
        }
        
        if (dataPoint) {
          matchCount++;
        }
        
        return {
          ...feature,
          id: feature.id || `county-${index}`,
          properties: {
            ...feature.properties,
            value: dataPoint?.value,
            date: dataPoint?.date,
            color: dataPoint?.value !== undefined ? getColorForValue(dataPoint.value, min, max) : '#e5e7eb',
            isPercentage: isPercentage,
            isCurrency: isCurrency,
            isZordi: isZordi,
            variableName: selectedVariable?.name || ''
          }
        };
      })
    };
    
    // County matches calculated
    
    map.addSource('county-boundaries', {
      type: 'geojson',
      data: countyDataWithValues,
      generateId: true
    });
    
    // Add fill layer (for hover effect and heat map)
    map.addLayer({
      id: 'county-fill',
      type: 'fill',
      source: 'county-boundaries',
      paint: {
        'fill-color': selectedVariable && metricData.length > 0
          ? ['get', 'color']
          : '#f3f4f6',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          1.0, // Full opacity on hover
          [
            'case',
            ['has', 'value'],
            0.7, // Normal opacity for data
            0.6  // Slightly more translucent for no data
          ]
        ]
      }
    });
    
    // Add line layer (for borders)
    map.addLayer({
      id: 'county-boundaries',
      type: 'line',
      source: 'county-boundaries',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#4b5563', // Darker gray on hover
          [
            'case',
            ['has', 'value'],
            '#6b7280', // Medium gray for data
            '#d1d5db'  // Light gray for no data
          ]
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          3, // Thicker line on hover
          2
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.8, // More opaque on hover
          0.6
        ]
      }
    });
    
    // Add text labels for county names and values
    map.addLayer({
      id: 'county-labels',
      type: 'symbol',
      source: 'county-boundaries',
      layout: {
        'text-field': [
          'format',
          ['get', 'NAME'],
          { 'font-scale': 0.85 }, // Increased from 0.7
          '\n',
          {},
          [
            'case',
            ['has', 'value'],
            // Has value - show it
            [
              'case',
              ['get', 'isZordi'],
              // ZORDI format: already a percentage, show as whole number
              [
                'concat',
                [
                  'number-format',
                  ['round', ['get', 'value']],
                  { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
                ],
                '%'
              ],
              ['get', 'isPercentage'],
              // Percentage format (multiply by 100 for non-ZORDI)
              [
                'concat',
                [
                  'number-format',
                  ['*', ['get', 'value'], 100],
                  { 'min-fraction-digits': 2, 'max-fraction-digits': 2 }
                ],
                '%'
              ],
              ['get', 'isCurrency'],
              // Currency format
              [
                'concat',
                '$',
                [
                  'number-format',
                  ['round', ['get', 'value']],
                  { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
                ]
              ],
              // Default number format
              [
                'number-format',
                ['round', ['get', 'value']],
                { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
              ]
            ],
            // No data - show message
            selectedVariable ? 'No Data' : ''
          ],
          { 'font-scale': [
              'case',
              ['has', 'value'],
              1.1,
              0.6
            ]
          }
        ],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12, // Increased from 10
        'text-letter-spacing': 0.05,
        'text-anchor': 'center',
        'text-justify': 'center',
        'text-max-width': 12
      },
      paint: {
        'text-color': [
          'case',
          ['has', 'value'],
          '#374151', // Normal dark gray for values
          '#9ca3af'  // Light gray for "no data" text
        ],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 1
      }
    });
    
    // Cleanup function
    return () => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        if (map.getLayer('county-labels')) {
          map.removeLayer('county-labels');
        }
        if (map.getLayer('county-fill')) {
          map.removeLayer('county-fill');
        }
        if (map.getLayer('county-boundaries')) {
          map.removeLayer('county-boundaries');
        }
        if (map.getSource('county-boundaries')) {
          map.removeSource('county-boundaries');
        }
      }
    };
  }, [countyData, mapLoaded, selectedVariable, metricData, viewState.zoom, loadingMetricData]);

  // Render metro boundaries on the map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    const map = mapRef.current.getMap();
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // If we're not at metro level, remove layers and return
    if (geoLevel !== 'metro') {
      if (map.getLayer('metro-fill')) {
        map.removeLayer('metro-fill');
      }
      if (map.getLayer('metro-boundaries')) {
        map.removeLayer('metro-boundaries');
      }
      if (map.getLayer('metro-labels')) {
        map.removeLayer('metro-labels');
      }
      if (map.getSource('metro-boundaries')) {
        map.removeSource('metro-boundaries');
      }
      return;
    }
    
    // If metro data isn't loaded yet, show message (handled in UI)
    if (!metroData) {
      // Metro data not available yet
      return;
    }
    
    // If a variable is selected but data is still loading, don't render yet
    if (selectedVariable && loadingMetricData) {
      return;
    }
    
    // CRITICAL: Don't render if we have a variable selected but no data loaded yet
    if (selectedVariable && (!metricData || metricData.length === 0)) {
      // Waiting for metric data before rendering metro layers
      return;
    }
    
    // Remove old metro layers if exist
    if (map.getLayer('metro-fill')) {
      map.removeLayer('metro-fill');
    }
    if (map.getLayer('metro-boundaries')) {
      map.removeLayer('metro-boundaries');
    }
    if (map.getLayer('metro-labels')) {
      map.removeLayer('metro-labels');
    }
    if (map.getSource('metro-boundaries')) {
      map.removeSource('metro-boundaries');
    }
    
    // Check if metroData has features
    if (!metroData.features || !Array.isArray(metroData.features)) {
      console.error('Metro data is invalid or missing features array');
      return;
    }
    
    const valueMap = createValueMap();
    const { min, max } = getValueRange();
    const isPercentage = isPercentageVariable(selectedVariable);
    const isCurrency = isCurrencyVariable(selectedVariable);
    const isZordi = selectedVariable?.key?.toLowerCase().includes('zordi') || false;
    
    // Add colors to features based on metric data
    const metroDataWithValues = {
      ...metroData,
      features: metroData.features.map((feature: any, index: number) => {
        // Match by CBSA code (now using proper Census CBSA codes)
        const cbsaCode = (feature.properties.CBSAFP || feature.properties.cbsa_code || feature.properties.CBSA)?.toString().trim();
        const dataPoint = valueMap.get(cbsaCode);
        
        return {
          ...feature,
          id: feature.id || `metro-${index}`,
          properties: {
            ...feature.properties,
            value: dataPoint?.value, // Keep original value for accurate calculations
            date: dataPoint?.date,
            color: dataPoint?.value !== undefined ? getColorForValue(dataPoint.value, min, max) : '#e5e7eb',
            isPercentage: isPercentage,
            isCurrency: isCurrency,
            isZordi: isZordi,
            variableName: selectedVariable?.name || ''
          }
        };
      })
    };
    
    map.addSource('metro-boundaries', {
      type: 'geojson',
      data: metroDataWithValues,
      generateId: true
    });
    
    // Add fill layer (for hover effect and heat map)
    map.addLayer({
      id: 'metro-fill',
      type: 'fill',
      source: 'metro-boundaries',
      paint: {
        'fill-color': selectedVariable && metricData.length > 0
          ? ['get', 'color']
          : '#f3f4f6',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          1.0, // Full opacity on hover
          [
            'case',
            ['has', 'value'],
            0.7, // Normal opacity for data
            0.6  // Slightly more translucent for no data
          ]
        ]
      }
    });
    
    // Add line layer (for borders)
    map.addLayer({
      id: 'metro-boundaries',
      type: 'line',
      source: 'metro-boundaries',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#4b5563', // Darker gray on hover
          [
            'case',
            ['has', 'value'],
            '#6b7280', // Medium gray for data
            '#d1d5db'  // Light gray for no data
          ]
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          3, // Thicker line on hover
          2
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.8, // More opaque on hover
          0.6
        ]
      }
    });
    
    // Add text labels for metro names and values
    map.addLayer({
      id: 'metro-labels',
      type: 'symbol',
      source: 'metro-boundaries',
      layout: {
        'text-field': [
          'format',
          [
            'coalesce',
            ['get', 'NAME'],
            ['get', 'NAMELSAD'],
            ['get', 'name'],
            'Metro Area'
          ],
          { 'font-scale': 0.85 },
          '\n',
          {},
          [
            'case',
            ['has', 'value'],
            // Has value - show it
            [
              'case',
              ['get', 'isZordi'],
              // ZORDI format: already a percentage, show as whole number
              [
                'concat',
                [
                  'number-format',
                  ['round', ['get', 'value']],
                  { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
                ],
                '%'
              ],
              ['get', 'isPercentage'],
              // Percentage format (multiply by 100 for non-ZORDI)
              [
                'concat',
                [
                  'number-format',
                  ['*', ['get', 'value'], 100],
                  { 'min-fraction-digits': 2, 'max-fraction-digits': 2 }
                ],
                '%'
              ],
              ['get', 'isCurrency'],
              // Currency format
              [
                'concat',
                '$',
                [
                  'number-format',
                  ['round', ['get', 'value']],
                  { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
                ]
              ],
              // Default number format
              [
                'number-format',
                ['round', ['get', 'value']],
                { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
              ]
            ],
            // No data - show message
            selectedVariable ? 'No Data' : ''
          ],
          { 'font-scale': [
              'case',
              ['has', 'value'],
              1.1,
              0.6
            ]
          }
        ],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 13,
        'text-letter-spacing': 0.05,
        'text-anchor': 'center',
        'text-justify': 'center',
        'text-max-width': 12
      },
      paint: {
        'text-color': [
          'case',
          ['has', 'value'],
          '#1f2937', // Normal dark gray for values
          '#9ca3af'  // Light gray for "no data" text
        ],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2.5,
        'text-halo-blur': 1
      }
    });
    
    // Cleanup function
    return () => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        if (map.getLayer('metro-labels')) {
          map.removeLayer('metro-labels');
        }
        if (map.getLayer('metro-fill')) {
          map.removeLayer('metro-fill');
        }
        if (map.getLayer('metro-boundaries')) {
          map.removeLayer('metro-boundaries');
        }
        if (map.getSource('metro-boundaries')) {
          map.removeSource('metro-boundaries');
        }
      }
    };
  }, [metroData, mapLoaded, selectedVariable, metricData, viewState.zoom, loadingMetricData]);

  // Render ZIP code boundaries on the map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !zipData) return;
    
    const map = mapRef.current.getMap();
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // If we're not at ZIP level, remove layers and return
    if (geoLevel !== 'zip') {
      if (map.getLayer('zip-labels')) {
        map.removeLayer('zip-labels');
      }
      if (map.getLayer('zip-fill')) {
        map.removeLayer('zip-fill');
      }
      if (map.getLayer('zip-boundaries')) {
        map.removeLayer('zip-boundaries');
      }
      if (map.getSource('zip-boundaries')) {
        map.removeSource('zip-boundaries');
      }
      return;
    }
    
    // Rendering ZIP data
    
    // If a variable is selected but data is still loading, don't render yet
    if (selectedVariable && loadingMetricData) {
      return;
    }
    
    // Remove old ZIP layers if exist
    if (map.getLayer('zip-labels')) {
      map.removeLayer('zip-labels');
    }
    if (map.getLayer('zip-fill')) {
      map.removeLayer('zip-fill');
    }
    if (map.getLayer('zip-boundaries')) {
      map.removeLayer('zip-boundaries');
    }
    if (map.getSource('zip-boundaries')) {
      map.removeSource('zip-boundaries');
    }
    
    const valueMap = createValueMap();
    const { min, max } = getValueRange();
    const isPercentage = isPercentageVariable(selectedVariable);
    const isCurrency = isCurrencyVariable(selectedVariable);
    const isZordi = selectedVariable?.key?.toLowerCase().includes('zordi') || false;
    
    // Add new ZIP boundaries with generated IDs and colors
    const zipDataWithValues = {
      ...zipData,
      features: zipData.features ? zipData.features.map((feature: any, index: number) => {
        // Try to match by ZCTA/ZIP code
        const zipCode = feature.properties.ZCTA5CE10 || feature.properties.ZCTA || feature.properties.zip || feature.properties.ZIP;
        const dataPoint = valueMap.get(zipCode);
        
        return {
          ...feature,
          id: feature.id || `zip-${index}`,
          properties: {
            ...feature.properties,
            value: dataPoint?.value,
            date: dataPoint?.date,
            color: dataPoint?.value !== undefined ? getColorForValue(dataPoint.value, min, max) : '#e5e7eb',
            isPercentage: isPercentage,
            isCurrency: isCurrency,
            isZordi: isZordi,
            variableName: selectedVariable?.name || ''
          }
        };
      }) : zipData.geometries.map((geometry: any, index: number) => ({
        type: 'Feature',
        id: `zip-${index}`,
        geometry: geometry,
        properties: {
          color: '#e5e7eb',
          isPercentage: isPercentage,
          isCurrency: isCurrency
        }
      }))
    };
    
    // ZIP data processed
    
    const geoJsonData = zipData.features ? zipDataWithValues : {
      type: 'FeatureCollection',
      features: zipDataWithValues.features
    };
    
    try {
      map.addSource('zip-boundaries', {
        type: 'geojson',
        data: geoJsonData,
        generateId: true
      });
      // ZIP source added
    } catch (error) {
      console.error('Error adding ZIP source:', error);
      return;
    }
    
    // Add fill layer (for hover effect and heat map)
    map.addLayer({
      id: 'zip-fill',
      type: 'fill',
      source: 'zip-boundaries',
      paint: {
        'fill-color': selectedVariable && metricData.length > 0
          ? ['get', 'color']
          : '#f3f4f6',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          1.0, // Full opacity on hover
          [
            'case',
            ['has', 'value'],
            0.7, // Normal opacity for data
            0.6  // Slightly more translucent for no data
          ]
        ]
      }
    });
    
    // Add line layer (for borders)
    map.addLayer({
      id: 'zip-boundaries',
      type: 'line',
      source: 'zip-boundaries',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#4b5563', // Darker gray on hover
          [
            'case',
            ['has', 'value'],
            '#6b7280', // Medium gray for data
            '#d1d5db'  // Light gray for no data
          ]
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          4, // Thicker line on hover
          3
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.8, // More opaque on hover
          0.6
        ]
      }
    });
    
    // Add text labels for ZIP codes and values
    map.addLayer({
      id: 'zip-labels',
      type: 'symbol',
      source: 'zip-boundaries',
      layout: {
        'text-field': [
          'format',
          [
            'coalesce',
            ['get', 'ZCTA5CE10'],
            ['get', 'ZCTA'],
            ['get', 'ZIP'],
            ['get', 'zip'],
            'ZIP'
          ],
          { 'font-scale': 0.85 }, // Increased from 0.75
          '\n',
          {},
          [
            'case',
            ['has', 'value'],
            // Has value - show it
            [
              'case',
              ['get', 'isZordi'],
              // ZORDI format: already a percentage, show as whole number
              [
                'concat',
                [
                  'number-format',
                  ['round', ['get', 'value']],
                  { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
                ],
                '%'
              ],
              ['get', 'isPercentage'],
              // Percentage format (multiply by 100 for non-ZORDI)
              [
                'concat',
                [
                  'number-format',
                  ['*', ['get', 'value'], 100],
                  { 'min-fraction-digits': 2, 'max-fraction-digits': 2 }
                ],
                '%'
              ],
              ['get', 'isCurrency'],
              // Currency format
              [
                'concat',
                '$',
                [
                  'number-format',
                  ['round', ['get', 'value']],
                  { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
                ]
              ],
              // Default number format
              [
                'number-format',
                ['round', ['get', 'value']],
                { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }
              ]
            ],
            // No data - show message
            selectedVariable ? 'No Data' : ''
          ],
          { 'font-scale': [
              'case',
              ['has', 'value'],
              1.1,
              0.6
            ]
          }
        ],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12, // Increased from 11
        'text-letter-spacing': 0.05,
        'text-anchor': 'center',
        'text-justify': 'center',
        'text-max-width': 12
      },
      paint: {
        'text-color': [
          'case',
          ['has', 'value'],
          '#1f2937', // Normal dark gray for values
          '#9ca3af'  // Light gray for "no data" text
        ],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2.5,
        'text-halo-blur': 1
      }
    });
    
    // Cleanup function
    return () => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        if (map.getLayer('zip-labels')) {
          map.removeLayer('zip-labels');
        }
        if (map.getLayer('zip-fill')) {
          map.removeLayer('zip-fill');
        }
        if (map.getLayer('zip-boundaries')) {
          map.removeLayer('zip-boundaries');
        }
        if (map.getSource('zip-boundaries')) {
          map.removeSource('zip-boundaries');
        }
      }
    };
  }, [zipData, mapLoaded, selectedVariable, metricData, viewState.zoom, loadingMetricData]);

  // Handle map load
  const handleMapLoad = () => {
    setMapLoaded(true);
    
    // Hide the default Mapbox state boundaries and labels since we'll use our own
    setTimeout(() => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        
        // Hide default state boundary layer
        const stateBoundaryLayer = 'admin-1-boundary';
        if (map.getLayer(stateBoundaryLayer)) {
          map.setLayoutProperty(stateBoundaryLayer, 'visibility', 'none');
        }
        
        // Hide default state label layers
        const stateLabelLayers = [
          'state-label',
          'admin-1-boundary-label', 
          'admin-0-boundary-label',
          'country-label',
          'settlement-major-label',
          'settlement-minor-label'
        ];
        
        stateLabelLayers.forEach(layerId => {
          if (map.getLayer(layerId)) {
            try {
              map.setLayoutProperty(layerId, 'visibility', 'none');
            } catch (e) {
              // Layer might not exist in this style
            }
          }
        });
      }
    }, 1000);
  };

  // Handle window resize to fix map layout issues
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        // Delay resize to allow layout changes to complete
        setTimeout(() => {
          mapRef.current?.resize();
        }, 100);
      }
    };

    // Listen for window resize events
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver to watch the map container for size changes
    let resizeObserver: ResizeObserver | null = null;
    
    if (mapRef.current) {
      const mapContainer = mapRef.current.getMap().getContainer().parentElement;
      
      if (mapContainer) {
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        
        resizeObserver.observe(mapContainer);
      }
    }

    // Also trigger on mount and after a short delay to fix initial layout
    const timeoutId = setTimeout(handleResize, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      clearTimeout(timeoutId);
    };
  }, [mapLoaded]);

  // Handle hover effect for features
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    const map = mapRef.current.getMap();
    
    let currentHoveredId: string | number | null = null;
    let currentHoveredType: 'state' | 'metro' | 'county' | 'zip' | 'national' | null = null;
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const handleMouseMove = (e: any) => {
      const geoLevel = getGeoLevel(viewState.zoom);
      let layerId = '';
      
      // Determine which layer to query based on zoom level
      if (geoLevel === 'national' && nationalData) {
        layerId = 'state-fill';  // Using state-fill source for national boundary
      } else if (geoLevel === 'state' && stateData) {
        layerId = 'state-fill';
      } else if (geoLevel === 'metro' && metroData) {
        layerId = 'metro-fill';
      } else if (geoLevel === 'county' && countyData) {
        layerId = 'county-fill';
      } else if (geoLevel === 'zip' && zipData) {
        layerId = 'zip-fill';
      }
      
      if (!layerId || !map.getLayer(layerId)) return;
      
      const features = map.queryRenderedFeatures(e.point, {
        layers: [layerId]
      });
      
      // Clear previous hover
      if (currentHoveredId !== null && currentHoveredType) {
        try {
          if (currentHoveredType === 'state' || currentHoveredType === 'national') {
            map.setFeatureState(
              { source: 'state-boundaries', id: currentHoveredId },
              { hover: false }
            );
          } else if (currentHoveredType === 'metro') {
            map.setFeatureState(
              { source: 'metro-boundaries', id: currentHoveredId },
              { hover: false }
            );
          } else if (currentHoveredType === 'county') {
            map.setFeatureState(
              { source: 'county-boundaries', id: currentHoveredId },
              { hover: false }
            );
          } else if (currentHoveredType === 'zip') {
            map.setFeatureState(
              { source: 'zip-boundaries', id: currentHoveredId },
              { hover: false }
            );
          }
        } catch (err) {
          // Silently fail
        }
      }
      
      // Set new hover
      if (features.length > 0) {
        const feature = features[0];
        const featureId = feature.id;
        
        if (featureId !== undefined && featureId !== null) {
          map.getCanvas().style.cursor = 'pointer';
          
          try {
            if (geoLevel === 'national') {
              // At national level, highlight the entire country (single feature)
              map.setFeatureState(
                { source: 'state-boundaries', id: featureId },
                { hover: true }
              );
              currentHoveredId = featureId;
              currentHoveredType = 'national';
            } else if (geoLevel === 'state') {
              map.setFeatureState(
                { source: 'state-boundaries', id: featureId },
                { hover: true }
              );
              currentHoveredId = featureId;
              currentHoveredType = 'state';
            } else if (geoLevel === 'metro') {
              map.setFeatureState(
                { source: 'metro-boundaries', id: featureId },
                { hover: true }
              );
              currentHoveredId = featureId;
              currentHoveredType = 'metro';
            } else if (geoLevel === 'county') {
              map.setFeatureState(
                { source: 'county-boundaries', id: featureId },
                { hover: true }
              );
              currentHoveredId = featureId;
              currentHoveredType = 'county';
            } else if (geoLevel === 'zip') {
              map.setFeatureState(
                { source: 'zip-boundaries', id: featureId },
                { hover: true }
              );
              currentHoveredId = featureId;
              currentHoveredType = 'zip';
            }
          } catch (err) {
            // Silently fail
          }
        }
      } else {
        map.getCanvas().style.cursor = geoLevel === 'zip' ? 'crosshair' : 'default';
        currentHoveredId = null;
        currentHoveredType = null;
      }
    };
    
    const handleMouseLeave = () => {
      if (currentHoveredId !== null && currentHoveredType) {
        try {
          if (currentHoveredType === 'state' || currentHoveredType === 'national') {
            map.setFeatureState(
              { source: 'state-boundaries', id: currentHoveredId },
              { hover: false }
            );
          } else if (currentHoveredType === 'metro') {
            map.setFeatureState(
              { source: 'metro-boundaries', id: currentHoveredId },
              { hover: false }
            );
          } else if (currentHoveredType === 'county') {
            map.setFeatureState(
              { source: 'county-boundaries', id: currentHoveredId },
              { hover: false }
            );
          } else if (currentHoveredType === 'zip') {
            map.setFeatureState(
              { source: 'zip-boundaries', id: currentHoveredId },
              { hover: false }
            );
          }
        } catch (err) {
          // Silently fail
        }
      }
      currentHoveredId = null;
      currentHoveredType = null;
      map.getCanvas().style.cursor = '';
    };
    
    map.on('mousemove', handleMouseMove);
    map.on('mouseleave', handleMouseLeave);
    
    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mouseleave', handleMouseLeave);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [mapLoaded, viewState.zoom, stateData, metroData, countyData, zipData, MAPBOX_TOKEN]);

  // Initialize Google Places Autocomplete for location search
  useEffect(() => {
    const initLocationAutocomplete = async () => {
      if (!locationInputRef.current) return;

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

        // Configure autocomplete to show only counties, cities (metros), ZIP codes, and states
        const autocompleteOptions: google.maps.places.AutocompleteOptions = {
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
          types: ['(regions)'] // Include regions: cities, counties, ZIP codes, states
        };

        const autocomplete = new google.maps.places.Autocomplete(
          locationInputRef.current,
          autocompleteOptions
        );

        setLocationAutocomplete(autocomplete);

        // Listen for place selection
        autocomplete.addListener('place_changed', async () => {
          const place = autocomplete.getPlace();
          
          // Place selected
          
          if (!place?.address_components || !place.geometry?.location) {
            // Missing address components or geometry
            return;
          }

          // Extract location information first
          let county = '';
          let city = '';
          let state = '';
          let stateFullName = '';
          let zipCode = '';
          let hasStreetNumber = false;
          let hasRoute = false;

          for (const component of place.address_components) {
            const types = component.types;
            
            if (types.includes('administrative_area_level_2')) {
              county = component.long_name;
            }
            if (types.includes('locality')) {
              city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
              stateFullName = component.long_name;
            }
            if (types.includes('postal_code')) {
              zipCode = component.long_name;
            }
            if (types.includes('street_number')) {
              hasStreetNumber = true;
            }
            if (types.includes('route')) {
              hasRoute = true;
            }
          }

          // Extracted location data

          // Reject if it looks like a street address (has street number AND route)
          if (hasStreetNumber && hasRoute) {
            // Ignoring street address
            return;
          }

          // Check if this is a state-level search (only state, no city/county/zip)
          const isStateSearch = stateFullName && !city && !county && !zipCode;

          // Accept if we have state, county, city, or ZIP code data
          if (!stateFullName && !county && !city && !zipCode) {
            // No valid location data found
            return;
          }

          // Determine the appropriate zoom level and fly to location
          // Use maximum zoom for each level without crossing into the next level
          // Geo levels: national < 3.5, state 3.5-5.5, metro 5.5-7.5, county 7.5-10, zip >= 10
          let zoom = 8;
          let displayName = '';

          if (zipCode) {
            zoom = 11.5; // ZIP level - well into ZIP range
            displayName = zipCode;
          } else if (city) {
            // Prioritize city over county (cities/metros are what people typically search for)
            zoom = 7.4; // Metro level - max zoom before county level (7.5)
            displayName = `${city}${state ? ', ' + state : ''}`;
          } else if (county) {
            zoom = 9.9; // County level - max zoom before ZIP level (10)
            displayName = `${county}${state ? ', ' + state : ''}`;
          } else if (isStateSearch) {
            zoom = 5.4; // State level - max zoom before metro level (5.5)
            displayName = stateFullName;
          }

          // Update search query display
          setLocationSearchQuery(displayName);

          // Fly to the selected location
          if (mapRef.current) {
            // Flying to location
            const map = mapRef.current;
            
            map.flyTo({
              center: [place.geometry.location.lng(), place.geometry.location.lat()],
              zoom: zoom,
              duration: 2000
            });
            
            // Force map to update after flyTo completes
            map.once('moveend', () => {
              // FlyTo completed
              map.resize();
              map.triggerRepaint();
            });
          } else {
            console.error('MapRef is null!');
          }
        });
      } catch (error) {
        console.error('Error loading Google Places for location search:', error);
      }
    };

    initLocationAutocomplete();

    // Cleanup
    return () => {
      if (locationAutocomplete) {
        google.maps.event.clearInstanceListeners(locationAutocomplete);
      }
    };
  }, []);

  // Handle map click
  const handleMapClick = async (_event: any) => {
    // Map click handler - currently not used for heat map
    // Can be used later for showing details on click
  };

  const handleMapMouseMove = (event: any) => {
    if (!mapRef.current || !selectedVariable) {
      setHoveredFeature(null);
      return;
    }

    const map = mapRef.current.getMap();
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // At national level, show a single tooltip for the entire country, not individual states
    if (geoLevel === 'national') {
      // Check if mouse is actually over the national boundary
      if (!map.getLayer('state-fill')) {
        setHoveredFeature(null);
        return;
      }
      
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['state-fill']
      });
      
      // Only show tooltip if mouse is over the national boundary feature
      if (features.length > 0) {
        // Get national data from metricData
        const nationalObs = metricData.find(obs => {
          const geoEntity = Array.isArray(obs.geo_entity) ? obs.geo_entity[0] : obs.geo_entity;
          return geoEntity?.geo_level === 'national' || geoEntity?.geo_level === 'country';
        });
        
        if (nationalObs) {
          setHoveredFeature({
            name: 'United States',
            value: nationalObs.value,
            date: nationalObs.date,
            x: event.point.x,
            y: event.point.y
          });
        } else {
          setHoveredFeature(null);
        }
      } else {
        // Mouse is not over the national boundary
        setHoveredFeature(null);
      }
      return;
    }
    
    // Determine which layer to query based on current zoom level
    let layerToQuery: string;
    if (geoLevel === 'state') {
      layerToQuery = 'state-fill';
    } else if (geoLevel === 'metro') {
      layerToQuery = 'metro-fill';
    } else if (geoLevel === 'county') {
      layerToQuery = 'county-fill';
    } else {
      layerToQuery = 'zip-fill';
    }
    
    // Check if the layer exists before querying
    if (!map.getLayer(layerToQuery)) {
      setHoveredFeature(null);
      return;
    }
    
    // Only query the layer that exists at this zoom level
    const features = map.queryRenderedFeatures(event.point, {
      layers: [layerToQuery]
    });

    if (features.length > 0) {
      const feature = features[0];
      const props = feature.properties;
      
      if (props && props.value) {
        const name = props.name || 
                     props.NAME || 
                     props.ZCTA5CE10 || 
                     props.ZCTA ||
                     'Unknown';
        
        setHoveredFeature({
          name,
          value: props.value,
          date: props.date,
          x: event.point.x,
          y: event.point.y
        });
      } else {
        setHoveredFeature(null);
      }
    } else {
      setHoveredFeature(null);
    }
  };

  // Group database variables by category
  const groupedDatabaseVariables = databaseVariables.reduce((acc, variable) => {
    const category = variable.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(variable);
    return acc;
  }, {} as Record<string, Variable[]>);

  const filteredDatabaseVariables = Object.entries(groupedDatabaseVariables)
    .reduce((acc, [category, variables]) => {
      const filtered = variables.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    }, {} as Record<string, Variable[]>);

  return (
    <div className="relative">
      {/* Map Container - Full Height */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="relative w-full h-[800px]">
          {/* Overlaid Controls - Top */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col md:flex-row gap-3 w-auto max-w-4xl">
            {/* Location Search */}
            <div className="w-80" onMouseEnter={() => setHoveredFeature(null)}>
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    ref={locationInputRef}
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Search County, City, or ZIP"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Variable Selection */}
            <div className="w-80" onMouseEnter={() => setHoveredFeature(null)}>
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Variable
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className="flex-1 text-left truncate">
                      {selectedVariable ? selectedVariable.name : 'Select variable'}
                    </span>
                    {isDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100] max-h-[500px] overflow-y-auto">
              {/* Search Bar */}
              <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search variables..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm"
                />
              </div>

              <div className="p-2">
                {loadingVariables ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading variables...</span>
                  </div>
                ) : (
                  <>
                    {/* Database Variables grouped by category */}
                    {Object.entries(filteredDatabaseVariables).length > 0 ? (
                      Object.entries(filteredDatabaseVariables)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([category, variables]) => (
                          <div key={category} className="mt-2">
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                              {category}
                            </div>
                            {variables.map((variable) => (
                              <div key={variable.id} className="relative">
                                <button
                                  onClick={() => handleVariableSelect(variable)}
                                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                    selectedVariable?.id === variable.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{variable.name}</span>
                                    {variable.description && (
                                      <div
                                        onMouseEnter={(e) => {
                                          e.stopPropagation();
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setHoveredVariable(variable.id);
                                          setTooltipPosition({
                                            x: rect.right,
                                            y: rect.top + rect.height / 2
                                          });
                                        }}
                                        onMouseLeave={(e) => {
                                          e.stopPropagation();
                                          setHoveredVariable(null);
                                          setTooltipPosition(null);
                                        }}
                                        className="flex-shrink-0"
                                      >
                                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                      </div>
                                    )}
                                  </div>
                                </button>
                              </div>
                            ))}
                          </div>
                        ))
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No variables found
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tooltip Portal - rendered outside dropdown */}
          {hoveredVariable && tooltipPosition && (() => {
            const variable = databaseVariables.find(v => v.id === hoveredVariable);
            if (!variable || !variable.description) return null;
            
            const source = variable.key ? (variableSources[variable.key] || 'Realtor.com') : 'Realtor.com';
            const geoLevels = variable.key ? variableGeoLevels[variable.key] : null;
            
            return (
              <div 
                className="fixed z-[9999] w-80 p-3 bg-white/85 dark:bg-gray-800/85 backdrop-blur-md text-xs rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg pointer-events-none"
                style={{
                  left: `${tooltipPosition.x + 35}px`,
                  top: `${tooltipPosition.y}px`,
                  transform: 'translateY(-50%)',
                  maxWidth: 'calc(100vw - 2rem)'
                }}
              >
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white/85 dark:border-r-gray-800/85"></div>
                <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{variable.name}</div>
                <div className="text-gray-700 dark:text-gray-300 mb-2">{variable.description}</div>
                <div className="text-gray-600 dark:text-gray-400 text-[10px] italic">Source: {source}</div>
                {geoLevels && (
                  <div className="text-gray-600 dark:text-gray-400 text-[10px] mt-1">
                    <span className="font-semibold">Available levels:</span> {geoLevels}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Loading/Status Indicators */}
          {(loadingStates || loadingZips || loadingCounties || loadingMetros || loadingNational || loadingMetricData) && (
            <div className="absolute top-40 left-1/2 -translate-x-1/2 z-10 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {loadingMetricData ? 'Loading data...' : loadingNational ? 'Loading national boundaries...' : loadingStates ? 'Loading state boundaries...' : loadingMetros ? 'Loading metro areas...' : loadingZips ? 'Loading ZIP boundaries...' : loadingCounties ? 'Loading county boundaries...' : 'Loading...'}
              </span>
            </div>
          )}
          
          {/* Metro data not available message */}
          {getGeoLevel(viewState.zoom) === 'metro' && !metroData && !loadingMetros && (
            <div className="absolute top-40 left-1/2 -translate-x-1/2 z-10 bg-yellow-50/60 dark:bg-yellow-900/60 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-yellow-200/50 dark:border-yellow-700/50 text-center">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Metro area data not available
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                Add us-metros.json to /public/data/ or zoom in/out to see other levels
              </p>
            </div>
          )}

          {/* Overlaid Bottom Controls */}
          {/* Current Level Indicator - Bottom Left */}
          <div className="absolute bottom-8 left-4 z-20">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Level: {getGeoLevel(viewState.zoom).toUpperCase()}
                </span>
                {' • '}
                <span className="text-xs">
                  {getGeoLevel(viewState.zoom) === 'national' && 'Zoom in to see state level'}
                  {getGeoLevel(viewState.zoom) === 'state' && 'Zoom in to see metro level'}
                  {getGeoLevel(viewState.zoom) === 'metro' && 'Zoom in for county level'}
                  {getGeoLevel(viewState.zoom) === 'county' && 'Zoom in for ZIP codes'}
                  {getGeoLevel(viewState.zoom) === 'zip' && 'Zoom out to see county level'}
                </span>
              </p>
              <div className="mt-2 pt-2 border-t border-gray-300/50 dark:border-gray-600/50">
                <label className="flex items-center cursor-pointer text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={showTooltip}
                    onChange={(e) => setShowTooltip(e.target.checked)}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span>Show hover tooltip</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Color Legend - Bottom Right */}
          {selectedVariable && metricData.length > 0 && (() => {
            const { min, max, actualMin, actualMax } = getValueRange();
            if (min === 0 && max === 0) return null;
            
            const isPercentage = isPercentageVariable(selectedVariable);
            const isCurrency = isCurrencyVariable(selectedVariable);
            const isZordi = selectedVariable.key?.toLowerCase().includes('zordi') || false;
            
            const formatValue = (val: number) => {
              if (isPercentage) {
                if (isZordi) {
                  // ZORDI values are already percentages, just format as whole number
                  return `${Math.round(val)}%`;
                }
                return `${(val * 100).toFixed(2)}%`;
              }
              if (isCurrency) {
                return `$${Math.round(val).toLocaleString()}`;
              }
              return Math.round(val).toLocaleString();
            };
            
            return (
              <div className="absolute bottom-8 right-4 z-20">
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{formatValue(actualMin)}</span>
                    <div className="w-32 h-3 rounded" style={{
                      background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(147, 197, 253), rgb(255, 255, 255), rgb(252, 165, 165), rgb(239, 68, 68))'
                    }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{formatValue(actualMax)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Hover Tooltip */}
          {showTooltip && hoveredFeature && selectedVariable && (() => {
            const isPercentage = isPercentageVariable(selectedVariable);
            const isCurrency = isCurrencyVariable(selectedVariable);
            const description = selectedVariable.description || '';
            const source = selectedVariable.key ? (variableSources[selectedVariable.key] || 'Realtor.com') : 'Realtor.com';
            const isZordi = selectedVariable.key?.toLowerCase().includes('zordi') || false;
            
            const formatValue = (val: number) => {
              if (isPercentage) {
                if (isZordi) {
                  // ZORDI values are already percentages, just format as whole number
                  return `${Math.round(val)}%`;
                }
                return `${(val * 100).toFixed(2)}%`;
              }
              if (isCurrency) {
                return `$${Math.round(val).toLocaleString()}`;
              }
              return Math.round(val).toLocaleString();
            };

            const formatDate = (dateStr: string) => {
              // Parse date without timezone conversion
              const [year, month] = dateStr.split('-');
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
              return `${monthNames[parseInt(month) - 1]} ${year}`;
            };

            // Calculate tooltip position to avoid cursor overlap
            const horizontalOffset = 100; // 100 pixels to the left
            const verticalOffset = 20; // Smaller vertical offset
            const viewportHeight = window.innerHeight;
            const estimatedTooltipHeight = 200; // approximate
            
            // Position tooltip 300px to the left of cursor
            let tooltipX = hoveredFeature.x - horizontalOffset;
            let tooltipY = hoveredFeature.y + verticalOffset;
            
            // If tooltip would go off left edge, position to right of cursor
            if (tooltipX < 0) {
              tooltipX = hoveredFeature.x + horizontalOffset;
            }
            
            // If tooltip would go off bottom edge, position above cursor
            if (tooltipY + estimatedTooltipHeight > viewportHeight) {
              tooltipY = hoveredFeature.y - estimatedTooltipHeight - verticalOffset;
            }

            return (
              <div 
                className="fixed z-50 pointer-events-none"
                style={{
                  left: `${tooltipX}px`,
                  top: `${tooltipY}px`
                }}
              >
                <div className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md text-xs rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-3 max-w-xs">
                  <div className="font-bold text-sm mb-1 text-gray-900 dark:text-gray-100">{hoveredFeature.name}</div>
                  <div className="font-semibold text-base mb-2" style={{ color: '#0D98BA' }}>
                    {selectedVariable.name}: {formatValue(hoveredFeature.value)}
                  </div>
                  {hoveredFeature.date && (
                    <div className="text-gray-700 dark:text-gray-300 text-[11px] mb-2">
                      {formatDate(hoveredFeature.date)}
                    </div>
                  )}
                  {description && (
                    <div className="text-gray-700 dark:text-gray-300 mb-2 text-xs leading-relaxed">
                      {description}
                    </div>
                  )}
                  <div className="text-gray-600 dark:text-gray-400 text-[10px] italic mb-1">
                    Source: {source}
                  </div>
                  <div className="font-semibold text-sm border-t border-gray-300/50 dark:border-gray-600/50 pt-2 mt-2" style={{ color: '#0D98BA' }}>
                    Click area to view historical data
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Map Component */}
          <MapGL
            ref={mapRef}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onClick={handleMapClick}
            onLoad={handleMapLoad}
            onMouseMove={handleMapMouseMove}
            onMouseLeave={() => setHoveredFeature(null)}
            cursor={hoveredFeature ? 'pointer' : 'grab'}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
            maxBounds={US_BOUNDS}
            minZoom={2}
            maxZoom={15}
          >
            <NavigationControl position="top-right" />
          </MapGL>
        </div>
      </div>
    </div>
  );
}



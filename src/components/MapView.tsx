import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Map as MapGL, NavigationControl, Marker, Source, Layer } from 'react-map-gl';
import type { MapRef, LayerProps } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

export default function MapView() {
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number; name: string } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [stateData, setStateData] = useState<any>(null);
  const [zipData, setZipData] = useState<any>(null);
  const [countyData, setCountyData] = useState<any>(null);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingZips, setLoadingZips] = useState(false);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [hoveredZipCode, setHoveredZipCode] = useState<string | null>(null);
  const [zipHoverPosition, setZipHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [zipOnlyWarning, setZipOnlyWarning] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);
  const zipCodeCacheRef = useRef<Map<string, string>>(new Map());
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restrict map to US boundaries
  const US_BOUNDS: [[number, number], [number, number]] = [
    [-171.791110603, 18.91619], // Southwest coordinates (includes Alaska and Hawaii)
    [-66.96466, 71.3577635769]  // Northeast coordinates
  ];

  // Mapbox token
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // Initial map view (centered on US)
  const [viewState, setViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3.5
  });

  // Determine geo-level based on zoom level
  const getGeoLevel = (zoom: number): 'state' | 'county' | 'zip' => {
    if (zoom < 5) return 'state';
    if (zoom < 10) return 'county';
    return 'zip';
  };

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
    
    // Clear state data when zooming out from state level
    if (geoLevel !== 'state' && stateData) {
      setStateData(null);
    }
  }, [viewState.zoom, stateData, loadingStates]);

  // Load ZIP codes when zooming to zip level
  useEffect(() => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // Load ZIP data when at zip level
    if (geoLevel === 'zip' && !zipData && !loadingZips) {
      setLoadingZips(true);
      fetch('/data/us-zip-codes.json')
        .then(response => response.json())
        .then(data => {
          setZipData(data);
          setLoadingZips(false);
        })
        .catch(error => {
          console.error('Error loading ZIP codes:', error);
          setLoadingZips(false);
        });
    }
    
    // Clear ZIP data when zooming out from zip level
    if (geoLevel !== 'zip' && zipData) {
      setZipData(null);
    }
  }, [viewState.zoom, zipData, loadingZips]);

  // Load county boundaries when at county level
  useEffect(() => {
    const geoLevel = getGeoLevel(viewState.zoom);
    
    // Load county data when at county level
    if (geoLevel === 'county' && !countyData && !loadingCounties) {
      setLoadingCounties(true);
      fetch('/data/us-counties.json')
        .then(response => response.json())
        .then(data => {
          setCountyData(data);
          setLoadingCounties(false);
        })
        .catch(error => {
          console.error('Error loading counties:', error);
          setLoadingCounties(false);
        });
    }
    
    // Clear county data when zooming out from county level
    if (geoLevel !== 'county' && countyData) {
      setCountyData(null);
    }
  }, [viewState.zoom, countyData, loadingCounties]);

  // Control visibility of admin layers based on zoom
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    const map = mapRef.current.getMap();
    
    // Keep default Mapbox state boundaries hidden since we use our own
    const stateBoundaryLayer = 'admin-1-boundary';
    if (map.getLayer(stateBoundaryLayer)) {
      try {
        map.setLayoutProperty(stateBoundaryLayer, 'visibility', 'none');
      } catch (e) {
        // Silently fail
      }
    }
  }, [viewState.zoom, mapLoaded]);

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
    'Single Family',
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

  // Variable categories with actual counts (same as Timeline View)
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
      count: 7,
      variables: [
        { id: 'air_quality', name: 'Air Quality Index' },
        { id: 'walkability', name: 'Walkability Score' },
        { id: 'green_space', name: 'Green Space Percentage' },
        { id: 'Min_Temperature', name: 'Min Temperature' },
        { id: 'Max_Temperature', name: 'Max Temperature' },
        { id: 'Mean_Snowfall', name: 'Snowfall' },
        { id: 'Mean_Temperature', name: 'Temperature' },
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

  // Helper function to check if a variable is a Pro variable
  const isProVariable = (variable: Variable | null) => {
    if (!variable) return false;
    return rentalMarketVariables.some(v => v.id === variable.id) || 
           saleMarketVariables.some(v => v.id === variable.id);
  };

  // Handle variable selection
  const handleVariableSelect = (variable: Variable) => {
    setSelectedVariable(variable);
    setIsDropdownOpen(false);
  };

  // Render state boundaries on the map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !stateData) return;
    
    const map = mapRef.current.getMap();
    
    // Remove old state layers if exist
    if (map.getLayer('state-fill')) {
      map.removeLayer('state-fill');
    }
    if (map.getLayer('state-boundaries')) {
      map.removeLayer('state-boundaries');
    }
    if (map.getSource('state-boundaries')) {
      map.removeSource('state-boundaries');
    }
    
    // Add new state boundaries with generated IDs
    const stateDataWithIds = {
      ...stateData,
      features: stateData.features.map((feature: any, index: number) => ({
        ...feature,
        id: feature.id || `state-${index}`
      }))
    };
    
    map.addSource('state-boundaries', {
      type: 'geojson',
      data: stateDataWithIds,
      generateId: true
    });
    
    // Add fill layer (for hover effect)
    map.addLayer({
      id: 'state-fill',
      type: 'fill',
      source: 'state-boundaries',
      paint: {
        'fill-color': '#6366f1',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.3,
          0
        ]
      }
    });
    
    // Add line layer (for borders)
    map.addLayer({
      id: 'state-boundaries',
      type: 'line',
      source: 'state-boundaries',
      paint: {
        'line-color': '#6366f1',
        'line-width': 2,
        'line-opacity': 0.6
      }
    });
    
    // Add text labels for state names
    map.addLayer({
      id: 'state-labels',
      type: 'symbol',
      source: 'state-boundaries',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 14,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2
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
        if (map.getSource('state-boundaries')) {
          map.removeSource('state-boundaries');
        }
      }
    };
  }, [stateData, mapLoaded]);

  // Render county boundaries on the map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !countyData) return;
    
    const map = mapRef.current.getMap();
    
    // Remove old county layers if exist
    if (map.getLayer('county-fill')) {
      map.removeLayer('county-fill');
    }
    if (map.getLayer('county-boundaries')) {
      map.removeLayer('county-boundaries');
    }
    if (map.getSource('county-boundaries')) {
      map.removeSource('county-boundaries');
    }
    
    // Add new county boundaries with generated IDs
    const countyDataWithIds = {
      ...countyData,
      features: countyData.features.map((feature: any, index: number) => ({
        ...feature,
        id: feature.id || `county-${index}`
      }))
    };
    
    map.addSource('county-boundaries', {
      type: 'geojson',
      data: countyDataWithIds,
      generateId: true
    });
    
    // Add fill layer (for hover effect)
    map.addLayer({
      id: 'county-fill',
      type: 'fill',
      source: 'county-boundaries',
      paint: {
        'fill-color': '#6366f1',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.3,
          0
        ]
      }
    });
    
    // Add line layer (for borders)
    map.addLayer({
      id: 'county-boundaries',
      type: 'line',
      source: 'county-boundaries',
      paint: {
        'line-color': '#6366f1',
        'line-width': 2,
        'line-opacity': 0.7
      }
    });
    
    // Add text labels for county names
    map.addLayer({
      id: 'county-labels',
      type: 'symbol',
      source: 'county-boundaries',
      layout: {
        'text-field': ['get', 'NAME'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.05
      },
      paint: {
        'text-color': '#374151',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
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
  }, [countyData, mapLoaded]);

  // Render ZIP code boundaries on the map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !zipData) return;
    
    const map = mapRef.current.getMap();
    
    // Remove old ZIP layers if exist
    if (map.getLayer('zip-fill')) {
      map.removeLayer('zip-fill');
    }
    if (map.getLayer('zip-boundaries')) {
      map.removeLayer('zip-boundaries');
    }
    if (map.getSource('zip-boundaries')) {
      map.removeSource('zip-boundaries');
    }
    
    // Add new ZIP boundaries with generated IDs
    const zipDataWithIds = {
      ...zipData,
      features: zipData.features ? zipData.features.map((feature: any, index: number) => ({
        ...feature,
        id: feature.id || `zip-${index}`
      })) : zipData.geometries.map((geometry: any, index: number) => ({
        type: 'Feature',
        id: `zip-${index}`,
        geometry: geometry,
        properties: {}
      }))
    };
    
    const geoJsonData = zipData.features ? zipDataWithIds : {
      type: 'FeatureCollection',
      features: zipDataWithIds.features
    };
    
    map.addSource('zip-boundaries', {
      type: 'geojson',
      data: geoJsonData,
      generateId: true
    });
    
    // Add fill layer (for hover effect)
    map.addLayer({
      id: 'zip-fill',
      type: 'fill',
      source: 'zip-boundaries',
      paint: {
        'fill-color': '#6366f1',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.3,
          0
        ]
      }
    });
    
    // Add line layer (for borders)
    map.addLayer({
      id: 'zip-boundaries',
      type: 'line',
      source: 'zip-boundaries',
      paint: {
        'line-color': '#6366f1',
        'line-width': 3,
        'line-opacity': 0.8
      }
    });
    
    // Cleanup function
    return () => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
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
  }, [zipData, mapLoaded]);

  // Handle map load
  const handleMapLoad = () => {
    setMapLoaded(true);
    
    // Hide the default Mapbox state boundaries since we'll use our own
    setTimeout(() => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        
        const stateBoundaryLayer = 'admin-1-boundary';
        if (map.getLayer(stateBoundaryLayer)) {
          map.setLayoutProperty(stateBoundaryLayer, 'visibility', 'none');
        }
      }
    }, 1000);
  };

  // Handle hover effect for features
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    const map = mapRef.current.getMap();
    
    let currentHoveredId: string | number | null = null;
    let currentHoveredType: 'state' | 'county' | 'zip' | null = null;
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const handleMouseMove = (e: any) => {
      const geoLevel = getGeoLevel(viewState.zoom);
      let layerId = '';
      
      // Clear ZIP tooltip if not at zip level
      if (geoLevel !== 'zip') {
        setHoveredZipCode(null);
        setZipHoverPosition(null);
      }
      
      // Determine which layer to query based on zoom level
      if (geoLevel === 'state' && stateData) {
        layerId = 'state-fill';
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
          if (currentHoveredType === 'state') {
            map.setFeatureState(
              { source: 'state-boundaries', id: currentHoveredId },
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
            if (geoLevel === 'state') {
              map.setFeatureState(
                { source: 'state-boundaries', id: featureId },
                { hover: true }
              );
              currentHoveredId = featureId;
              currentHoveredType = 'state';
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
              
              // Update tooltip position immediately
              setZipHoverPosition({ x: e.point.x, y: e.point.y });
              
              // Use feature ID for caching to avoid duplicate calls for the same polygon
              const cacheKey = `zip-${featureId}`;
              const cachedZip = zipCodeCacheRef.current.get(cacheKey);
              
              if (cachedZip) {
                setHoveredZipCode(cachedZip);
              } else {
                // Clear any pending API calls
                if (debounceTimer) clearTimeout(debounceTimer);
                
                // Only fetch once per polygon
                debounceTimer = setTimeout(() => {
                  // Fetch ZIP code from Mapbox API using the centroid of the feature
                  fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${e.lngLat.lng},${e.lngLat.lat}.json?access_token=${MAPBOX_TOKEN}&types=postcode`)
                    .then(response => response.json())
                    .then(data => {
                      if (data.features && data.features.length > 0) {
                        const zipCode = data.features[0].text;
                        zipCodeCacheRef.current.set(cacheKey, zipCode);
                        setHoveredZipCode(zipCode);
                      }
                    })
                    .catch(() => {
                      // Silently fail
                    });
                }, 50);
              }
            }
          } catch (err) {
            // Silently fail
          }
        }
      } else {
        map.getCanvas().style.cursor = geoLevel === 'zip' ? 'crosshair' : 'default';
        currentHoveredId = null;
        currentHoveredType = null;
        setHoveredZipCode(null);
        setZipHoverPosition(null);
      }
    };
    
    const handleMouseLeave = () => {
      if (currentHoveredId !== null && currentHoveredType) {
        try {
          if (currentHoveredType === 'state') {
            map.setFeatureState(
              { source: 'state-boundaries', id: currentHoveredId },
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
      setHoveredZipCode(null);
      setZipHoverPosition(null);
    };
    
    map.on('mousemove', handleMouseMove);
    map.on('mouseleave', handleMouseLeave);
    
    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mouseleave', handleMouseLeave);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [mapLoaded, viewState.zoom, stateData, countyData, zipData, MAPBOX_TOKEN]);

  // Handle map click
  const handleMapClick = async (event: any) => {
    if (!selectedVariable) {
      alert('Please select a variable first');
      return;
    }

    const { lngLat } = event;
    const geoLevel = getGeoLevel(viewState.zoom);

    // Check if selected variable is ZIP-only and user is not at ZIP level
    const isZipOnlyVariable = isProVariable(selectedVariable);
    if (isZipOnlyVariable && geoLevel !== 'zip') {
      // Show warning message
      setZipOnlyWarning({ x: event.point.x, y: event.point.y, show: true });
      
      // Clear any existing timeout
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      
      // Hide warning after 3 seconds
      warningTimeoutRef.current = setTimeout(() => {
        setZipOnlyWarning({ x: 0, y: 0, show: false });
      }, 3000);
      
      return;
    }

    setIsGenerating(true);

    try {
      // Reverse geocode to get location name
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${MAPBOX_TOKEN}&types=${geoLevel === 'zip' ? 'postcode' : geoLevel === 'county' ? 'place' : 'region'}`;
      
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (!geocodeData.features || geocodeData.features.length === 0) {
        alert('Could not determine location. Please try clicking on a different area.');
        setIsGenerating(false);
        return;
      }

      const feature = geocodeData.features[0];
      const locationName = feature.text || feature.place_name;

      // Set the selected location marker
      setSelectedLocation({
        lng: lngLat.lng,
        lat: lngLat.lat,
        name: locationName
      });

      // Prepare webhook data - Map View uses actual geo levels (state, county, zip)
      const requestBody: any = {
        locationType: geoLevel,  // 'state', 'county', or 'zip'
        locations: [locationName],  // Array with single location for Map View
        variable: {
          id: selectedVariable.id,
          name: selectedVariable.name,
          description: selectedVariable.description
        }
      };

      // Check if this is a RentCast variable (rental or sale market)
      const isRentalMarket = rentalMarketVariables.some(v => v.id === selectedVariable.id);
      const isSaleMarket = saleMarketVariables.some(v => v.id === selectedVariable.id);
      const isRentcastVariable = isRentalMarket || isSaleMarket;

      // Add RentCast-specific data if it's a paid variable
      if (isRentcastVariable) {
        requestBody.source = 'rentcast';
        requestBody.marketType = isRentalMarket ? 'Rental' : 'Sale';

        // Add filters based on market type
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

      console.log('Sending to webhook:', requestBody);

      // Call the map-view webhook
      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/map-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data from webhook');
      }

      const data = await response.json();
      console.log('Webhook response:', data);

      // TODO: Handle webhook response data here
      // For now, just log it
      alert(`Data received for ${locationName}! Check console for details.`);

    } catch (error) {
      console.error('Error fetching location data:', error);
      alert(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
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
      {/* Variable Selection - Single Dropdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-base font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">
          1. Select Variable to Visualize
        </label>
        <div className="max-w-md mx-auto relative" ref={dropdownRef}>
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
                {/* Premium Market Data */}
                {(filteredRentalVariables.length > 0 || filteredSaleVariables.length > 0) && (
                  <>
                    {/* Rental Market */}
                    {filteredRentalVariables.length > 0 && (
                      <div className="mt-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                          Rental Market
                        </div>
                        {filteredRentalVariables.map((variable) => (
                          <button
                            key={variable.id}
                            onClick={() => handleVariableSelect(variable)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                              selectedVariable?.id === variable.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300">{variable.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs bg-gray-400 dark:bg-gray-600 text-white px-2 py-0.5 rounded">Zip</span>
                              <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded">PRO</span>
                            </div>
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
                        {filteredSaleVariables.map((variable) => (
                          <button
                            key={variable.id}
                            onClick={() => handleVariableSelect(variable)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                              selectedVariable?.id === variable.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300">{variable.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs bg-gray-400 dark:bg-gray-600 text-white px-2 py-0.5 rounded">Zip</span>
                              <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded">PRO</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Free Variables by Category */}
                {filteredCategories.map((category) => (
                  <div key={category.id} className="mt-2">
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                      {category.name}
                    </div>
                    {category.variables.map((variable) => (
                      <button
                        key={variable.id}
                        onClick={() => handleVariableSelect(variable)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                          selectedVariable?.id === variable.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{variable.name}</span>
                          {variable.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{variable.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-xs bg-gray-400 dark:bg-gray-600 text-white px-1.5 py-0.5 rounded">Zip</span>
                          <span className="text-xs bg-gray-400 dark:bg-gray-600 text-white px-1.5 py-0.5 rounded">County</span>
                          <span className="text-xs bg-gray-400 dark:bg-gray-600 text-white px-1.5 py-0.5 rounded">State</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pro Variable Filters - Only show when Pro variable is selected */}
          {selectedVariable && 
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

      {/* Map Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 pt-4 pb-2">
          <label className="block text-base font-medium text-gray-900 dark:text-gray-100 text-center">
            2. Click anywhere on the map to view data for that location. Zoom in to see County and ZIP. 
          </label>
        </div>
        <div className="relative w-full h-[600px]">
          {(isGenerating || loadingStates || loadingZips || loadingCounties) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {loadingStates ? 'Loading state boundaries...' : loadingZips ? 'Loading ZIP boundaries...' : loadingCounties ? 'Loading county boundaries...' : 'Loading data...'}
              </span>
            </div>
          )}

          {/* ZIP Code Tooltip */}
          {hoveredZipCode && zipHoverPosition && (
            <div 
              className="absolute z-20 pointer-events-none"
              style={{
                left: `${zipHoverPosition.x}px`,
                top: `${zipHoverPosition.y - 40}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-semibold">
                ZIP: {hoveredZipCode}
              </div>
            </div>
          )}

          {/* ZIP-Only Variable Warning */}
          {zipOnlyWarning.show && (
            <div 
              className="absolute z-20 pointer-events-none animate-fade-in"
              style={{
                left: `${zipOnlyWarning.x}px`,
                top: `${zipOnlyWarning.y - 60}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="bg-gray-700 dark:bg-gray-600 text-white px-4 py-3 rounded-lg shadow-xl max-w-xs">
                <div className="text-sm font-semibold mb-1">ZIP Code Level Only</div>
                <div className="text-xs">This variable is only available at ZIP code level. Please zoom in further.</div>
              </div>
            </div>
          )}

          <MapGL
            ref={mapRef}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onClick={handleMapClick}
            onLoad={handleMapLoad}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
            maxBounds={US_BOUNDS}
            minZoom={3}
            maxZoom={15}
          >
            <NavigationControl position="top-right" />
            
            {selectedLocation && (
              <Marker
                longitude={selectedLocation.lng}
                latitude={selectedLocation.lat}
                anchor="bottom"
              >
                <div className="bg-brand-500 text-white px-2 py-1 rounded shadow-lg text-sm font-semibold">
                  {selectedLocation.name}
                </div>
              </Marker>
            )}
          </MapGL>
        </div>

        {/* Zoom Level Indicator */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Current level: <span className="font-semibold text-gray-900 dark:text-gray-100">{getGeoLevel(viewState.zoom).toUpperCase()}</span>
            {' • '}
            {getGeoLevel(viewState.zoom) === 'state' && 'Zoom in to select counties'}
            {getGeoLevel(viewState.zoom) === 'county' && 'Zoom in more to select zip codes, or zoom out for states'}
            {getGeoLevel(viewState.zoom) === 'zip' && 'Zoom out to select counties or states'}
          </p>
        </div>
      </div>
    </div>
  );
}



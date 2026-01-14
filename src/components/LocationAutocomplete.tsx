import { useState, useEffect, useRef } from 'react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  locationType: 'city' | 'zip' | 'both' | 'state';
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  locationType,
  placeholder,
  required,
  className
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showError, setShowError] = useState(false);
  const [reinitKey, setReinitKey] = useState(0); // Key to force reinitialize
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const validSelectionRef = useRef<boolean>(false);
  const lastValidValueRef = useRef<string>(value);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputValue(value);
    lastValidValueRef.current = value;
    validSelectionRef.current = true;
    setShowError(false);
  }, [value]);

  useEffect(() => {
    const initAutocomplete = async () => {
      if (!inputRef.current) return;

      try {
        // Load the Google Maps script if not already loaded
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

        // Clear existing autocomplete instance if it exists
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
          // Remove the pac-container (Google's autocomplete dropdown) from the DOM
          const pacContainers = document.querySelectorAll('.pac-container');
          pacContainers.forEach(container => container.remove());
          autocompleteRef.current = null;
        }

        // Configure autocomplete based on location type
        const autocompleteOptions: google.maps.places.AutocompleteOptions = {
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'types']
        };

        if (locationType === 'city') {
          // For cities, restrict to (cities) type - this excludes zip codes
          autocompleteOptions.types = ['(cities)'];
        } else if (locationType === 'zip') {
          // For zip codes, restrict to postal_code type - this excludes cities
          autocompleteOptions.types = ['postal_code'];
        } else if (locationType === 'state') {
          // For states, restrict to administrative_area_level_1 (US states)
          autocompleteOptions.types = ['administrative_area_level_1'];
        } else if (locationType === 'both') {
          // For both, use (regions) which includes cities, postal codes, and localities
          // but excludes street addresses
          autocompleteOptions.types = ['(regions)'];
        }

        // Create new autocomplete instance
        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          autocompleteOptions
        );

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (place?.address_components) {
            // First, try to extract postal code (zip)
            const postalComponent = place.address_components.find(component =>
              component.types.includes('postal_code')
            );

            if (postalComponent && (locationType === 'zip' || locationType === 'both')) {
              const zipCode = postalComponent.long_name;
              setInputValue(zipCode);
              onChange(zipCode);
              validSelectionRef.current = true;
              lastValidValueRef.current = zipCode;
              setShowError(false);
              // Force reinitialize after selection
              setTimeout(() => setReinitKey(k => k + 1), 100);
              return;
            }

            // Check for state selection
            if (locationType === 'state') {
              const stateComponent = place.address_components.find(component =>
                component.types.includes('administrative_area_level_1')
              );

              if (stateComponent) {
                let stateName = stateComponent.long_name; // e.g., "North Carolina"
                // Add "State" to New York to distinguish it from New York City
                if (stateName === 'New York') {
                  stateName = 'New York State';
                }
                setInputValue(stateName);
                onChange(stateName);
                validSelectionRef.current = true;
                lastValidValueRef.current = stateName;
                setShowError(false);
                // Force reinitialize after selection
                setTimeout(() => setReinitKey(k => k + 1), 100);
                return;
              }
            }

            // If no postal code or state, try to extract city
            if (locationType === 'city' || locationType === 'both') {
              let city = '';
              let state = '';

              for (const component of place.address_components) {
                const types = component.types;
                
                if (types.includes('locality')) {
                  city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                  state = component.short_name;
                }
              }

              if (city) {
                const formattedLocation = state ? `${city}, ${state}` : city;
                setInputValue(formattedLocation);
                onChange(formattedLocation);
                validSelectionRef.current = true;
                lastValidValueRef.current = formattedLocation;
                setShowError(false);
                // Force reinitialize after selection
                setTimeout(() => setReinitKey(k => k + 1), 100);
              }
            }
          }
        });
      } catch (error) {
        console.error('Error loading Google Places:', error);
      }
    };

    initAutocomplete();

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        // Clean up any remaining pac-containers when component unmounts
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach(container => container.remove());
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, [locationType, onChange, reinitKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Mark as invalid selection when user types manually
    validSelectionRef.current = false;
    // Hide error while typing
    setShowError(false);
  };

  const handleBlur = () => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    // Delay validation to allow Google Places selection to complete
    blurTimeoutRef.current = setTimeout(() => {
      // If user typed but didn't select from autocomplete, revert to last valid value
      if (!validSelectionRef.current && inputValue.trim() !== '') {
        setShowError(true);
        setInputValue(lastValidValueRef.current);
        // If there was no previous valid value, clear the field
        if (!lastValidValueRef.current) {
          onChange('');
        }
      }
    }, 200); // 200ms delay allows place_changed to fire first
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // On Enter, if user hasn't selected from dropdown but has typed something,
    // trigger Google Places to get the first prediction
    if (e.key === 'Enter' && !validSelectionRef.current && inputValue.trim() !== '') {
      e.preventDefault();
      
      // Use AutocompleteService to get predictions and select the first one
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: inputValue,
          componentRestrictions: { country: 'us' },
          types: locationType === 'city' ? ['(cities)'] :
                 locationType === 'zip' ? ['postal_code'] :
                 locationType === 'state' ? ['administrative_area_level_1'] :
                 ['(regions)']
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            // Get details for the first prediction
            const placesService = new google.maps.places.PlacesService(document.createElement('div'));
            placesService.getDetails(
              {
                placeId: predictions[0].place_id,
                fields: ['address_components', 'formatted_address', 'types']
              },
              (place, detailStatus) => {
                if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place?.address_components) {
                  // Process the place as if it was selected from autocomplete
                  const postalComponent = place.address_components.find(component =>
                    component.types.includes('postal_code')
                  );

                  if (postalComponent && (locationType === 'zip' || locationType === 'both')) {
                    const zipCode = postalComponent.long_name;
                    setInputValue(zipCode);
                    onChange(zipCode);
                    validSelectionRef.current = true;
                    lastValidValueRef.current = zipCode;
                    setShowError(false);
                    return;
                  }

                  if (locationType === 'state') {
                    const stateComponent = place.address_components.find(component =>
                      component.types.includes('administrative_area_level_1')
                    );

                    if (stateComponent) {
                      let stateName = stateComponent.long_name;
                      if (stateName === 'New York') {
                        stateName = 'New York State';
                      }
                      setInputValue(stateName);
                      onChange(stateName);
                      validSelectionRef.current = true;
                      lastValidValueRef.current = stateName;
                      setShowError(false);
                      return;
                    }
                  }

                  if (locationType === 'city' || locationType === 'both') {
                    let city = '';
                    let state = '';

                    for (const component of place.address_components) {
                      const types = component.types;
                      
                      if (types.includes('locality')) {
                        city = component.long_name;
                      }
                      if (types.includes('administrative_area_level_1')) {
                        state = component.short_name;
                      }
                    }

                    if (city) {
                      const formattedLocation = state ? `${city}, ${state}` : city;
                      setInputValue(formattedLocation);
                      onChange(formattedLocation);
                      validSelectionRef.current = true;
                      lastValidValueRef.current = formattedLocation;
                      setShowError(false);
                    }
                  }
                }
              }
            );
          }
        }
      );
    }
  };

  const getErrorMessage = () => {
    if (locationType === 'city') {
      return 'Please select a city from the dropdown suggestions';
    } else if (locationType === 'zip') {
      return 'Please select a zip code from the dropdown suggestions';
    } else if (locationType === 'state') {
      return 'Please select a state from the dropdown suggestions';
    } else if (locationType === 'both') {
      return 'Please select a city or zip code from the dropdown suggestions';
    }
    return 'Please select from the dropdown suggestions';
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className={`${className} ${showError ? '!border-red-500 dark:!border-red-500' : ''}`}
      />
      {showError && (
        <p className="absolute left-0 top-full mt-1 text-sm text-red-600 dark:text-red-400 whitespace-nowrap">
          {getErrorMessage()}
        </p>
      )}
    </div>
  );
}

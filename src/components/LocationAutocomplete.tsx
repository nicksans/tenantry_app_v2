import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string) => void;
  locationType: 'city' | 'zip';
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface Suggestion {
  description: string;
  placeId: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  locationType,
  placeholder,
  required = false,
  className = '',
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const isSelectingRef = useRef(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('Google Maps API key is missing');
      return;
    }

    const loadGoogleMaps = async () => {
      try {
        if (!window.google?.maps) {
          const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');

          if (!existingScript) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;

            document.head.appendChild(script);

            await new Promise<void>((resolve, reject) => {
              script.onload = () => {
                const checkGoogleMaps = setInterval(() => {
                  if (window.google?.maps?.places) {
                    clearInterval(checkGoogleMaps);
                    resolve();
                  }
                }, 100);

                setTimeout(() => {
                  clearInterval(checkGoogleMaps);
                  reject(new Error('Google Maps failed to load in time'));
                }, 10000);
              };
              script.onerror = reject;
            });
          } else {
            await new Promise<void>((resolve) => {
              const checkGoogleMaps = setInterval(() => {
                if (window.google?.maps?.places) {
                  clearInterval(checkGoogleMaps);
                  resolve();
                }
              }, 100);
            });
          }
        }

        if (!autocompleteServiceRef.current) {
          autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    loadGoogleMaps();
  }, []);

  const getPlaceType = (): string[] => {
    switch (locationType) {
      case 'city':
        return ['(cities)']; // Cities
      case 'zip':
        return ['postal_code']; // Postal codes
      default:
        return ['(cities)'];
    }
  };

  const isValidPrediction = (prediction: google.maps.places.AutocompletePrediction): boolean => {
    const description = prediction.description.toLowerCase();
    
    switch (locationType) {
      case 'zip':
        // Must contain a 5-digit zip code
        return /\b\d{5}\b/.test(prediction.description);
      case 'city':
        // Should be a city (not a county or zip)
        return !description.includes('county') && !/\b\d{5}\b/.test(prediction.description);
      default:
        return true;
    }
  };

  const formatPlaceName = (description: string): string => {
    if (locationType === 'zip') {
      // Extract just the zip code
      const zipMatch = description.match(/\b\d{5}\b/);
      return zipMatch ? zipMatch[0] : description;
    }
    
    // Remove ", USA" from the end
    return description.replace(/, USA$/, '');
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    setSelectedIndex(-1);

    if (inputValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!autocompleteServiceRef.current) {
      return;
    }

    const request: google.maps.places.AutocompletionRequest = {
      input: inputValue,
      componentRestrictions: { country: 'us' },
      types: getPlaceType(),
    };

    autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        // Filter predictions based on type validation
        const filtered = predictions
          .filter(isValidPrediction)
          .slice(0, 5)
          .map((prediction) => ({
            description: formatPlaceName(prediction.description),
            placeId: prediction.place_id || '',
          }));

        // Remove duplicates
        const uniqueSuggestions = filtered.filter(
          (val, idx, arr) => arr.findIndex((v) => v.description === val.description) === idx
        );

        setSuggestions(uniqueSuggestions);
        setShowSuggestions(uniqueSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    });
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    isSelectingRef.current = true;
    onChange(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Clear the flag after a longer delay to ensure blur handler doesn't interfere
    setTimeout(() => {
      isSelectingRef.current = false;
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Validate manual input on blur
  const handleBlur = () => {
    // Small delay to allow click events to fire first
    setTimeout(() => {
      // Don't validate if we just selected a suggestion
      if (isSelectingRef.current) {
        return;
      }
      
      if (value && value.length >= 2) {
        // Validate that the input matches the expected type
        if (locationType === 'zip') {
          // Zip code should be 5 digits
          const zipPattern = /^\d{5}$/;
          if (!zipPattern.test(value)) {
            // Clear invalid zip code
            onChange('');
          }
        }
      }
      setShowSuggestions(false);
    }, 300);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if we're selecting a suggestion
      if (isSelectingRef.current) {
        return;
      }
      
      const target = event.target as Node;
      // Check if click is on a suggestion button
      if (target && (target as HTMLElement).closest('.suggestion-button')) {
        return;
      }
      
      if (inputRef.current && !inputRef.current.contains(target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={`pl-10 ${className}`}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.placeId}-${index}`}
              type="button"
              className="suggestion-button w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-gray-100"
              onMouseDown={(e) => {
                // Prevent input blur before click fires
                e.preventDefault();
                e.stopPropagation();
                handleSelectSuggestion(suggestion);
              }}
              onClick={(e) => {
                // Also handle onClick as backup
                e.preventDefault();
                e.stopPropagation();
                handleSelectSuggestion(suggestion);
              }}
              style={{
                backgroundColor: index === selectedIndex 
                  ? (document.documentElement.classList.contains('dark') ? 'rgb(55 65 81)' : 'rgb(243 244 246)')
                  : undefined,
                borderRadius: index === 0 ? '0.5rem 0.5rem 0 0' : index === suggestions.length - 1 ? '0 0 0.5rem 0.5rem' : undefined,
              }}
            >
              {suggestion.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


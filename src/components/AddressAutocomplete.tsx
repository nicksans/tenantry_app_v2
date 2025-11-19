import { useEffect, useRef } from 'react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  onAddressValidated?: (isValid: boolean) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  onAddressValidated,
  placeholder = 'Enter property address',
  required = false,
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onAddressValidatedRef = useRef(onAddressValidated);

  // Keep refs up to date
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectedRef.current = onPlaceSelected;
    onAddressValidatedRef.current = onAddressValidated;
  }, [onChange, onPlaceSelected, onAddressValidated]);

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

        if (!inputRef.current) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'address_components', 'geometry'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();

          if (place?.formatted_address) {
            // Remove ", USA" from the end of the address
            let cleanedAddress = place.formatted_address.replace(/, USA$/, '');
            
            // Update parent state using refs to avoid stale closures
            onChangeRef.current(cleanedAddress);
            if (onPlaceSelectedRef.current) {
              onPlaceSelectedRef.current(place);
            }
            // Notify parent that a valid address was selected
            if (onAddressValidatedRef.current) {
              onAddressValidatedRef.current(true);
            }
          }
        });
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    loadGoogleMaps();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => {
        onChangeRef.current(e.target.value);
        // When user manually types, mark address as not validated
        if (onAddressValidatedRef.current) {
          onAddressValidatedRef.current(false);
        }
      }}
      placeholder={placeholder}
      required={required}
      className={className}
      autoComplete="off"
    />
  );
}

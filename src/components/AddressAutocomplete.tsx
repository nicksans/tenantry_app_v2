import { useState, useEffect, useRef } from 'react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  className
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showError, setShowError] = useState(false);
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

        // Configure autocomplete for full addresses
        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'address_components'],
            types: ['address']
          }
        );

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (place?.formatted_address) {
            setInputValue(place.formatted_address);
            onChange(place.formatted_address);
            validSelectionRef.current = true;
            lastValidValueRef.current = place.formatted_address;
            setShowError(false);
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
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, [onChange]);

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
    // Prevent form submission if Enter is pressed without a valid selection
    if (e.key === 'Enter' && !validSelectionRef.current && inputValue.trim() !== '') {
      e.preventDefault();
      setShowError(true);
      setInputValue(lastValidValueRef.current);
    }
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
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Please select an address from the dropdown suggestions
        </p>
      )}
    </div>
  );
}

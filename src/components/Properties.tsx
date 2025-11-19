import { Building2, Plus, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import AddPropertyModal, { PropertyFormData } from './AddPropertyModal';
import { supabase } from '../lib/supabase';

interface Property {
  id: string;
  // Address fields
  address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  subdivision?: string;
  county?: string;
  county_fips?: string;
  state_fips?: string;
  latitude?: number;
  longitude?: number;
  
  // Basic info
  property_type: string;
  status?: string;
  owner_occupied?: boolean;
  
  // Structure details
  bedrooms: number;
  bathrooms: number;
  units: number;
  square_footage?: number;
  lot_size?: number;
  year_built?: number;
  
  // Financials
  rent?: number;
  last_sale_price?: number;
  estimated_value?: number;
  estimated_rent?: number;
  estimated_price_range_low?: number;
  estimated_price_range_high?: number;
  estimated_rent_range_low?: number;
  estimated_rent_range_high?: number;
  hoa_fee?: number;
  
  // Owner info
  owner_1?: string;
  owner_2?: string;
  owner_3?: string;
  
  // Property details
  description?: string;
  amenities?: string[];
  zoning?: string;
  legal_description?: string;
  
  // Features
  features_architecture_type?: string;
  features_floor_count?: number;
  features_roof_type?: string;
  features_foundation_type?: string;
  features_garage?: boolean;
  features_garage_type?: string;
  features_garage_spaces?: number;
  features_heating?: boolean;
  features_heating_type?: string;
  features_cooling?: boolean;
  features_cooling_type?: string;
  features_fireplace?: boolean;
  features_unit_count?: number;
  
  // Metadata
  created_at: string;
  updated_at?: string;
  owner_id?: string;
  
  // Plaid
  plaid_item_id?: string;
  plaid_access_token?: string;
  plaid_institution_name?: string;
  plaid_needs_update?: boolean;
}

interface PropertiesProps {
  shouldOpenModal?: boolean;
  onModalOpenChange?: (isOpen: boolean) => void;
  onPropertyClick?: (propertyId: string) => void;
  userId?: string;
}

export default function Properties({ shouldOpenModal = false, onModalOpenChange, onPropertyClick, userId }: PropertiesProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | null>(null);
  const [showUpgradeMessage, setShowUpgradeMessage] = useState(false);

  useEffect(() => {
    loadProperties();
    loadUserPlan();
  }, []);

  useEffect(() => {
    if (shouldOpenModal) {
      handleOpenAddPropertyModal();
      onModalOpenChange?.(false);
    }
  }, [shouldOpenModal, onModalOpenChange]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserPlan(data?.plan || 'free');
    } catch (error) {
      console.error('Error loading user plan:', error);
      setUserPlan('free'); // Default to free plan if there's an error
    }
  };

  const handleOpenAddPropertyModal = () => {
    // Check if user is on free plan and already has 1 or more properties
    if (userPlan === 'free' && properties.length >= 1) {
      setShowUpgradeMessage(true);
      return;
    }
    
    // If user is on pro plan or has no properties yet, open the modal
    setIsModalOpen(true);
  };

  const handleAddProperty = async (formData: PropertyFormData) => {
    const { data, error } = await supabase
      .from('properties')
      .insert([{
        ...formData,
        owner_id: userId
      }])
      .select();

    if (error) throw error;

    // Send address, property ID, and owner ID to webhook
    if (data && data.length > 0) {
      try {
        await fetch('https://tenantry.app.n8n.cloud/webhook/get-rentcast-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            address: formData.address,
            propertyId: data[0].id,
            owner_id: userId
          }),
        });
      } catch (webhookError) {
        console.error('Error sending to webhook:', webhookError);
      }
    }

    await loadProperties();
  };

  const parseAddress = (fullAddress: string) => {
    // Split address into street and city/state
    const parts = fullAddress.split(',');
    if (parts.length >= 2) {
      const street = parts[0].trim();
      const cityState = parts.slice(1).join(',').trim();
      return { street, cityState };
    }
    return { street: fullAddress, cityState: '' };
  };

  const isPropertyComplete = (property: Property) => {
    // Check if property has all essential details filled
    return property.bedrooms > 0 && property.bathrooms > 0;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Properties</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and track your rental properties</p>
        </div>
        <button
          onClick={handleOpenAddPropertyModal}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Property
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading properties...</div>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No properties yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by adding your first rental property</p>
          <button
            onClick={handleOpenAddPropertyModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {properties.map((property) => {
            const { street, cityState } = parseAddress(property.address);
            const isComplete = isPropertyComplete(property);
            const isExpanded = expandedProperty === property.id;

            return (
              <div 
                key={property.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Main Property Header - Clickable */}
                <div 
                  onClick={() => onPropertyClick?.(property.id)}
                  className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Property Icon */}
                      <div className="flex items-center justify-center w-24 h-24 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex-shrink-0">
                        <Building2 className="w-12 h-12 text-brand-600 dark:text-brand-400" />
                      </div>
                      
                      {/* Address and Details */}
                      <div className="flex-1">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {street}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {cityState}
                        </p>
                        
                        {/* Beds/Baths */}
                        {property.bedrooms > 0 || property.bathrooms > 0 ? (
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">BEDS/BATHS</p>
                            <p className="text-lg text-gray-900 dark:text-gray-100">
                              {property.bedrooms || '—'} | {property.bathrooms || '—'}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* New Unit Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement add unit functionality
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      New Unit
                    </button>
                  </div>
                </div>

                {/* Show Units / Rooms Toggle */}
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedProperty(isExpanded ? null : property.id);
                    }}
                    className="w-full px-6 py-3 flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">SHOW UNITS / ROOMS</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 text-center">
                      No units or rooms added yet
                    </p>
                  </div>
                )}

                {/* Incomplete Setup Warning */}
                {!isComplete && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-brand-50 dark:bg-brand-900/10 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-brand-500 rounded-full flex-shrink-0">
                          <span className="text-white text-lg font-bold">i</span>
                        </div>
                        <p className="text-gray-900 dark:text-gray-100">
                          Add more details for this rental.
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPropertyClick?.(property.id);
                        }}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
                      >
                        COMPLETE SET UP
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddPropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddProperty}
      />

      {/* Upgrade to Pro Message */}
      {showUpgradeMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-brand-100 dark:bg-brand-900/20 rounded-full mx-auto mb-4">
                <Building2 className="w-8 h-8 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Upgrade to Tenantry Pro
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add unlimited properties and unlock more features.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeMessage(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeMessage(false);
                    // TODO: Add navigation to upgrade page when available
                    console.log('Navigate to upgrade page');
                  }}
                  className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

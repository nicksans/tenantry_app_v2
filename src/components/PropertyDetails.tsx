import { Building2, ArrowLeft, Trash2, MapPin, Home, DollarSign, TrendingUp, Calendar, ChevronDown, ChevronUp, Pencil, Check, X, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  estimated_rentRangeLow?: number;
  estimated_rentRangeHigh?: number;
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
  features_exterior_type?: string;
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

interface PropertyComp {
  property_comp_id: string;
  id: string;
  property_id: string;
  formattedAddress?: string;
  distance?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  price?: number;
  daysOnMarket?: number;
  correlation?: number;
  lastSeenDate?: string;
  listedDate?: string;
  removedDate?: string;
}

interface RentComp {
  rent_comp_id: string;
  id: string;
  property_id: string;
  formattedAddress?: string;
  distance?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  price?: number;
  correlation?: number;
  lastSeenDate?: string;
}

interface SaleHistory {
  id: string;
  property_id: string;
  event?: string;
  date?: string;
  price?: number;
  created_at: string;
}

interface TaxAssessment {
  id: string;
  property_id: string;
  year?: number;
  value?: number;
  land?: number;
  improvements?: number;
  created_at: string;
}

interface TaxHistory {
  id: string;
  property_id: string;
  year?: number;
  total?: number;
  created_at: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  unit_number?: string;
  lease_start?: string;
  lease_end?: string;
  monthly_rent?: number;
  status: 'active' | 'past' | 'future';
}

interface PropertyDetailsProps {
  propertyId: string;
  onBack: () => void;
}

export default function PropertyDetails({ propertyId, onBack }: PropertyDetailsProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<{ field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [connectingPropertyId, setConnectingPropertyId] = useState<string | null>(null);
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'maintenance' | 'documents' | 'expenses'>('overview');
  
  // Related data
  const [salesComps, setSalesComps] = useState<PropertyComp[]>([]);
  const [rentComps, setRentComps] = useState<RentComp[]>([]);
  const [saleHistory, setSaleHistory] = useState<SaleHistory[]>([]);
  const [taxAssessments, setTaxAssessments] = useState<TaxAssessment[]>([]);
  const [taxHistory, setTaxHistory] = useState<TaxHistory[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  
  // Section expand/collapse states
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['header']));

  useEffect(() => {
    getCurrentOwner();
    loadProperty();
    loadRelatedData();
    
    // Check if Plaid SDK is loaded
    if (!window.Plaid) {
      console.warn('Plaid SDK not available yet. It may still be loading...');
    }
  }, [propertyId]);

  // Load tenants when the tenants tab is activated
  useEffect(() => {
    if (activeTab === 'tenants') {
      loadTenants();
    }
  }, [activeTab, propertyId]);

  const getCurrentOwner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentOwnerId(user?.id || null);
    } catch (error) {
      console.error('Error getting current owner:', error);
    }
  };

  const loadProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRelatedData = async () => {
    try {
      // Check current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current authenticated user:', user?.id);
      
      // Load sales comps
      const { data: salesCompsData, error: salesError } = await supabase
        .from('property_comps')
        .select('*')
        .eq('property_id', propertyId)
        .order('distance', { ascending: true });
      
      console.log('Sales Comps Query:', { propertyId, userId: user?.id, data: salesCompsData, error: salesError });
      if (salesError) console.error('Sales comps error:', salesError);
      if (salesCompsData) setSalesComps(salesCompsData);

      // Load rent comps
      const { data: rentCompsData, error: rentError } = await supabase
        .from('rent_comps')
        .select('*')
        .eq('property_id', propertyId)
        .order('distance', { ascending: true });
      
      console.log('Rent Comps Query:', { propertyId, data: rentCompsData, error: rentError });
      if (rentError) console.error('Rent comps error:', rentError);
      if (rentCompsData) setRentComps(rentCompsData);

      // Load sale history
      const { data: saleHistoryData, error: historyError } = await supabase
        .from('property_sale_history')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: false });
      
      console.log('Sale History Query:', { propertyId, data: saleHistoryData, error: historyError });
      if (historyError) console.error('Sale history error:', historyError);
      if (saleHistoryData) setSaleHistory(saleHistoryData);

      // Load tax assessments
      const { data: taxAssessmentsData, error: taxAssessError } = await supabase
        .from('property_tax_assessments')
        .select('*')
        .eq('property_id', propertyId)
        .order('year', { ascending: false });
      
      console.log('Tax Assessments Query:', { propertyId, data: taxAssessmentsData, error: taxAssessError });
      if (taxAssessError) console.error('Tax assessments error:', taxAssessError);
      if (taxAssessmentsData) setTaxAssessments(taxAssessmentsData);

      // Load tax history
      const { data: taxHistoryData, error: taxHistoryError } = await supabase
        .from('property_tax_history')
        .select('*')
        .eq('property_id', propertyId)
        .order('year', { ascending: false });
      
      console.log('Tax History Query:', { propertyId, data: taxHistoryData, error: taxHistoryError });
      if (taxHistoryError) console.error('Tax history error:', taxHistoryError);
      if (taxHistoryData) setTaxHistory(taxHistoryData);
    } catch (error) {
      console.error('Error loading related data:', error);
    }
  };

  const loadTenants = async () => {
    setIsLoadingTenants(true);
    try {
      // Query tenants for this property through the relationship chain:
      // property -> units -> leases -> tenants
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          leases!inner (
            start_date,
            end_date,
            monthly_rent,
            status,
            units!inner (
              unit_number,
              property_id
            )
          )
        `)
        .eq('leases.units.property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tenants:', error);
        throw error;
      }

      // Transform the data to match our Tenant interface
      const formattedTenants: Tenant[] = data?.map((tenant: any) => {
        const lease = tenant.leases;
        const today = new Date();
        const startDate = new Date(lease.start_date);
        const endDate = new Date(lease.end_date);
        
        let status: 'active' | 'past' | 'future' = 'active';
        if (today > endDate) {
          status = 'past';
        } else if (today < startDate) {
          status = 'future';
        }

        return {
          id: tenant.id,
          first_name: tenant.first_name,
          last_name: tenant.last_name,
          email: tenant.email,
          phone: tenant.phone,
          unit_number: lease.units.unit_number,
          lease_start: lease.start_date,
          lease_end: lease.end_date,
          monthly_rent: lease.monthly_rent,
          status: status,
        };
      }) || [];

      setTenants(formattedTenants);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const startEditing = (field: string, currentValue: any) => {
    setEditingField({ field });
    // Handle different data types appropriately
    if (currentValue === null || currentValue === undefined) {
      setEditValue('');
    } else if (typeof currentValue === 'boolean') {
      setEditValue(currentValue.toString());
    } else if (Array.isArray(currentValue)) {
      setEditValue(currentValue.join(', '));
    } else {
      setEditValue(currentValue.toString());
    }
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async (field: string) => {
    try {
      let value: any = editValue;
      
      // Convert to appropriate type based on field
      const numericFields = [
        'bedrooms', 'bathrooms', 'units', 'square_footage', 'lot_size', 'year_built',
        'last_sale_price', 'estimated_value', 'estimated_rent', 'hoa_fee', 'rent',
        'estimated_price_range_low', 'estimated_price_range_high',
        'estimated_rentRangeLow', 'estimated_rentRangeHigh',
        'latitude', 'longitude', 'features_floor_count', 'features_garage_spaces', 'features_unit_count'
      ];
      
      const booleanFields = ['owner_occupied', 'features_garage', 'features_heating', 'features_cooling', 'features_fireplace'];
      
      const arrayFields = ['amenities'];
      
      if (numericFields.includes(field)) {
        value = editValue.trim() === '' ? null : parseFloat(editValue);
      } else if (booleanFields.includes(field)) {
        value = editValue.toLowerCase() === 'true' || editValue === '1' || editValue.toLowerCase() === 'yes';
      } else if (arrayFields.includes(field)) {
        value = editValue.split(',').map(item => item.trim()).filter(item => item !== '');
      } else if (editValue.trim() === '') {
        value = null;
      }

      const { error } = await supabase
        .from('properties')
        .update({ [field]: value })
        .eq('id', propertyId);

      if (error) throw error;

      // Update local state
      setProperty(property ? { ...property, [field]: value } : null);

      cancelEditing();
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Failed to update property. Please try again.');
    }
  };

  const handleDeleteProperty = async () => {
    if (!property) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the property at ${property.address}? This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      alert('Property deleted successfully');
      onBack();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const displayValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    return value;
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  const getCorrelationLabel = (correlation?: number) => {
    if (!correlation) return 'Unknown';
    if (correlation >= 0.8) return 'High';
    if (correlation >= 0.5) return 'Medium';
    return 'Low';
  };

  const getCorrelationColor = (correlation?: number) => {
    if (!correlation) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    if (correlation >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (correlation >= 0.5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  // Editable field component
  const EditableField = ({ 
    field, 
    value, 
    type = 'text',
    className = '',
    displayFormatter = (v) => displayValue(v),
    options = []
  }: { 
    field: string; 
    value: any; 
    type?: 'text' | 'number' | 'textarea' | 'select';
    className?: string;
    displayFormatter?: (v: any) => string;
    options?: string[];
  }) => {
    const isEditing = editingField?.field === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {type === 'textarea' ? (
            <textarea
              key={field}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-2 py-1 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-brand-500 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
              rows={3}
            />
          ) : type === 'select' ? (
            <select
              key={field}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-2 py-1 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-brand-500 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            >
              <option value="">Select...</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={field}
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-2 py-1 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-brand-500 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          )}
          <button onClick={() => saveEdit(field)} className="text-green-600 hover:text-green-700 flex-shrink-0">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={cancelEditing} className="text-red-600 hover:text-red-700 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }
    
    return (
      <div 
        className={`group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1 -mx-2 -my-1 flex items-center gap-2 ${className}`}
        onClick={() => startEditing(field, value)}
      >
        <span className="flex-1">{displayFormatter(value)}</span>
        <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    );
  };

  // Plaid Integration Functions
  const getLinkToken = async (propertyId: string) => {
    try {
      const requestBody = {
        client_id: '68691feb899ddc00222edb76',
        secret: 'c610ccb770b9a10cc6a9bbaabde2bf',
        owner_id: currentOwnerId || propertyId,
        property_id: propertyId,
        products: ['liabilities']
      };

      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/plaid-create-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to get link token');
      }

      const data = await response.json();
      return data.link_token;
    } catch (error) {
      console.error('Error getting link token:', error);
      alert('Error: Could not connect to Plaid. Please try again.');
      return null;
    }
  };

  const exchangePublicToken = async (publicToken: string, metadata: PlaidMetadata, propertyId: string) => {
    try {
      const requestBody = {
        client_id: '68691feb899ddc00222edb76',
        secret: 'c610ccb770b9a10cc6a9bbaabde2bf',
        public_token: publicToken,
        metadata: metadata,
        owner_id: currentOwnerId || propertyId,
        property_id: propertyId
      };

      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/plaid-exchange-for-access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to exchange token');
      }

      alert('✅ Success! Mortgage account connected. Data will be processed by n8n.');
      
      await loadProperty();
    } catch (error) {
      console.error('Error exchanging token:', error);
      alert('Error: Could not exchange token. Please try again.');
    } finally {
      setConnectingPropertyId(null);
    }
  };

  const disconnectMortgageAccount = async () => {
    if (!property?.plaid_item_id) {
      alert('No Plaid connection found for this property.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to disconnect ${property.plaid_institution_name || 'this bank account'}? This will remove the mortgage data and deactivate the connection.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setConnectingPropertyId(propertyId);

      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/plaid-disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: propertyId,
          plaid_item_id: property.plaid_item_id,
          plaid_access_token: property.plaid_access_token,
          owner_id: currentOwnerId || propertyId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect from n8n');
      }

      const { error } = await supabase
        .from('properties')
        .update({
          plaid_item_id: null,
          plaid_access_token: null,
          plaid_institution_name: null,
          plaid_needs_update: false
        })
        .eq('id', propertyId);

      if (error) {
        console.error('Error removing Plaid info from property:', error);
      }

      alert('✅ Successfully disconnected mortgage account and removed data.');
      
      await loadProperty();
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Error: Could not disconnect the account. Please try again.');
    } finally {
      setConnectingPropertyId(null);
    }
  };

  const connectMortgageAccount = async () => {
    if (!window.Plaid) {
      alert('Plaid is not loaded. Please refresh the page and try again.');
      return;
    }

    if (property?.plaid_item_id) {
      const shouldReconnect = window.confirm(
        `This property is already connected to ${property.plaid_institution_name || 'a bank account'}. Do you want to reconnect?`
      );
      
      if (!shouldReconnect) {
        return;
      }
    }

    setConnectingPropertyId(propertyId);

    const linkToken = await getLinkToken(propertyId);

    if (!linkToken) {
      setConnectingPropertyId(null);
      return;
    }

    const linkHandler = window.Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: PlaidMetadata) => {
        await exchangePublicToken(publicToken, metadata, propertyId);
      },
      onExit: (err: PlaidError | null) => {
        setConnectingPropertyId(null);
        if (err) {
          if (err.error_code === 'INVALID_LINK_TOKEN') {
            alert('This connection link has expired (30 minute limit). Please try again.');
          } else if (err.error_code) {
            alert('Error: ' + (err.display_message || err.error_message || `Plaid error code: ${err.error_code}`));
          }
        }
      },
    });

    linkHandler.open();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading property...</div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Property not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Properties
      </button>

      {/* Property Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 bg-brand-100 dark:bg-brand-900 rounded-lg">
            <Building2 className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1">{property.address}</h1>
            {property.plaid_item_id && (
              <span className="text-sm text-green-600 dark:text-green-400">
                ✓ Connected to {property.plaid_institution_name || 'Plaid Sandbox'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleDeleteProperty}
          className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete property"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              activeTab === 'overview'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className={`pb-4 px-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              activeTab === 'tenants'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Tenants
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-4 px-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              activeTab === 'maintenance'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Maintenance
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-4 px-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              activeTab === 'documents'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-4 px-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              activeTab === 'expenses'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Expenses
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SECTION 1: Header / At-a-Glance (sticky) */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              {/* Primary Address Line - Read-only */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {property.street_address || property.address}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {property.city ? `${property.city}, ` : ''}{property.state || ''} {property.zip_code || ''}
                </p>
              </div>

              {/* Property Info - Editable Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField 
                      field="status" 
                      value={property.status}
                      type="select"
                      options={['Vacant', 'Occupied']}
                    />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Property Type</p>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField 
                      field="property_type" 
                      value={property.property_type}
                      type="select"
                      options={['Single Family', 'Condo', 'Townhouse', 'Manufactured', 'Multi-Family', 'Apartment', 'Land']}
                    />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Units</p>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField field="units" value={property.units} type="number" />
                  </div>
                </div>
              </div>

              {/* Quick Stats - Editable */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bedrooms</p>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField field="bedrooms" value={property.bedrooms} type="number" />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bathrooms</p>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField field="bathrooms" value={property.bathrooms} type="number" />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sq Ft</p>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField field="square_footage" value={property.square_footage} type="number" displayFormatter={formatNumber} />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Lot Size</p>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField field="lot_size" value={property.lot_size} type="number" displayFormatter={formatNumber} />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Year Built</p>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField field="year_built" value={property.year_built} type="number" />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Rent</p>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <EditableField field="rent" value={property.rent} type="number" displayFormatter={(v) => v ? formatCurrency(v) : '-'} />
                  </div>
                </div>
              </div>

              {/* Valuations - Read-only */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-800/20 rounded-lg p-4 border border-brand-200 dark:border-brand-800">
                  <p className="text-sm text-brand-700 dark:text-brand-400 mb-1">Estimated Value</p>
                  <p className="text-3xl font-bold text-brand-900 dark:text-brand-100">
                    {property.estimated_value ? formatCurrency(property.estimated_value) : '-'}
                  </p>
                  <p className="text-sm text-brand-600 dark:text-brand-400 mt-1">
                    Range: {property.estimated_price_range_low ? formatCurrency(property.estimated_price_range_low) : '-'} - {property.estimated_price_range_high ? formatCurrency(property.estimated_price_range_high) : '-'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-400 mb-1">Estimated Rent</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {property.estimated_rent ? formatCurrency(property.estimated_rent) : '-'}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Range: {property.estimated_rentRangeLow ? formatCurrency(property.estimated_rentRangeLow) : '-'} - {property.estimated_rentRangeHigh ? formatCurrency(property.estimated_rentRangeHigh) : '-'}
                  </p>
                </div>
              </div>

              {/* Updated timestamp */}
              {property.updated_at && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {formatDate(property.updated_at)}
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('overview')}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Property Details
              </h2>
              {expandedSections.has('overview') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('overview') && (
              <div className="p-6 pt-0 space-y-6">
                {/* Full Address - Editable */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Full Address</h3>
                  <div className="text-gray-900 dark:text-gray-100">
                    <EditableField field="address" value={property.address} />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Subdivision: <EditableField field="subdivision" value={property.subdivision} />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Zoning: <EditableField field="zoning" value={property.zoning} />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Legal: <EditableField field="legal_description" value={property.legal_description} />
                  </div>
                </div>

                {/* Location - Editable */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</h3>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">County</p>
                    <div className="text-gray-900 dark:text-gray-100">
                      <EditableField field="county" value={property.county} />
                    </div>
                  </div>
                </div>

                {/* Map - Editable Coordinates */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Map</h3>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                      {property.latitude && property.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)} (Open in Maps)
                        </a>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">No coordinates set</span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Latitude: </span>
                        <EditableField field="latitude" value={property.latitude} type="number" />
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Longitude: </span>
                        <EditableField field="longitude" value={property.longitude} type="number" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Owner Record - Editable */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Owner Record</h3>
                  <div className="text-gray-900 dark:text-gray-100">
                    <EditableField field="owner_1" value={property.owner_1} />
                  </div>
                </div>

                {/* Amenities - Editable (comma-separated) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amenities (comma-separated)</h3>
                  <div className="text-gray-900 dark:text-gray-100">
                    <EditableField 
                      field="amenities" 
                      value={property.amenities} 
                      displayFormatter={(v) => Array.isArray(v) && v.length > 0 ? v.join(', ') : '-'}
                    />
                  </div>
                  {property.amenities && property.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {property.amenities.map((amenity, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Structure & Systems - Editable */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Structure & Systems</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Architecture</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_architecture_type" value={property.features_architecture_type} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Floors</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_floor_count" value={property.features_floor_count} type="number" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Roof</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_roof_type" value={property.features_roof_type} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Foundation</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_foundation_type" value={property.features_foundation_type} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Exterior</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_exterior_type" value={property.features_exterior_type} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Garage</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_garage_type" value={property.features_garage_type} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Garage Spaces</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_garage_spaces" value={property.features_garage_spaces} type="number" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Heating Type</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_heating_type" value={property.features_heating_type} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Cooling Type</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_cooling_type" value={property.features_cooling_type} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Fireplace</p>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <EditableField field="features_fireplace" value={property.features_fireplace} displayFormatter={(v) => v ? 'Yes' : 'No'} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Financials */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('financials')}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financials
              </h2>
              {expandedSections.has('financials') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('financials') && (
              <div className="p-6 pt-0 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Rent (Manual)</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <EditableField 
                      field="rent" 
                      value={property.rent} 
                      type="number" 
                      displayFormatter={(v) => v ? formatCurrency(v) : '-'}
                      className="text-2xl font-bold"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">HOA Fee</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <EditableField 
                      field="hoa_fee" 
                      value={property.hoa_fee} 
                      type="number" 
                      displayFormatter={(v) => v ? formatCurrency(v) : '-'}
                      className="text-2xl font-bold"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Purchase Price</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <EditableField 
                      field="last_sale_price" 
                      value={property.last_sale_price} 
                      type="number" 
                      displayFormatter={(v) => v ? formatCurrency(v) : '-'}
                      className="text-2xl font-bold"
                    />
                  </div>
                </div>

                {/* Plaid Bank Links */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Bank Connections</h3>
                  {property.plaid_item_id ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-green-900 dark:text-green-100">
                            Connected: {property.plaid_institution_name || 'Bank Account'}
                          </p>
                          {property.plaid_needs_update && (
                            <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">
                              ⚠️ Needs Update
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={connectMortgageAccount}
                            disabled={connectingPropertyId === propertyId}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            Reconnect
                          </button>
                          <button
                            onClick={disconnectMortgageAccount}
                            disabled={connectingPropertyId === propertyId}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={connectMortgageAccount}
                      disabled={connectingPropertyId === propertyId}
                      className="w-full px-4 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectingPropertyId === propertyId ? 'Connecting...' : 'Connect Mortgage Account'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Sales Comps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('salesComps')}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Sales Comps
                {salesComps.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-full text-sm">
                    {salesComps.length}
                  </span>
                )}
              </h2>
              {expandedSections.has('salesComps') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('salesComps') && (
              <div className="p-6 pt-0">
                {salesComps.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Address</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Dist. (mi)</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Beds/Baths</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Size (sqft)</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Year</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Price</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">DOM</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Correlation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {salesComps.map((comp) => (
                          <tr key={comp.property_comp_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.formattedAddress || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.distance?.toFixed(2) || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.bedrooms || '-'} / {comp.bathrooms || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatNumber(comp.squareFootage)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.yearBuilt || '-'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {comp.price ? formatCurrency(comp.price) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.daysOnMarket || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCorrelationColor(comp.correlation)}`}>
                                {getCorrelationLabel(comp.correlation)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No sales comps available yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 5: Rent Comps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('rentComps')}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Rent Comps
                {rentComps.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-full text-sm">
                    {rentComps.length}
                  </span>
                )}
              </h2>
              {expandedSections.has('rentComps') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('rentComps') && (
              <div className="p-6 pt-0">
                {rentComps.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Address</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Dist. (mi)</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Beds/Baths</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Size (sqft)</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Year</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Rent</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">$/sqft</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Correlation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {rentComps.map((comp) => (
                          <tr key={comp.rent_comp_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.formattedAddress || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.distance?.toFixed(2) || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.bedrooms || '-'} / {comp.bathrooms || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatNumber(comp.squareFootage)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{comp.yearBuilt || '-'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {comp.price ? formatCurrency(comp.price) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {comp.price && comp.squareFootage ? `$${(comp.price / comp.squareFootage).toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCorrelationColor(comp.correlation)}`}>
                                {getCorrelationLabel(comp.correlation)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No rent comps available yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 6: History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('history')}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                History
              </h2>
              {expandedSections.has('history') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('history') && (
              <div className="p-6 pt-0 space-y-6">
                {/* Sale History */}
                {saleHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sale History</h3>
                    <div className="space-y-3">
                      {saleHistory.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{sale.event || 'Sale'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(sale.date)}</p>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {sale.price ? formatCurrency(sale.price) : '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tax Assessments */}
                {taxAssessments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tax Assessments</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Year</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Total Value</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Land</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Improvements</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {taxAssessments.map((assessment) => (
                            <tr key={assessment.id}>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{assessment.year || '-'}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {assessment.value ? formatCurrency(assessment.value) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                {assessment.land ? formatCurrency(assessment.land) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                {assessment.improvements ? formatCurrency(assessment.improvements) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tax Bills */}
                {taxHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tax Bills</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Year</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Total Tax</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {taxHistory.map((tax) => (
                            <tr key={tax.id}>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{tax.year || '-'}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {tax.total ? formatCurrency(tax.total) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {saleHistory.length === 0 && taxAssessments.length === 0 && taxHistory.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No history data available yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tenants Tab */}
      {activeTab === 'tenants' && (
        <div>
          {isLoadingTenants ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="text-gray-500 dark:text-gray-400">Loading tenants...</div>
            </div>
          ) : tenants.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tenants yet</h3>
              <p className="text-gray-600 dark:text-gray-400">There are no tenants associated with this property</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tenants.map((tenant) => (
                <div 
                  key={tenant.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div className="flex items-center justify-center w-14 h-14 bg-brand-100 dark:bg-brand-900/20 rounded-full flex-shrink-0">
                        <Users className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                      </div>
                      
                      {/* Tenant Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {tenant.first_name} {tenant.last_name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            tenant.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : tenant.status === 'future'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                          </span>
                        </div>
                        
                        {tenant.unit_number && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            Unit {tenant.unit_number}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">EMAIL</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{tenant.email || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">PHONE</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{tenant.phone || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">MONTHLY RENT</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {tenant.monthly_rent ? formatCurrency(tenant.monthly_rent) : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">LEASE END</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              {tenant.lease_end ? formatDate(tenant.lease_end) : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-500 dark:text-gray-400">Maintenance content coming soon...</p>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-500 dark:text-gray-400">Documents content coming soon...</p>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-500 dark:text-gray-400">Expenses content coming soon...</p>
        </div>
      )}
    </div>
  );
}


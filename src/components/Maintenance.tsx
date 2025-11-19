import { Wrench, Plus, Search, AlertCircle, X, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  property_id?: string;
  property_address?: string;
  unit?: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'general_handyman' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  submitted_date: string;
  due_date?: string;
  assigned_to?: string;
  estimated_cost?: string;
  actual_cost?: number;
  photos?: string[];
  created_at: string;
}

interface Property {
  id: string;
  address: string;
  units?: number;
}

interface Vendor {
  id: string;
  name: string;
  company_name?: string;
}

export default function Maintenance() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    description: '',
    property_id: '',
    unit: '',
    category: '',
    priority: '',
    due_date: '',
    vendor_id: '',
    photos: [] as File[],
  });

  useEffect(() => {
    loadMaintenanceRequests();
    loadProperties();
    loadVendors();
  }, []);

  const loadMaintenanceRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties (address)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the data to include property_address
      const mappedData = (data || []).map(request => ({
        ...request,
        property_address: request.properties?.address,
      }));
      
      setRequests(mappedData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      setIsLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, address, units')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, company_name')
        .order('name', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    // Reset form
    setFormData({
      description: '',
      property_id: '',
      unit: '',
      category: '',
      priority: '',
      due_date: '',
      vendor_id: '',
      photos: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Upload photos to Supabase Storage first
      const photoUrls: string[] = [];
      
      if (formData.photos.length > 0) {
        for (const photo of formData.photos) {
          try {
            const fileExt = photo.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('maintenance-photos')
              .upload(fileName, photo);

            if (uploadError) {
              console.error('Error uploading photo:', uploadError);
              continue;
            }

            // Get public URL for the uploaded photo
            const { data: { publicUrl } } = supabase.storage
              .from('maintenance-photos')
              .getPublicUrl(fileName);
            
            photoUrls.push(publicUrl);
          } catch (photoError) {
            console.error('Error processing photo:', photoError);
          }
        }
      }
      
      // Get property address for webhook
      const selectedProperty = properties.find(p => p.id === formData.property_id);
      const selectedVendor = vendors.find(v => v.id === formData.vendor_id);
      
      // Prepare the data for insertion
      const maintenanceData = {
        description: formData.description,
        property_id: formData.property_id,
        unit: formData.unit || null,
        category: formData.category,
        priority: formData.priority,
        due_date: formData.due_date || null,
        vendor_id: formData.vendor_id || null,
        owner_id: user.id,
        status: 'open',
        submitted_date: new Date().toISOString(),
        photos: photoUrls.length > 0 ? photoUrls : null,
        // TODO: Add AI-generated title and estimated_cost here later
        title: `${formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Maintenance Request`,
        estimated_cost: null,
      };

      // Save to database
      const { data: insertedData, error } = await supabase
        .from('maintenance_requests')
        .insert([maintenanceData])
        .select()
        .single();

      if (error) throw error;

      // Send to n8n webhook
      try {
        const webhookFormData = new FormData();
        
        // Add all form fields
        webhookFormData.append('maintenance_request_id', insertedData.id);
        webhookFormData.append('description', formData.description);
        webhookFormData.append('property_id', formData.property_id);
        webhookFormData.append('property_address', selectedProperty?.address || '');
        webhookFormData.append('unit', formData.unit || '');
        webhookFormData.append('category', formData.category);
        webhookFormData.append('priority', formData.priority);
        webhookFormData.append('due_date', formData.due_date || '');
        webhookFormData.append('vendor_id', formData.vendor_id || '');
        webhookFormData.append('vendor_name', selectedVendor?.company_name || selectedVendor?.name || '');
        webhookFormData.append('owner_id', user.id);
        webhookFormData.append('status', 'open');
        webhookFormData.append('submitted_date', new Date().toISOString());
        
        // Add photo URLs (photos are already uploaded to Supabase Storage)
        webhookFormData.append('photo_urls', JSON.stringify(photoUrls));
        webhookFormData.append('photo_count', photoUrls.length.toString());

        await fetch('https://tenantry.app.n8n.cloud/webhook/maintenance-request', {
          method: 'POST',
          body: webhookFormData,
        });
      } catch (webhookError) {
        console.error('Error sending to webhook:', webhookError);
        // Don't fail the whole submission if webhook fails
      }

      // Reload the maintenance requests
      await loadMaintenanceRequests();
      
      // Close modal and reset form
      handleModalClose();
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      alert('Failed to create maintenance request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData({ ...formData, photos: [...formData.photos, ...newFiles] });
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFormData({ ...formData, photos: [...formData.photos, ...newFiles] });
    }
  };

  // Get available units based on selected property
  const getUnitsForProperty = () => {
    const selectedProperty = properties.find(p => p.id === formData.property_id);
    if (!selectedProperty || !selectedProperty.units) return [];
    
    // Generate unit numbers based on number of units
    return Array.from({ length: selectedProperty.units }, (_, i) => `Unit ${i + 1}`);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.property_address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount?: string | number) => {
    if (!amount) return '—';
    
    // If it's already a string (like "75-100"), format it
    if (typeof amount === 'string') {
      // Check if it's a range (contains a dash)
      if (amount.includes('-')) {
        const [min, max] = amount.split('-').map(s => s.trim());
        const minNum = parseFloat(min);
        const maxNum = parseFloat(max);
        
        if (!isNaN(minNum) && !isNaN(maxNum)) {
          const formattedMin = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(minNum);
          
          const formattedMax = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(maxNum);
          
          return `${formattedMin}-${formattedMax}`;
        }
        // If parsing fails, return as-is
        return amount;
      }
      
      // If it's a single number string, try to format it
      const numValue = parseFloat(amount);
      if (!isNaN(numValue)) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numValue);
      }
      
      // If it's not a number, return as-is (might already be formatted)
      return amount;
    }
    
    // If it's a number, format it normally
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return styles[status as keyof typeof styles] || styles.open;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      plumbing: '🚰 Plumbing',
      electrical: '⚡ Electrical',
      hvac: '❄️ HVAC',
      appliance: '🔧 Appliance',
      structural: '🏗️ Structural',
      general_handyman: '🔨 General (Handyman)',
      other: '📋 Other',
    };
    return labels[category] || category;
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Maintenance Requests</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage property maintenance requests</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Maintenance Request
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search maintenance requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading maintenance requests...</div>
        </div>
      ) : filteredRequests.length === 0 && searchQuery === '' && statusFilter === 'all' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No maintenance requests yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by adding your first maintenance request</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Request
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">No maintenance requests found matching your filters</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <div 
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-12 h-12 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex-shrink-0">
                    {request.priority === 'urgent' ? (
                      <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    ) : (
                      <Wrench className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    )}
                  </div>
                  
                  {/* Request Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
                        {request.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityBadge(request.priority)}`}>
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </span>
                    </div>
                    
                    {request.property_address && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        📍 {request.property_address}{request.unit ? ` • ${request.unit}` : ''}
                      </p>
                    )}
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {request.description}
                    </p>
                    
                    {/* Photos */}
                    {request.photos && request.photos.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">PHOTOS</p>
                        <div className="flex gap-2 overflow-x-auto">
                          {request.photos.map((photoUrl, index) => (
                            <a
                              key={index}
                              href={photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <img
                                src={photoUrl}
                                alt={`Maintenance photo ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity cursor-pointer"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CATEGORY</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {getCategoryLabel(request.category)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SUBMITTED</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(request.submitted_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">DUE DATE</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(request.due_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">EST. COST</p>
                        <p className="text-sm font-semibold bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">
                          {formatCurrency(request.estimated_cost)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <button className="ml-4 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Maintenance Request Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Maintenance Request</h2>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Describe the maintenance issue in detail..."
                    required
                  />
                </div>

                {/* Property Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Property *
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value, unit: '' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="">Select a property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.address}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit Selection */}
                {formData.property_id && getUnitsForProperty().length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Unit (Optional)
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select a unit (optional)</option>
                      {getUnitsForProperty().map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category and Priority Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select category</option>
                      <option value="plumbing">🚰 Plumbing</option>
                      <option value="electrical">⚡ Electrical</option>
                      <option value="hvac">❄️ HVAC</option>
                      <option value="appliance">🔧 Appliance</option>
                      <option value="structural">🏗️ Structural</option>
                      <option value="general_handyman">🔨 General (Handyman)</option>
                      <option value="other">📋 Other</option>
                    </select>
                  </div>

                  {/* Priority Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Priority *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Vendor/Contractor Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Assigned Vendor/Contractor (Optional)
                  </label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select a vendor (optional)</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.company_name || vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Photos (Optional)
                  </label>
                  <div className="space-y-2">
                    {/* Upload Button */}
                    <label 
                      className={`flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        isDragging
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-brand-500 dark:hover:border-brand-500 bg-gray-50 dark:bg-gray-700/50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Click or drag photos here
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Preview uploaded photos */}
                    {formData.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Note */}
                <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-brand-900 dark:text-brand-100 font-medium mb-0.5">
                        AI-Generated Information
                      </p>
                      <p className="text-xs text-brand-700 dark:text-brand-300">
                        Once submitted, the title and cost estimation will be automatically generated by AI based on your description and details.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


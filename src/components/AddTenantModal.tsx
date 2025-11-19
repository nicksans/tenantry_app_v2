import { X, Upload, File } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Lease {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  unit_number: string;
  property_address: string;
  property_id: string;
}

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTenantModal({ isOpen, onClose, onSuccess }: AddTenantModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lease_id: '',
    send_invitation: false,
  });
  const [leases, setLeases] = useState<Lease[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLeases, setIsLoadingLeases] = useState(true);
  const [generalError, setGeneralError] = useState<string>('');
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    getCurrentOwner();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLeases();
      // Reset errors and file when modal opens
      setErrors({});
      setGeneralError('');
      setLeaseFile(null);
    }
  }, [isOpen]);

  const getCurrentOwner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentOwnerId(user?.id || null);
    } catch (error) {
      console.error('Error getting current owner:', error);
    }
  };

  const loadLeases = async () => {
    try {
      setIsLoadingLeases(true);
      // Query leases with unit and property information
      const { data, error } = await supabase
        .from('leases')
        .select(`
          id,
          unit_id,
          start_date,
          end_date,
          monthly_rent,
          units!inner (
            unit_number,
            property_id,
            properties!inner (
              address
            )
          )
        `)
        .eq('status', 'active')
        .order('end_date', { ascending: false });

      if (error) throw error;

      // Transform the data to a flat structure
      const formattedLeases = data?.map((lease: any) => ({
        id: lease.id,
        unit_id: lease.unit_id,
        start_date: lease.start_date,
        end_date: lease.end_date,
        monthly_rent: lease.monthly_rent,
        unit_number: lease.units.unit_number,
        property_address: lease.units.properties.address,
        property_id: lease.units.property_id,
      })) || [];

      setLeases(formattedLeases);
    } catch (error) {
      console.error('Error loading leases:', error);
    } finally {
      setIsLoadingLeases(false);
    }
  };

  const formatLeaseOption = (lease: Lease) => {
    const endDate = new Date(lease.end_date);
    const monthYear = endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `${lease.property_address}, ${lease.unit_number} - ${monthYear}`;
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'This value is required';
    }

    if (!formData.email.trim() && !formData.phone.trim()) {
      newErrors.contact = 'Please provide at least one form of contact information';
    }

    // If user selects "add_new_lease", they must upload a file
    if (formData.lease_id === 'add_new_lease' && !leaseFile) {
      newErrors.lease_file = 'Please upload a lease document';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadLeaseFile = async (tenantId: string) => {
    if (!leaseFile || !currentOwnerId) return;

    try {
      // If adding a new lease (not selecting existing one), we still need property info
      // For now, we'll upload without property info - this needs to be addressed
      // by either requiring property selection or handling differently
      const selectedLease = formData.lease_id !== 'add_new_lease' 
        ? leases.find(l => l.id === formData.lease_id)
        : null;

      // Generate a unique document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const formDataToSend = new FormData();
      formDataToSend.append('file', leaseFile);
      formDataToSend.append('owner_id', currentOwnerId);
      formDataToSend.append('document_id', documentId);
      formDataToSend.append('doc_type', 'lease');
      formDataToSend.append('tenant_id', tenantId);
      formDataToSend.append('tenant_name', `${formData.first_name} ${formData.last_name}`.trim());

      // Add property info if available
      if (selectedLease) {
        formDataToSend.append('property_id', selectedLease.property_id);
        formDataToSend.append('property_address', selectedLease.property_address);
      }

      console.log('Uploading lease file:', leaseFile.name);
      console.log('Tenant ID:', tenantId);
      if (selectedLease) {
        console.log('Property ID:', selectedLease.property_id);
      }

      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/upload-to-storage', {
        method: 'POST',
        body: formDataToSend,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        throw new Error('Lease file upload failed');
      }

      console.log('Lease file uploaded successfully');
    } catch (error) {
      console.error('Error uploading lease file:', error);
      throw error;
    }
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setLeaseFile(e.dataTransfer.files[0]);
      if (errors.lease_file) {
        setErrors({ ...errors, lease_file: '' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // If user selected "add_new_lease", don't save that as the lease_id
      const leaseIdToSave = formData.lease_id === 'add_new_lease' ? null : (formData.lease_id || null);

      const { data: tenantData, error } = await supabase
        .from('tenants')
        .insert([{
          first_name: formData.first_name,
          last_name: formData.last_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          lease_id: leaseIdToSave,
          owner_id: currentOwnerId,
          send_invitation: formData.send_invitation,
        }])
        .select();

      if (error) {
        // Handle unique constraint violations with helpful messages
        if (error.message.includes('already registered as a user account')) {
          const newErrors: { [key: string]: string } = {};
          if (error.message.includes('email')) {
            newErrors.email = 'This email is already registered as a user account';
          }
          if (error.message.includes('phone')) {
            newErrors.phone = 'This phone number is already registered to a user account';
          }
          setErrors(newErrors);
          return;
        } else if (error.code === '23505') {
          // Unique constraint violation
          const newErrors: { [key: string]: string } = {};
          if (error.message.includes('email')) {
            newErrors.email = 'This email is already assigned to another tenant';
          }
          if (error.message.includes('phone')) {
            newErrors.phone = 'This phone number is already assigned to another tenant';
          }
          setErrors(newErrors);
          return;
        }
        throw error;
      }

      // Upload lease file if provided
      if (leaseFile && tenantData && tenantData.length > 0) {
        const tenantId = tenantData[0].id;
        await uploadLeaseFile(tenantId);
      }

      // Reset form and close modal
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        lease_id: '',
        send_invitation: false,
      });
      setErrors({});
      setLeaseFile(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding tenant:', error);
      // Show the actual error message for debugging
      const errorMessage = error?.message || 'Failed to add tenant. Please try again.';
      setGeneralError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Add a new tenant
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General Error Message */}
          {generalError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-400 text-sm font-medium">
                {generalError}
              </p>
            </div>
          )}

          {/* First Name and Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => {
                  setFormData({ ...formData, first_name: e.target.value });
                  if (errors.first_name) {
                    setErrors({ ...errors, first_name: '' });
                  }
                  if (generalError) {
                    setGeneralError('');
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.first_name 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.first_name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Lease Section */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Lease (Optional)
            </label>
            {isLoadingLeases ? (
              <div className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                Loading leases...
              </div>
            ) : (
              <select
                value={formData.lease_id}
                onChange={(e) => {
                  setFormData({ ...formData, lease_id: e.target.value });
                  // Clear file when changing lease selection
                  if (e.target.value !== 'add_new_lease') {
                    setLeaseFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                  if (errors.lease_id || errors.lease_file) {
                    setErrors({ ...errors, lease_id: '', lease_file: '' });
                  }
                  if (generalError) {
                    setGeneralError('');
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.lease_id 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">No lease assigned</option>
                <option value="add_new_lease">Add a new lease</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {formatLeaseOption(lease)}
                  </option>
                ))}
              </select>
            )}
            {errors.lease_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.lease_id}
              </p>
            )}

            {/* File Upload Section - Only show if "Add a new lease" is selected */}
            {formData.lease_id === 'add_new_lease' && (
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Upload Lease Document <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Upload the lease agreement for this tenant.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setLeaseFile(files[0]);
                      if (errors.lease_file) {
                        setErrors({ ...errors, lease_file: '' });
                      }
                    }
                  }}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-3 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    errors.lease_file
                      ? 'border-red-500 hover:border-red-600 bg-gray-50 dark:bg-gray-700'
                      : isDragging
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-brand-500 dark:hover:border-brand-500 bg-gray-50 dark:bg-gray-700'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {leaseFile ? 'Change File' : 'Click or drag file here'}
                  </span>
                </button>
                {leaseFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-brand-50 dark:bg-brand-900/20 p-2 rounded">
                    <File className="w-4 h-4" />
                    <span className="truncate flex-1">{leaseFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLeaseFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {errors.lease_file && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.lease_file}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Contact Information Header */}
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Provide at least one form of contact information:
            </p>
            
            {errors.contact && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {errors.contact}
              </p>
            )}

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.contact || errors.email) {
                    setErrors({ ...errors, contact: '', email: '' });
                  }
                  if (generalError) {
                    setGeneralError('');
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-brand-500'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.contact || errors.phone) {
                    setErrors({ ...errors, contact: '', phone: '' });
                  }
                  if (generalError) {
                    setGeneralError('');
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.phone 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-brand-500'
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Send Invitation Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="send_invitation"
              checked={formData.send_invitation}
              onChange={(e) => setFormData({ ...formData, send_invitation: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 dark:bg-gray-700"
            />
            <div>
              <label 
                htmlFor="send_invitation" 
                className="text-base font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
              >
                Send invitation to tenant portal
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                You can always invite them later.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-12 py-3 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
            >
              {isSubmitting ? 'ADDING...' : 'ADD TENANT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


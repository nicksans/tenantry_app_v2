import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Lease {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  unit_number: string;
  property_address: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lease_id?: string;
}

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenant: Tenant | null;
}

export default function EditTenantModal({ isOpen, onClose, onSuccess, tenant }: EditTenantModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lease_id: '',
  });
  const [leases, setLeases] = useState<Lease[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLeases, setIsLoadingLeases] = useState(true);
  const [generalError, setGeneralError] = useState<string>('');

  useEffect(() => {
    if (isOpen && tenant) {
      // Populate form with tenant data
      setFormData({
        first_name: tenant.first_name || '',
        last_name: tenant.last_name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        lease_id: tenant.lease_id || '',
      });
      loadLeases();
      // Reset errors when modal opens
      setErrors({});
      setGeneralError('');
    }
  }, [isOpen, tenant]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !tenant) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
      };

      // Only update lease_id if it's changed
      if (formData.lease_id && formData.lease_id !== tenant.lease_id) {
        updateData.lease_id = formData.lease_id;
      }

      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenant.id);

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

      // Reset form and close modal
      setErrors({});
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      // Show the actual error message for debugging
      const errorMessage = error?.message || 'Failed to update tenant. Please try again.';
      setGeneralError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Edit Tenant
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

          {/* Lease Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Lease (Optional)
            </label>
            {isLoadingLeases ? (
              <div className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                Loading leases...
              </div>
            ) : leases.length === 0 ? (
              <div className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No active leases available.
                </p>
              </div>
            ) : (
              <select
                value={formData.lease_id}
                onChange={(e) => {
                  setFormData({ ...formData, lease_id: e.target.value });
                  if (errors.lease_id) {
                    setErrors({ ...errors, lease_id: '' });
                  }
                  if (generalError) {
                    setGeneralError('');
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">No lease assigned</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {formatLeaseOption(lease)}
                  </option>
                ))}
              </select>
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

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-12 py-3 bg-[#1e3a5f] text-white rounded-full hover:bg-[#2a4a75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
            >
              {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


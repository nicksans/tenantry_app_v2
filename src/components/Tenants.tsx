import { Users, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AddTenantModal from './AddTenantModal';
import EditTenantModal from './EditTenantModal';

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lease_id?: string;
  property_address?: string;
  unit_number?: string;
  lease_start?: string;
  lease_end?: string;
  monthly_rent?: number;
  status: 'active' | 'past' | 'future';
  created_at: string;
}

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          lease_id,
          created_at,
          leases (
            id,
            start_date,
            end_date,
            monthly_rent,
            status,
            units!inner (
              unit_number,
              properties!inner (
                address
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Tenant interface
      const formattedTenants: Tenant[] = data?.map((tenant: any) => {
        const lease = tenant.leases;
        
        // Handle tenants without leases
        if (!lease) {
          return {
            id: tenant.id,
            first_name: tenant.first_name,
            last_name: tenant.last_name,
            email: tenant.email,
            phone: tenant.phone,
            lease_id: tenant.lease_id,
            status: 'active' as const,
            created_at: tenant.created_at,
          };
        }

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
          lease_id: tenant.lease_id || lease.id,
          property_address: lease.units?.properties?.address,
          unit_number: lease.units?.unit_number,
          lease_start: lease.start_date,
          lease_end: lease.end_date,
          monthly_rent: lease.monthly_rent,
          status: status,
          created_at: tenant.created_at,
        };
      }) || [];

      setTenants(formattedTenants);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const searchLower = searchQuery.toLowerCase();
    return (
      tenant.first_name.toLowerCase().includes(searchLower) ||
      tenant.last_name.toLowerCase().includes(searchLower) ||
      tenant.email.toLowerCase().includes(searchLower) ||
      tenant.property_address?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      past: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      future: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (tenant: Tenant) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${tenant.first_name} ${tenant.last_name}? This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenant.id);

      if (error) throw error;

      // Reload tenants after deletion
      loadTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Failed to delete tenant. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Tenants</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your tenant information and leases</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {/* TODO: Implement invite functionality */}}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Invite Tenant
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search tenants by name, email, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading tenants...</div>
        </div>
      ) : filteredTenants.length === 0 && searchQuery === '' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tenants yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by adding your first tenant</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Tenant
          </button>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">No tenants found matching your search</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTenants.map((tenant) => (
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(tenant.status)}`}>
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </span>
                    </div>
                    
                    {tenant.property_address && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        📍 {tenant.property_address}, Unit {tenant.unit_number}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">EMAIL</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{tenant.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">PHONE</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{tenant.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">MONTHLY RENT</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(tenant.monthly_rent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">LEASE END</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(tenant.lease_end)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(tenant)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tenant)}
                    className="px-4 py-2 text-sm border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Tenant Modal */}
      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadTenants}
      />

      {/* Edit Tenant Modal */}
      <EditTenantModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTenant(null);
        }}
        onSuccess={loadTenants}
        tenant={selectedTenant}
      />
    </div>
  );
}


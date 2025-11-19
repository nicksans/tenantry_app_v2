import { Upload, FileText, CheckCircle, X, Loader2, Check, Download, Trash2, AlertTriangle, File } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  storagePath: string; // The full path in storage
  documentId: string; // The doc_timestamp_randomid used for the webhook
}

interface Property {
  id: string;
  address: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  property_id: string;
  property_address: string;
}

interface Unit {
  id: string;
  unit_number: string;
  property_id: string;
  property_address: string;
}

export default function DocumentVault() {
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<UploadedDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document association state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [associationType, setAssociationType] = useState<'property' | 'tenant' | 'unit' | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoadingAssociations, setIsLoadingAssociations] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    getCurrentOwner();
  }, []);

  useEffect(() => {
    if (currentOwnerId) {
      fetchUserDocuments();
    }
  }, [currentOwnerId]);

  const getCurrentOwner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentOwnerId(user?.id || null);
    } catch (error) {
      console.error('Error getting current owner:', error);
    }
  };

  const fetchUserDocuments = async () => {
    try {
      if (!currentOwnerId) {
        console.log('No owner ID yet, skipping document fetch');
        return;
      }
      
      console.log('Fetching documents for owner:', currentOwnerId);
      
      // List all files in the user's folder
      const { data: files, error } = await supabase.storage
        .from('user_documents')
        .list(`${currentOwnerId}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error fetching documents:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return;
      }

      console.log('Files found:', files);
      console.log('Number of files:', files?.length || 0);

      // Convert the files to our UploadedDocument format
      const documents: UploadedDocument[] = files
        .filter(file => file.name !== '.emptyFolderPlaceholder') // Filter out any placeholder files
        .map(file => {
          // Extract the original filename by removing the documentId prefix
          // Format: doc_timestamp_randomid_originalfilename.ext
          const nameParts = file.name.split('_');
          let displayName = file.name;
          let documentId = '';
          
          // If the file follows the pattern doc_timestamp_randomid_filename
          if (nameParts.length >= 4 && nameParts[0] === 'doc') {
            // Extract document ID: doc_timestamp_randomid
            documentId = `${nameParts[0]}_${nameParts[1]}_${nameParts[2]}`;
            // Join everything after the third underscore for display name
            displayName = nameParts.slice(3).join('_');
          }
          
          return {
            id: file.id,
            name: displayName,
            size: file.metadata?.size || 0,
            uploadedAt: new Date(file.created_at || Date.now()),
            storagePath: `${currentOwnerId}/${file.name}`,
            documentId: documentId,
          };
        });

      console.log('Processed documents:', documents);
      setUploadedDocuments(documents);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const documentExamples = [
    {
      type: 'Closing Documents',
      icon: '📄',
      example: '"What percentage of my monthly payment is going to principal this month?"',
    },
    {
      type: 'Lease Agreements',
      icon: '📋',
      example: '"What is the late rent policy? And does it satisfy the NY State Landlord Tenant Law?"',
    },
    {
      type: 'Home Inspections',
      icon: '🏠',
      example: '"What material is my roof, and when will I need to get it replaced?"',
    },
    {
      type: 'Insurance Documents',
      icon: '🛡️',
      example: '"Does my policy cover wind and hail? And what is my premium?"',
    },
    {
      type: 'Appraisals',
      icon: '💰',
    },
    {
      type: 'Utility Bills',
      icon: '⚡',
    },
    {
      type: 'Mortgage Statements',
      icon: '🏦',
    },
  ];

  const loadAssociations = async () => {
    if (!currentOwnerId) return;
    
    setIsLoadingAssociations(true);
    try {
      // Load properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, address')
        .order('address', { ascending: true });

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);

      // Load tenants with their property info
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          id,
          first_name,
          last_name,
          leases (
            units (
              property_id,
              properties (
                address
              )
            )
          )
        `)
        .order('first_name', { ascending: true });

      if (tenantsError) throw tenantsError;
      
      const formattedTenants: Tenant[] = tenantsData?.map((tenant: any) => {
        // Handle leases as array (Supabase returns arrays for joined data)
        const lease = Array.isArray(tenant.leases) ? tenant.leases[0] : tenant.leases;
        const unit = Array.isArray(lease?.units) ? lease.units[0] : lease?.units;
        const property = Array.isArray(unit?.properties) ? unit.properties[0] : unit?.properties;
        
        return {
          id: tenant.id,
          first_name: tenant.first_name,
          last_name: tenant.last_name || '',
          property_id: unit?.property_id || property?.id || '',
          property_address: property?.address || 'No property assigned',
        };
      }) || []; 
      
      setTenants(formattedTenants);

      // Load units with their property info
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          property_id,
          properties!inner (
            address
          )
        `)
        .order('unit_number', { ascending: true });

      if (unitsError) throw unitsError;
      
      const formattedUnits: Unit[] = unitsData?.map((unit: any) => {
        // Handle properties as array (Supabase returns arrays for joined data)
        const property = Array.isArray(unit.properties) ? unit.properties[0] : unit.properties;
        
        return {
          id: unit.id,
          unit_number: unit.unit_number,
          property_id: unit.property_id,
          property_address: property?.address || '',
        };
      }) || [];
      
      setUnits(formattedUnits);
    } catch (error) {
      console.error('Error loading associations:', error);
    } finally {
      setIsLoadingAssociations(false);
    }
  };

  const handleOpenUploadModal = async () => {
    await loadAssociations();
    setShowAssociationModal(true);
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleConfirmUpload = async () => {
    // Validate file selection
    if (!selectedFile) {
      setUploadError('Please select a file');
      setTimeout(() => setUploadError(null), 7000);
      return;
    }

    // Validate selection
    if (!selectedPropertyId) {
      setUploadError('Please select a property');
      setTimeout(() => setUploadError(null), 7000);
      return;
    }

    if (associationType === 'tenant' && !selectedTenantId) {
      setUploadError('Please select a tenant');
      setTimeout(() => setUploadError(null), 7000);
      return;
    }

    if (associationType === 'unit' && !selectedUnitId) {
      setUploadError('Please select a unit');
      setTimeout(() => setUploadError(null), 7000);
      return;
    }

    // Close modal and proceed with upload
    setShowAssociationModal(false);
    await uploadFile(selectedFile);
  };

  const handleCancelUpload = () => {
    setShowAssociationModal(false);
    setSelectedFile(null);
    setAssociationType(null);
    setSelectedPropertyId('');
    setSelectedTenantId('');
    setSelectedUnitId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadSuccess(false);
    setUploadError(null);
    
    try {
      // Generate a unique document ID before uploading
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Get selected property info
      const selectedProperty = properties.find(p => p.id === selectedPropertyId);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner_id', currentOwnerId || 'no-owner-id');
      formData.append('document_id', documentId);
      formData.append('doc_type', 'user_document');
      
      // Always include property ID and address
      if (selectedProperty) {
        formData.append('property_id', selectedProperty.id);
        formData.append('property_address', selectedProperty.address);
      }
      
      // If tenant is selected, include tenant info
      if (associationType === 'tenant' && selectedTenantId) {
        const selectedTenant = tenants.find(t => t.id === selectedTenantId);
        if (selectedTenant) {
          formData.append('tenant_id', selectedTenant.id);
          formData.append('tenant_name', `${selectedTenant.first_name} ${selectedTenant.last_name}`.trim());
        }
      }
      
      // If unit is selected, include unit info (but NOT tenant info)
      if (associationType === 'unit' && selectedUnitId) {
        const selectedUnit = units.find(u => u.id === selectedUnitId);
        if (selectedUnit) {
          formData.append('unit_id', selectedUnit.id);
          formData.append('unit_number', selectedUnit.unit_number);
        }
      }
      
      // Debug logging
      console.log('Uploading file:', file.name);
      console.log('Owner ID:', currentOwnerId);
      console.log('Document ID:', documentId);
      console.log('Association Type:', associationType);
      console.log('Property ID:', selectedPropertyId);
      console.log('Tenant ID:', associationType === 'tenant' ? selectedTenantId : 'none');
      console.log('Unit ID:', associationType === 'unit' ? selectedUnitId : 'none');

      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/upload-to-storage', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response:', responseText);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Refresh the document list from storage after successful upload
      await fetchUserDocuments();
      
      // Reset selection state
      setSelectedFile(null);
      setAssociationType(null);
      setSelectedPropertyId('');
      setSelectedTenantId('');
      setSelectedUnitId('');
      
      setUploadSuccess(true);
      
      // Auto-hide success message after 7 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 7000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
      
      // Auto-hide error message after 7 seconds
      setTimeout(() => {
        setUploadError(null);
      }, 7000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: UploadedDocument) => {
    try {
      // Create a signed URL that's valid for 60 seconds
      const { data, error } = await supabase.storage
        .from('user_documents')
        .createSignedUrl(doc.storagePath, 60);

      if (error) {
        console.error('Error creating download URL:', error);
        setUploadError('Failed to open file. Please try again.');
        setTimeout(() => setUploadError(null), 7000);
        return;
      }

      if (data?.signedUrl) {
        // Open in a new tab
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      setUploadError('Failed to open file. Please try again.');
      setTimeout(() => setUploadError(null), 7000);
    }
  };

  const handleDeleteDocument = (doc: UploadedDocument) => {
    // Show confirmation UI
    setDocumentToDelete(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      console.log('Deleting document with ID:', documentToDelete.documentId);
      console.log('File name:', documentToDelete.name);
      
      // Call the n8n webhook to delete the document
      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/delete-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentToDelete.documentId,
          owner_id: currentOwnerId,
          file_name: documentToDelete.name,
        }),
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Refresh the document list after successful deletion
      await fetchUserDocuments();
      
      // Clear the deletion state
      setDocumentToDelete(null);
      
    } catch (error) {
      console.error('Error deleting document:', error);
      setUploadError('Failed to delete file. Please try again.');
      setTimeout(() => setUploadError(null), 7000);
      setDocumentToDelete(null);
    }
  };

  const cancelDeleteDocument = () => {
    setDocumentToDelete(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  const handleButtonClick = () => {
    handleOpenUploadModal();
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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Document Vault</h1>
        <p className="text-gray-600 dark:text-gray-400">Upload and manage your property documents</p>
      </div>

      <div className="mb-6">
        <button 
          onClick={handleButtonClick}
          disabled={isUploading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Upload Document</span>
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {uploadSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-900 dark:text-green-100">File uploaded successfully!</h4>
            <p className="text-sm text-green-700 dark:text-green-300">Your document has been added to Emma's knowledge base. Refresh the page to see it in Your Documents.</p>
          </div>
          <button
            onClick={() => setUploadSuccess(false)}
            className="flex-shrink-0 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-red-900 dark:text-red-100">Upload failed</h4>
            <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="flex-shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Upload Document Modal */}
      {showAssociationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancelUpload}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Upload Document
              </h3>
              <button
                onClick={handleCancelUpload}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* File Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select File <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`w-full px-4 py-3 border-2 border-dashed rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-brand-500 dark:hover:border-brand-500 bg-gray-50 dark:bg-gray-700'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFile ? selectedFile.name : 'Click or drag file here'}
                </span>
              </button>
              {selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <File className="w-4 h-4" />
                  <span className="truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
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
            </div>

            {isLoadingAssociations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600 dark:text-brand-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* Association Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      What is this document associated with? <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={associationType || ''}
                      onChange={(e) => {
                        const value = e.target.value as 'property' | 'tenant' | 'unit' | '';
                        setAssociationType(value || null);
                        // Reset selections when type changes
                        setSelectedPropertyId('');
                        setSelectedTenantId('');
                        setSelectedUnitId('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select an option</option>
                      <option value="property">Property</option>
                      <option value="tenant">Tenant</option>
                      <option value="unit">Unit</option>
                    </select>
                  </div>

                  {/* Property Selection - Shown when property is selected */}
                  {associationType === 'property' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Property <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  )}

                  {/* Tenant Selection - Shown when tenant is selected */}
                  {associationType === 'tenant' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tenant <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedTenantId}
                          onChange={(e) => {
                            setSelectedTenantId(e.target.value);
                            // Auto-select the property for this tenant
                            const tenant = tenants.find(t => t.id === e.target.value);
                            if (tenant && tenant.property_id) {
                              setSelectedPropertyId(tenant.property_id);
                            } else {
                              // If tenant doesn't have a property, clear the selection
                              setSelectedPropertyId('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          required
                        >
                          <option value="">Select a tenant</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.first_name} {tenant.last_name}
                              {!tenant.property_id ? ' (No property assigned)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Show property selector if tenant is selected but doesn't have a property */}
                      {selectedTenantId && !tenants.find(t => t.id === selectedTenantId)?.property_id && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Property <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={selectedPropertyId}
                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            required
                          >
                            <option value="">Select a property</option>
                            {properties.map((property) => (
                              <option key={property.id} value={property.id}>
                                {property.address}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            This tenant doesn't have a property assigned yet. Please select which property this document relates to.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Unit Selection - Shown when unit is selected */}
                  {associationType === 'unit' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedUnitId}
                        onChange={(e) => {
                          setSelectedUnitId(e.target.value);
                          // Auto-select the property for this unit
                          const unit = units.find(u => u.id === e.target.value);
                          if (unit) {
                            setSelectedPropertyId(unit.property_id);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      >
                        <option value="">Select a unit</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.property_address} - Unit {unit.unit_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCancelUpload}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmUpload}
                    disabled={!selectedFile || !selectedPropertyId || (associationType === 'tenant' && !selectedTenantId) || (associationType === 'unit' && !selectedUnitId)}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload Document
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">How it works</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Documents you upload to the vault will be added to Emma's knowledge base, allowing her to provide personalized insights based on your property details. When you ask her questions, she'll remember the context from your documents and provide more accurate, personalized insights.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Examples of what Emma can help answer:</h3>
        <div className="space-y-3">
          {documentExamples.map((doc, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8">
                <span className="text-xl">{doc.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{doc.type}</span>
                </div>
                {doc.example && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">{doc.example}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Your Documents</h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {uploadedDocuments.length} document{uploadedDocuments.length !== 1 ? 's' : ''} uploaded
          </span>
        </div>

        {/* Delete Confirmation Message */}
        {documentToDelete && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Delete "{documentToDelete.name}"?
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  Are you sure you want to delete this document? Emma will also forget its contents. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={cancelDeleteDocument}
                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteDocument}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Delete Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadedDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uploadedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(doc.size)} • {doc.uploadedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    className="p-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                    title="Open document"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

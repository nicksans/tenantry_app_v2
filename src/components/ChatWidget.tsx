import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Paperclip, File, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChatWidgetProps {
  userId?: string;
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

export default function ChatWidget({ userId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'bot' }>>([
    { text: "Hi! I'm Emma, your rental property assistant. Ask me anything about your properties!", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document association state
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

  const suggestionPrompts = [
    "What are the latest updates on my properties?",
    "Which units are up for renewal soon?",
    "Does my insurance policy cover wind and hail?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('ChatWidget userId:', userId);
  }, [userId]);

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    
    setShowSuggestions(false);
    setMessages(prev => [...prev, { text: suggestion, sender: 'user' }]);
    setIsLoading(true);

    const payload = { 
      message: suggestion,
      owner_id: userId 
    };
    const jsonBody = JSON.stringify(payload);
    console.log('Sending suggestion with payload:', payload);
    console.log('JSON body string:', jsonBody);

    try {
      const response = await fetch('https://tenantry.app.n8n.cloud/webhook-test/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonBody,
      });

      const data = await response.json();
      const responseText = data.output?.message || data.response || data.message || 'Sorry, I could not process your request.';

      setMessages(prev => [...prev, {
        text: responseText,
        sender: 'bot'
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssociations = async () => {
    if (!userId) return;
    
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
          leases!inner (
            units!inner (
              property_id,
              properties!inner (
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
          property_address: property?.address || '',
        };
      }).filter(tenant => tenant.property_id) || [];
      
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
    setAttachedFile(file);
  };

  const handleConfirmSend = async () => {
    // Validate file selection
    if (!attachedFile) {
      alert('Please select a file');
      return;
    }

    // Validate selection - property is always required
    if (!selectedPropertyId) {
      alert('Please select a property');
      return;
    }

    if (associationType === 'tenant' && !selectedTenantId) {
      alert('Please select a tenant');
      return;
    }

    if (associationType === 'unit' && !selectedUnitId) {
      alert('Please select a unit');
      return;
    }

    // Close modal and proceed with sending
    setShowAssociationModal(false);
    await sendMessage();
  };

  const handleCancelAssociation = () => {
    setShowAssociationModal(false);
    setAttachedFile(null);
    setAssociationType(null);
    setSelectedPropertyId('');
    setSelectedTenantId('');
    setSelectedUnitId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && !attachedFile) || isLoading) return;

    // If file is attached and modal is showing, don't send yet (wait for confirmation)
    if (attachedFile && showAssociationModal) {
      return;
    }

    const userMessage = inputValue.trim();
    const fileToSend = attachedFile;
    
    setInputValue('');
    setAttachedFile(null);
    setShowSuggestions(false); // Hide suggestions after first message

    // Show user message with file indicator if file is attached
    const displayMessage = fileToSend 
      ? `${userMessage}${userMessage ? ' ' : ''}📎 ${fileToSend.name}`
      : userMessage;
    
    setMessages(prev => [...prev, { text: displayMessage, sender: 'user' }]);
    setIsLoading(true);

    try {
      let response;
      
      if (fileToSend) {
        // Generate a unique document ID for the attached file
        const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // Send with file using FormData
        const formData = new FormData();
        formData.append('message', userMessage);
        formData.append('file', fileToSend);
        formData.append('document_id', documentId);
        if (userId) {
          formData.append('owner_id', userId);
        }
        
        // Get selected property info
        const selectedProperty = properties.find(p => p.id === selectedPropertyId);
        
        // Always include property ID and address if selected
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
        
        // Reset selection state
        setAssociationType(null);
        setSelectedPropertyId('');
        setSelectedTenantId('');
        setSelectedUnitId('');
        
        console.log('Sending chat message with file. Document ID:', documentId, 'Owner ID:', userId);
        console.log('Association Type:', associationType);
        console.log('Property ID:', selectedPropertyId);
        
        response = await fetch('https://tenantry.app.n8n.cloud/webhook-test/chat', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Send without file using JSON
        const payload = { 
          message: userMessage,
          owner_id: userId 
        };
        const jsonBody = JSON.stringify(payload);
        console.log('Sending message with payload:', payload);
        console.log('JSON body string:', jsonBody);
        
        response = await fetch('https://tenantry.app.n8n.cloud/webhook-test/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonBody,
        });
      }

      const data = await response.json();

      // Handle nested response structure: data.output.message
      const responseText = data.output?.message || data.response || data.message || 'Sorry, I could not process your request.';

      setMessages(prev => [...prev, {
        text: responseText,
        sender: 'bot'
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleAttachClick = () => {
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

  const startNewConversation = () => {
    // Reset the chat to initial state
    setMessages([
      { text: "Hi! I'm Emma, your rental property assistant. Ask me anything about your properties!", sender: 'bot' }
    ]);
    setShowSuggestions(true);
    setInputValue('');
    setAttachedFile(null);
    setIsLoading(false);
    setShowAssociationModal(false);
    setAssociationType(null);
    setSelectedPropertyId('');
    setSelectedTenantId('');
    setSelectedUnitId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <>
      <style>{`
        @keyframes subtle-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          37.5% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
      
      {/* Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Subtle pulsing rings */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2"
            style={{
              animation: 'subtle-pulse 3s linear infinite',
              backgroundColor: '#7A3EB1' + '66',
              borderColor: '#7A3EB1' + 'E6',
            }}
          ></div>
          {/* Button with Emma image */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative w-20 h-20 bg-white hover:bg-gray-50 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 overflow-hidden border-2"
            style={{ borderColor: '#7A3EB1' }}
          >
            <img 
              src="/Emma_Tenantry.png" 
              alt="Chat with Emma" 
              className="w-full h-full object-cover rounded-full"
            />
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[450px] h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="text-white p-4 rounded-t-lg flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0D98BA, #7928CA)' }}>
            <div className="flex items-center gap-3">
              <img src="/Emma_Tenantry.png" alt="Emma" className="w-10 h-10 rounded-full" />
              <div>
                <h3 className="font-semibold">Emma</h3>
                <p className="text-xs text-white/80">AI Property Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={startNewConversation}
                className="hover:bg-white/10 p-1 rounded transition-colors"
                title="Start new conversation"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {messages.map((message, index) => (
              <div key={index}>
                <div
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'bot' && (
                    <img src="/Emma_Tenantry.png" alt="Emma" className="w-8 h-8 rounded-full mr-2 flex-shrink-0" />
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === 'user'
                        ? 'bg-brand-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
                
                {/* Show suggestions after first message only */}
                {index === 0 && showSuggestions && (
                  <div className="ml-10 mt-3 space-y-2">
                    {suggestionPrompts.map((prompt, promptIndex) => (
                      <button
                        key={promptIndex}
                        onClick={() => handleSuggestionClick(prompt)}
                        disabled={isLoading}
                        className="block w-full text-left px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-brand-50 dark:hover:bg-gray-600 hover:border-brand-300 dark:hover:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <img src="/Emma_Tenantry.png" alt="Emma" className="w-8 h-8 rounded-full mr-2 flex-shrink-0" />
                <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ 
                    background: 'linear-gradient(135deg, #0D98BA, #7928CA)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              {/* Attachment button */}
              <button
                onClick={handleAttachClick}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              
              {/* Text input */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-transparent text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                style={{
                  boxShadow: 'none',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 2px #0D98BA, 0 0 0 4px #7928CA40';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              />
              
              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={(!inputValue.trim() && !attachedFile) || isLoading}
                className="px-4 py-2 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #0D98BA, #7928CA)',
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Call or text me at <a href="tel:8563936225" className="hover:underline" style={{ 
                background: 'linear-gradient(135deg, #0D98BA, #7928CA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>(856) 393-6225</a>, or email me at <a href="mailto:emma@tenantry.ai" className="hover:underline" style={{ 
                background: 'linear-gradient(135deg, #0D98BA, #7928CA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>emma@tenantry.ai</a>.
            </p>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showAssociationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Upload Document
              </h3>
              <button
                onClick={handleCancelAssociation}
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
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className={`w-full px-4 py-3 border-2 border-dashed rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-brand-500 dark:hover:border-brand-500 bg-gray-50 dark:bg-gray-700'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Paperclip className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {attachedFile ? attachedFile.name : 'Click or drag file here'}
                </span>
              </button>
              {attachedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <File className="w-4 h-4" />
                  <span className="truncate">{attachedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFile(null);
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
                          if (tenant) {
                            setSelectedPropertyId(tenant.property_id);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select a tenant</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.first_name} {tenant.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
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
                    onClick={handleCancelAssociation}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSend}
                    disabled={!attachedFile || !selectedPropertyId || (associationType === 'tenant' && !selectedTenantId) || (associationType === 'unit' && !selectedUnitId)}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Message
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

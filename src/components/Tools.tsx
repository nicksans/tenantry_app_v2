import { useState } from 'react';
import { FileText, Sparkles, MessageSquareText, ShieldCheck, Upload, ChevronDown } from 'lucide-react';

type ToolType = 'lease-audit' | 'listing-generator' | 'tenant-responses' | 'tenant-screening' | null;

interface ToolOption {
  id: ToolType;
  title: string;
  description: string;
  icon: typeof FileText;
}

export default function Tools() {
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [state, setState] = useState('');
  const [inputText, setInputText] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const toolOptions: ToolOption[] = [
    {
      id: 'lease-audit',
      title: 'Lease Audit',
      description: 'Upload a lease and get AI-powered analysis with state-specific recommendations and suggestions',
      icon: FileText
    },
    {
      id: 'listing-generator',
      title: 'Listing Description Generator',
      description: 'Create compelling property listings that attract quality tenants and showcase your property',
      icon: Sparkles
    },
    {
      id: 'tenant-responses',
      title: 'Tenant Response Assistant',
      description: 'Generate professional responses to tenant inquiries, maintenance requests, and communications',
      icon: MessageSquareText
    },
    {
      id: 'tenant-screening',
      title: 'Tenant Screening & Fraud Detection',
      description: 'AI-powered analysis to help identify potential red flags and verify tenant information',
      icon: ShieldCheck
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This will be connected to n8n webhook later
    console.log('Form submitted:', {
      toolType: selectedTool,
      uploadedFile,
      state,
      inputText,
      additionalDetails
    });
  };

  const resetForm = () => {
    setSelectedTool(null);
    setUploadedFile(null);
    setState('');
    setInputText('');
    setAdditionalDetails('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
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
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Tools</h1>
        <p className="text-gray-600 dark:text-gray-400">
          AI-powered tools to help you manage your rental properties more efficiently
        </p>
      </div>

      {!selectedTool ? (
        // Tool Selection Grid
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {toolOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedTool(option.id)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                    <Icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        // Tool Form
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {(() => {
                const ToolIcon = toolOptions.find(t => t.id === selectedTool)?.icon || FileText;
                return <ToolIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />;
              })()}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {toolOptions.find(t => t.id === selectedTool)?.title}
              </h2>
            </div>
            <button
              onClick={resetForm}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Change Tool
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Lease Audit Tool */}
            {selectedTool === 'lease-audit' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Lease Document
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragging 
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-brand-500 dark:hover:border-brand-500'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <input
                      type="file"
                      id="lease-upload"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                    />
                    <label
                      htmlFor="lease-upload"
                      className="cursor-pointer text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
                    >
                      Click to upload
                    </label>
                    <span className="text-gray-500 dark:text-gray-400"> or drag and drop</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      PDF, DOC, or DOCX (max 10MB)
                    </p>
                    {uploadedFile && (
                      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                        ✓ {uploadedFile.name}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Property State
                  </label>
                  <div className="relative">
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select a state</option>
                      <option value="CA">California</option>
                      <option value="NY">New York</option>
                      <option value="TX">Texas</option>
                      <option value="FL">Florida</option>
                      {/* Add more states as needed */}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    🔍 Emma will review your lease for: state law compliance, missing clauses, potential issues, and provide specific recommendations
                  </p>
                </div>
              </>
            )}

            {/* Listing Description Generator */}
            {selectedTool === 'listing-generator' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Property Details
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enter property details (e.g., bedrooms, bathrooms, square footage, amenities, location features)..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                    required
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ✨ Emma will create a compelling listing description that highlights your property's best features and attracts quality tenants
                  </p>
                </div>
              </>
            )}

            {/* Tenant Response Assistant */}
            {selectedTool === 'tenant-responses' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tenant Message or Inquiry
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste the tenant's message or describe the situation you need to respond to..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Response Tone (Optional)
                  </label>
                  <div className="relative">
                    <select
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Professional (default)</option>
                      <option value="friendly">Friendly</option>
                      <option value="formal">Formal</option>
                      <option value="empathetic">Empathetic</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    💬 Emma will generate a professional response that maintains good tenant relationships while protecting your interests
                  </p>
                </div>
              </>
            )}

            {/* Tenant Screening & Fraud Detection */}
            {selectedTool === 'tenant-screening' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tenant Information
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enter tenant application details, employment information, references, or any concerns you'd like Emma to analyze..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Documents (Optional)
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragging 
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-brand-500 dark:hover:border-brand-500'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <input
                      type="file"
                      id="screening-upload"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                    />
                    <label
                      htmlFor="screening-upload"
                      className="cursor-pointer text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
                    >
                      Click to upload
                    </label>
                    <span className="text-gray-500 dark:text-gray-400"> or drag and drop</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Pay stubs, ID, references, etc.
                    </p>
                    {uploadedFile && (
                      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                        ✓ {uploadedFile.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    🛡️ Emma will analyze the information for potential red flags, inconsistencies, and provide guidance on fair housing compliance
                  </p>
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Generate Analysis
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}



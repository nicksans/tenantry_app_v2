import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, ChevronDown, FileText, Download, Trash2, Loader2, AlertTriangle, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FreeReports from './FreeReports';

interface SavedReport {
  id: string;
  reportType: string;
  location: string;
  locationType: string;
  createdAt: Date;
  downloadUrl: string;
}

interface MyReportsProps {
  userId?: string;
}

export default function MyReports({ userId }: MyReportsProps) {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [visibleReportsCount, setVisibleReportsCount] = useState(5);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loadingReports, setLoadingReports] = useState(false);

  // Load saved reports from Supabase Storage on mount
  useEffect(() => {
    const fetchUserReports = async () => {
      if (!userId) return;
      
      setLoadingReports(true);
      try {
        // List all files in the user_documents folder for this user
        const { data, error } = await supabase.storage
          .from('user_documents')
          .list(userId, {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (error) {
          console.error('Error fetching user reports:', error);
          return;
        }

        // Filter files that end with 'custom_report'
        const customReports = data?.filter(file => 
          file.name.toLowerCase().endsWith('custom_report')
        ) || [];

        // Parse reports and get public URLs
        const reportsWithDetails: SavedReport[] = customReports.map(file => {
          const filePath = `${userId}/${file.name}`;
          const { data: urlData } = supabase.storage
            .from('user_documents')
            .getPublicUrl(filePath);
          
          const { reportType, location, locationType } = parseReportFilename(file.name);
          
          // Extract report ID from filename (e.g., "report_1764383652557_gzkwzqp" -> "report_1764383652557_gzkwzqp")
          const reportIdMatch = file.name.match(/^(report_\d+_[a-z0-9]+)/);
          const reportId = reportIdMatch ? reportIdMatch[1] : file.id;
          
          return {
            id: reportId,
            reportType,
            location,
            locationType,
            createdAt: new Date(file.created_at),
            downloadUrl: urlData.publicUrl
          };
        });

        setSavedReports(reportsWithDetails);
      } catch (error) {
        console.error('Error fetching user reports:', error);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchUserReports();
  }, [userId]);

  // Refetch user reports from Supabase Storage
  const refetchReports = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('user_documents')
        .list(userId, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error refetching user reports:', error);
        return;
      }

      const customReports = data?.filter(file => 
        file.name.toLowerCase().endsWith('custom_report')
      ) || [];

      const reportsWithDetails: SavedReport[] = customReports.map(file => {
        const filePath = `${userId}/${file.name}`;
        const { data: urlData } = supabase.storage
          .from('user_documents')
          .getPublicUrl(filePath);
        
        const { reportType, location, locationType } = parseReportFilename(file.name);
        const reportIdMatch = file.name.match(/^(report_\d+_[a-z0-9]+)/);
        const reportId = reportIdMatch ? reportIdMatch[1] : file.id;
        
        return {
          id: reportId,
          reportType,
          location,
          locationType,
          createdAt: new Date(file.created_at),
          downloadUrl: urlData.publicUrl
        };
      });

      setSavedReports(reportsWithDetails);
    } catch (error) {
      console.error('Error refetching user reports:', error);
    }
  };

  // Extract report details from filename
  const parseReportFilename = (filename: string) => {
    let reportType = 'Report';
    if (filename.includes('rental_market_analysis')) {
      reportType = 'Rental Market Analysis';
    } else if (filename.includes('cma')) {
      reportType = 'Comparative Market Analysis';
    } else if (filename.includes('rental_market_finder')) {
      reportType = 'Rental Market Finder';
    }

    const parts = filename.split('_');
    
    let location = 'Unknown Location';
    let locationType = 'Location';
    
    const cityIndex = parts.indexOf('city');
    const stateIndex = parts.indexOf('state');
    const zipIndex = parts.indexOf('zip');
    
    if (cityIndex !== -1 && cityIndex + 1 < parts.length) {
      const locationParts = [];
      for (let i = cityIndex + 1; i < parts.length; i++) {
        if (parts[i] === 'rental' || parts[i] === 'cma' || parts[i] === 'custom') break;
        locationParts.push(parts[i]);
      }
      location = locationParts.join('_').replace(/%20/g, ' ').replace(/,/g, ', ');
      locationType = 'City';
    } else if (stateIndex !== -1 && stateIndex + 1 < parts.length) {
      location = parts[stateIndex + 1].replace(/%20/g, ' ');
      locationType = 'State';
    } else if (zipIndex !== -1 && zipIndex + 1 < parts.length) {
      location = parts[zipIndex + 1];
      locationType = 'Zip Code';
    }

    return { reportType, location, locationType };
  };

  const handleDownloadReport = (report: SavedReport) => {
    window.open(report.downloadUrl, '_blank');
  };

  const handleDeleteReport = (reportId: string) => {
    setReportToDelete(reportId);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    
    try {
      console.log('Deleting report with ID:', reportToDelete);
      console.log('Owner ID:', userId);
      
      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/delete-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_id: reportToDelete,
          owner_id: userId,
        }),
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      await refetchReports();
      setReportToDelete(null);
      
    } catch (error) {
      console.error('Error deleting report:', error);
      setDeleteError('Failed to delete report. Please try again.');
      setTimeout(() => setDeleteError(null), 7000);
      setReportToDelete(null);
    }
  };

  const cancelDeleteReport = () => {
    setReportToDelete(null);
  };

  const getReportIcon = (reportType: string) => {
    if (reportType.includes('Rental')) return DollarSign;
    if (reportType.includes('Market Finder')) return Users;
    return TrendingUp;
  };

  // Filter and sort reports
  const getFilteredAndSortedReports = () => {
    let filtered = [...savedReports];

    if (filterType !== 'all') {
      filtered = filtered.filter(report => {
        if (report.reportType === filterType) {
          return true;
        }
        
        const reportLower = report.reportType.toLowerCase();
        const filterLower = filterType.toLowerCase();
        
        if (filterLower.includes('rental') && filterLower.includes('analysis')) {
          return reportLower.includes('rental') && (reportLower.includes('analysis') || reportLower.includes('market'));
        }
        if (filterLower.includes('comparative') || filterLower.includes('cma')) {
          return reportLower.includes('comparative') || reportLower.includes('cma');
        }
        if (filterLower.includes('finder')) {
          return reportLower.includes('finder');
        }
        
        return false;
      });
    }

    filtered.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
    });

    return filtered;
  };

  const getAvailableReportTypes = () => {
    const reportTypes = ['Rental Market Analysis', 'Comparative Market Analysis', 'Rental Market Finder'];
    
    const availableTitles = reportTypes.filter(title => 
      savedReports.some(report => 
        report.reportType.toLowerCase().includes('rental') && title.toLowerCase().includes('rental') ||
        report.reportType.toLowerCase().includes('comparative') && title.toLowerCase().includes('comparative') ||
        report.reportType.toLowerCase().includes('finder') && title.toLowerCase().includes('finder')
      )
    );
    
    return availableTitles;
  };

  const handleLoadMore = () => {
    setVisibleReportsCount(prev => prev + 10);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">My Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all of your market reports
          </p>
        </div>

        {/* Pro Reports Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pro Reports</h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {savedReports.length} report{savedReports.length !== 1 ? 's' : ''} saved
            </span>
          </div>

          {/* Filters - Always visible */}
          {savedReports.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              {/* Filter by Report Type */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Filter by Type
                </label>
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Reports</option>
                    {getAvailableReportTypes().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Sort Order */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Sort by Date
                </label>
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Clear Filters Button */}
              {(filterType !== 'all' || sortOrder !== 'newest') && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setSortOrder('newest');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delete Confirmation Message */}
          {reportToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Delete Report?
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    Are you sure you want to delete this report? Tenantry AI will also forget its contents. This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelDeleteReport}
                      className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteReport}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Delete Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Error Message */}
          {deleteError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100">Delete failed</h4>
                <p className="text-sm text-red-700 dark:text-red-300">{deleteError}</p>
              </div>
              <button
                onClick={() => setDeleteError(null)}
                className="flex-shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Reports List */}
          {loadingReports ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-600 animate-spin" />
              <p>Loading your reports...</p>
            </div>
          ) : savedReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
              <p>No reports generated yet</p>
              <p className="text-sm mt-2">Generate your first report using the Analysis Tools</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {getFilteredAndSortedReports().slice(0, visibleReportsCount).map((report) => {
                  const ReportIcon = getReportIcon(report.reportType);
                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ReportIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {report.reportType}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {report.locationType} • {report.location} • {report.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadReport(report)}
                          className="p-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                          title="Download report"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Delete report"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {visibleReportsCount < getFilteredAndSortedReports().length && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                  >
                    Load {Math.min(10, getFilteredAndSortedReports().length - visibleReportsCount)} more
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Showing X of Y message */}
              {getFilteredAndSortedReports().length > 0 && (
                <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  Showing {Math.min(visibleReportsCount, getFilteredAndSortedReports().length)} of {getFilteredAndSortedReports().length} reports
                </div>
              )}
            </>
          )}
        </div>

        {/* Free Reports Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Free Reports</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Browse the public archive of free Rental Market Analysis reports
            </p>
          </div>
          <FreeReports userId={userId} isEmbedded={true} />
        </div>
      </div>
    </div>
  );
}


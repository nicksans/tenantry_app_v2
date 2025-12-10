import { useState, useEffect } from 'react';
import { Download, Loader2, FileText, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FreeReport {
  id: string;
  name: string;
  location: string;
  created_at: string;
  publicUrl: string;
}

interface FreeReportsProps {
  userId?: string;
  isEmbedded?: boolean;
}

export default function FreeReports({ userId, isEmbedded = false }: FreeReportsProps) {
  const [allReports, setAllReports] = useState<FreeReport[]>([]);
  const [displayedReports, setDisplayedReports] = useState<FreeReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Extract location from filename
  // Example: "report_1764383652557_gzkwzqp_Nashville, TN_rental_market_analysis"
  // Should extract: "Nashville, TN"
  const extractLocationFromFilename = (filename: string): string => {
    // Remove the file extension if present
    const nameWithoutExt = filename.replace(/\.(pdf|docx|doc)$/i, '');
    
    // Split by underscores
    const parts = nameWithoutExt.split('_');
    
    // Find the location part - it's between the last timestamp/random string and "rental"
    // We're looking for the part that comes before "rental_market_analysis" or "rentalmarketreport"
    const rentalIndex = parts.findIndex(part => 
      part.toLowerCase() === 'rental' || 
      part.toLowerCase() === 'rentalmarketreport' ||
      part.toLowerCase().includes('rental')
    );
    
    if (rentalIndex > 0) {
      // The location is the part(s) before "rental"
      // Join parts from after the random string to before "rental"
      // Typically: report_timestamp_random_LOCATION_rental_market_analysis
      // So location is at index 3 (or rentalIndex - 1)
      const locationPart = parts[rentalIndex - 1];
      return locationPart || filename;
    }
    
    // Fallback: return the filename without the rental_market_analysis suffix
    return nameWithoutExt.replace(/_rental_market_analysis$/i, '')
      .replace(/_rentalmarketreport$/i, '');
  };

  // Format date nicely
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Fetch free reports from Supabase Storage
  useEffect(() => {
    const fetchFreeReports = async () => {
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
          console.error('Error fetching free reports:', error);
          return;
        }

        // Filter files that contain 'rental_market_analysis' anywhere in the filename
        const rentalMarketReports = data?.filter(file => 
          file.name.toLowerCase().includes('rental_market_analysis')
        ) || [];

        // Get public URLs and extract locations
        const reportsWithDetails: FreeReport[] = rentalMarketReports.map(file => {
          const filePath = `${userId}/${file.name}`;
          const { data: urlData } = supabase.storage
            .from('user_documents')
            .getPublicUrl(filePath);
          
          return {
            id: file.id,
            name: file.name,
            location: extractLocationFromFilename(file.name),
            created_at: file.created_at,
            publicUrl: urlData.publicUrl
          };
        });

        setAllReports(reportsWithDetails);
      } catch (error) {
        console.error('Error fetching free reports:', error);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchFreeReports();
  }, [userId]);

  // Filter and sort reports
  useEffect(() => {
    let filtered = [...allReports];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report => 
        report.location.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      
      if (sortOrder === 'newest') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    // Show only first 10 if no search query
    if (!searchQuery.trim()) {
      filtered = filtered.slice(0, 10);
    }

    setDisplayedReports(filtered);
  }, [allReports, searchQuery, sortOrder]);

  return (
    <div className={isEmbedded ? '' : 'p-6'}>
      <div className="max-w-4xl mx-auto">
        {!isEmbedded && (
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Free Reports</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse the public archive of free Rental Market Analysis reports. 
            </p>
          </div>
        )}

        {/* Search and Sort Controls */}
        <div className={`${isEmbedded ? '' : 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'} p-4 mb-6`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Search by Location
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Nashville, TN"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="sm:w-48">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Sort by Date
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Info text */}
          {!searchQuery.trim() && allReports.length > 10 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Showing the 10 most recent reports. Use the search bar to find specific locations.
            </p>
          )}
        </div>

        {/* Reports List */}
        <div className={isEmbedded ? '' : 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {searchQuery.trim() ? 'Search Results' : 'Recent Rental Market Analysis Reports'}
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {displayedReports.length} report{displayedReports.length !== 1 ? 's' : ''}
              {searchQuery.trim() && ` found`}
            </span>
          </div>

          {loadingReports ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-gray-400 dark:text-gray-600 animate-spin" />
              <p>Loading reports...</p>
            </div>
          ) : displayedReports.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
              <p>
                {searchQuery.trim() 
                  ? `No reports found for "${searchQuery}"`
                  : 'No reports available yet'}
              </p>
              {searchQuery.trim() && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-sm text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                        {report.location}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created on {formatDate(report.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => window.open(report.publicUrl, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors text-sm font-medium"
                      title="Download report"
                    >
                      <Download className="w-4 h-4" />
                      Free Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results count at bottom */}
          {displayedReports.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
              {searchQuery.trim() ? (
                <span>
                  Showing all {displayedReports.length} matching report{displayedReports.length !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>
                  Showing {displayedReports.length} of {allReports.length} total report{allReports.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


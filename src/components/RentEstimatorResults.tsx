import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, MapPin, ArrowLeft, FileText } from 'lucide-react';

interface RentEstimatorResultsProps {
  userId?: string;
}

interface RentEstimate {
  rent_estimate_id: string;
  owner_id: string;
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  lastSaleDate: string;
  lastSalePrice: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  rent: number;
  source: string;
  created_at: string;
  countyFips: string;
  stateFips: string;
}

interface RentComp {
  rent_comp_id: string;
  rent_estimate_id: string;
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  stateFips: string;
  zipCode: string;
  county: string;
  countyFips: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  status: string;
  price: number;
  listingType: string;
  listedDate: string;
  removedDate: string;
  lastSeenDate: string;
  daysOnMarket: number;
  distance: number;
  daysOld: number;
  correlation: number;
  owner_id: string;
  created_at: string;
}

export default function RentEstimatorResults({ userId }: RentEstimatorResultsProps) {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [estimate, setEstimate] = useState<RentEstimate | null>(null);
  const [comps, setComps] = useState<RentComp[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  console.log('🏠 RentEstimatorResults component mounted, estimateId:', estimateId, 'userId:', userId);

  // Fetch the estimate and comps data
  useEffect(() => {
    const fetchData = async () => {
      if (!estimateId) {
        console.log('❌ No estimate ID provided');
        setLoading(false);
        return;
      }

      if (!userId) {
        console.log('❌ No user ID provided');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching data for estimate ID:', estimateId, 'user:', userId);

      try {
        // Fetch the main estimate - filter by BOTH rent_estimate_id AND owner_id for RLS
        const { data: estimateData, error: estimateError } = await supabase
          .from('rent_estimates')
          .select('*')
          .eq('rent_estimate_id', estimateId)
          .eq('owner_id', userId)
          .single();

        console.log('📊 Estimate data:', estimateData, 'Error:', estimateError);

        if (estimateError) throw estimateError;
        setEstimate(estimateData);

        // Fetch the comps directly linked to this estimate
        const { data: compsData, error: compsError } = await supabase
          .from('rent_comps')
          .select('*')
          .eq('rent_estimate_id', estimateId)
          .eq('owner_id', userId)
          .order('distance', { ascending: true });

        console.log('🏘️ Comps data:', compsData?.length || 0, 'comps found', 'Error:', compsError);

        if (compsError) throw compsError;
        setComps(compsData || []);

      } catch (error) {
        console.error('❌ Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [estimateId, userId]);

  // Initialize Google Map
  useEffect(() => {
    if (!estimate || comps.length === 0 || mapLoaded) return;

    const initMap = () => {
      const mapDiv = document.getElementById('rent-estimate-map');
      if (!mapDiv || !window.google) return;

      // Get the subject property coordinates
      const subjectLat = estimate.latitude || 0;
      const subjectLng = estimate.longitude || 0;

      const map = new google.maps.Map(mapDiv, {
        center: { lat: subjectLat, lng: subjectLng },
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
      });

      // Add marker for subject property (red)
      new google.maps.Marker({
        position: { lat: subjectLat, lng: subjectLng },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        title: estimate.formattedAddress,
      });

      // Add markers for comps (blue)
      comps.forEach((comp) => {
        new google.maps.Marker({
          position: { lat: comp.latitude, lng: comp.longitude },
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3B82F6',
            fillOpacity: 0.8,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
          title: `${comp.formattedAddress} - $${comp.price}/mo`,
        });
      });

      setMapLoaded(true);
    };

    // Load Google Maps if not already loaded
    if (typeof window.google === 'undefined' || typeof window.google.maps === 'undefined') {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [estimate, comps, mapLoaded]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-brand-500 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Loading your rent estimate...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Estimate not found</p>
            <button
              onClick={() => navigate('/app/tools')}
              className="mt-4 text-brand-600 hover:underline"
            >
              Back to Tools
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/app/tools')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Rent Estimate
          </h1>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{estimate.formattedAddress}</span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rent Estimate Cards */}
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                // Calculate average and median from comps
                const compPrices = comps.map(c => c.price).filter(p => p != null && p > 0);
                const average = compPrices.length > 0 
                  ? Math.round(compPrices.reduce((sum, price) => sum + price, 0) / compPrices.length)
                  : null;
                
                const sortedPrices = [...compPrices].sort((a, b) => a - b);
                const median = sortedPrices.length > 0
                  ? sortedPrices.length % 2 === 0
                    ? Math.round((sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2)
                    : sortedPrices[Math.floor(sortedPrices.length / 2)]
                  : null;

                return (
                  <>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-4 border-brand-500 p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ESTIMATED RENT</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        ${estimate.rent?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">RENT RANGE</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        ${estimate.rentRangeLow?.toLocaleString() || '0'} - ${estimate.rentRangeHigh?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">AVERAGE RENT</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        ${average?.toLocaleString() || '-'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">MEDIAN RENT</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        ${median?.toLocaleString() || '-'}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Property Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Property Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{estimate.propertyType || '-'}</p>
                </div>
                {estimate.yearBuilt && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Year Built</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{estimate.yearBuilt}</p>
                  </div>
                )}
                {estimate.lastSalePrice && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Sale</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">${estimate.lastSalePrice.toLocaleString()}</p>
                  </div>
                )}
                {estimate.lotSize && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Lot Size</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{estimate.lotSize.toLocaleString()} sq ft</p>
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div
                id="rent-estimate-map"
                className="w-full h-96 rounded-lg bg-gray-100 dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Red marker: Subject property • Blue markers: Comparable rentals
              </p>
            </div>
          </div>

          {/* Right Column - Property Details & CTA */}
          <div className="space-y-6">
            {/* Property Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Property Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bedrooms</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{estimate.bedrooms || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bathrooms</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{estimate.bathrooms || '-'}</p>
                </div>
                {estimate.squareFootage && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Square Feet</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {estimate.squareFootage.toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{estimate.city}, {estimate.state} {estimate.zipCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Comparables Found</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{comps.length}</p>
                </div>
              </div>
            </div>

            {/* Pro Report CTA */}
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg shadow-lg p-6 text-white">
              <FileText className="w-10 h-10 mb-3" />
              <h3 className="text-xl font-semibold mb-2">View Pro Report</h3>
              <p className="text-sm text-brand-50 mb-4">
                Download a comprehensive Rental Market Analysis report for {estimate.city}, {estimate.state} using the latest available market data.
              </p>
              <button
                onClick={() => navigate('/app/market-reports')}
                className="w-full bg-white text-brand-600 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Get Pro Report
              </button>
            </div>
          </div>
        </div>

        {/* Comparables Table */}
        {comps.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Comparable Rentals ({comps.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left">
                    <th className="pb-3 text-sm font-medium text-gray-600 dark:text-gray-400">Address</th>
                    <th className="pb-3 text-sm font-medium text-gray-600 dark:text-gray-400">Price</th>
                    <th className="pb-3 text-sm font-medium text-gray-600 dark:text-gray-400">Beds</th>
                    <th className="pb-3 text-sm font-medium text-gray-600 dark:text-gray-400">Baths</th>
                    <th className="pb-3 text-sm font-medium text-gray-600 dark:text-gray-400">Sq Ft</th>
                    <th className="pb-3 text-sm font-medium text-gray-600 dark:text-gray-400">$/Sq Ft</th>
                    <th className="pb-3 text-sm font-medium text-gray-600 dark:text-gray-400">Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {comps.map((comp) => {
                    const pricePerSqFt = comp.price && comp.squareFootage 
                      ? (comp.price / comp.squareFootage).toFixed(2)
                      : null;
                    
                    return (
                      <tr key={comp.rent_comp_id}>
                        <td className="py-3 text-sm text-gray-900 dark:text-gray-100">{comp.formattedAddress}</td>
                        <td className="py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          ${comp.price?.toLocaleString() || '-'}
                        </td>
                        <td className="py-3 text-sm text-gray-900 dark:text-gray-100">{comp.bedrooms || '-'}</td>
                        <td className="py-3 text-sm text-gray-900 dark:text-gray-100">{comp.bathrooms || '-'}</td>
                        <td className="py-3 text-sm text-gray-900 dark:text-gray-100">
                          {comp.squareFootage ? comp.squareFootage.toLocaleString() : '-'}
                        </td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                          {pricePerSqFt ? `$${pricePerSqFt}` : '-'}
                        </td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                          {comp.distance ? comp.distance.toFixed(2) : '-'} mi
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ParkingMap } from './components/ParkingMap';
import { DetailCard } from './components/DetailCard';
import { fetchCarparkData } from './services/tfnswService';
import { AppState, Carpark } from './types';
import { MapPin, RefreshCw, AlertTriangle, Search, List, Map as MapIcon, ArrowUpDown, Navigation, ChevronRight, X } from 'lucide-react';

// --- Utility Functions for Distance ---

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// --- Constants ---
const SEVEN_HILLS_COORDS = { latitude: -33.7738, longitude: 150.9351 };

// --- Component ---

type SortOption = 'distance' | 'name' | 'availability';
type ViewMode = 'map' | 'list';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    userLocation: null,
    carparks: [],
    loading: true,
    error: null,
    selectedCarpark: null,
    demoMode: false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, isDemo } = await fetchCarparkData();
      setState(prev => ({
        ...prev,
        carparks: data,
        demoMode: isDemo,
        loading: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to load parking data.",
        loading: false
      }));
    }
  }, []);

  // Initialize: Get Location & Data
  useEffect(() => {
    loadData();

    const handleDefaultLocation = () => {
        setState(prev => ({
            ...prev,
            userLocation: SEVEN_HILLS_COORDS // Default to Seven Hills Park & Ride
        }));
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState(prev => ({
            ...prev,
            userLocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }));
        },
        (error) => {
          console.warn("Geolocation denied or error:", error);
          handleDefaultLocation();
        }
      );
    } else {
        handleDefaultLocation();
    }
  }, [loadData]);

  const handleSelectCarpark = (carpark: Carpark) => {
    setState(prev => ({ ...prev, selectedCarpark: carpark }));
  };

  const handleCloseDetail = () => {
    setState(prev => ({ ...prev, selectedCarpark: null }));
  };

  const handleViewToggle = () => {
    setViewMode(prev => prev === 'map' ? 'list' : 'map');
  };

  const handleSearchSelect = (carpark: Carpark) => {
    handleSelectCarpark(carpark);
    setSearchQuery(''); // Clear search on select to reset view
    setViewMode('map'); // Switch to map to show location
  };

  // 1. Search Matches (Strictly for the Dropdown)
  const searchMatches = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) return [];

    // Split query into individual words (tokens)
    const searchTokens = trimmedQuery.split(/\s+/);

    return state.carparks.filter(carpark => {
      // Combine relevant fields for searching
      const searchableText = `
        ${carpark.facility_name} 
        ${carpark.tsn || ''} 
        ${carpark.facility_id}
      `.toLowerCase();

      // Check if ALL tokens exist in the searchable text (AND logic)
      return searchTokens.every(token => searchableText.includes(token));
    });
  }, [state.carparks, searchQuery]);

  // 2. Main List Logic (Map & List View) - Decoupled from Search Query
  // This ensures the map doesn't "empty out" while typing
  const sortedCarparks = useMemo(() => {
    let sorted = [...state.carparks]; 
    
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.facility_name.localeCompare(b.facility_name));
    } else if (sortBy === 'availability') {
      sorted.sort((a, b) => (b.spots_free || 0) - (a.spots_free || 0));
    } else if (sortBy === 'distance' && state.userLocation) {
      sorted.sort((a, b) => {
        const distA = getDistanceFromLatLonInKm(state.userLocation!.latitude, state.userLocation!.longitude, parseFloat(a.latitude), parseFloat(a.longitude));
        const distB = getDistanceFromLatLonInKm(state.userLocation!.latitude, state.userLocation!.longitude, parseFloat(b.latitude), parseFloat(b.longitude));
        return distA - distB;
      });
    }
    return sorted;
  }, [state.carparks, sortBy, state.userLocation]);

  // 3. Nearest Logic for Overlay (Always based on User Location & Full List)
  const nearestThree = useMemo(() => {
      if (!state.userLocation) return [];
      // Use full list, ignore search query
      const sorted = [...state.carparks].sort((a, b) => {
        const distA = getDistanceFromLatLonInKm(state.userLocation!.latitude, state.userLocation!.longitude, parseFloat(a.latitude), parseFloat(a.longitude));
        const distB = getDistanceFromLatLonInKm(state.userLocation!.latitude, state.userLocation!.longitude, parseFloat(b.latitude), parseFloat(b.longitude));
        return distA - distB;
      });
      return sorted.slice(0, 3);
  }, [state.carparks, state.userLocation]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50">
      
      {/* Top Bar Container - Floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 rounded-2xl p-3 pointer-events-auto max-w-4xl mx-auto space-y-3">
          
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
                  <MapPin className="w-5 h-5" />
               </div>
               <div>
                  <h1 className="font-bold text-slate-800 leading-none text-lg">NSW Park & Ride</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Live Availability</p>
               </div>
            </div>
            <button 
              onClick={loadData}
              disabled={state.loading}
              className={`p-2.5 rounded-xl transition-all border border-transparent ${state.loading ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-200'}`}
              aria-label="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${state.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Row */}
          <div className="relative z-20 group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
             <input 
                type="text" 
                placeholder="Search name, zone (e.g. TWG), or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
             />
             {searchQuery && (
                <>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown Results */}
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2">
                        {searchMatches.length > 0 ? (
                            searchMatches.map(carpark => (
                                <button
                                    key={carpark.facility_id}
                                    onClick={() => handleSearchSelect(carpark)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none transition-colors flex items-center justify-between"
                                >
                                    <span className="font-medium text-slate-800 text-sm">{carpark.facility_name}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-slate-400 text-sm">No results found</div>
                        )}
                    </div>
                </>
             )}
          </div>

          {/* Controls Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ArrowUpDown className="w-4 h-4 text-slate-500" />
                </div>
                <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full pl-9 pr-8 py-2.5 appearance-none bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                    <option value="distance" disabled={!state.userLocation}>Distance {(!state.userLocation) ? '(Locating...)' : ''}</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="availability">Free Spots</option>
                </select>
                {/* Custom Chevron for select */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
            
            <button 
                onClick={handleViewToggle}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium shadow-md shadow-slate-200 hover:bg-slate-900 transition-all active:scale-95"
            >
                {viewMode === 'map' ? (
                    <>
                        <List className="w-4 h-4" />
                        <span>List</span>
                    </>
                ) : (
                    <>
                        <MapIcon className="w-4 h-4" />
                        <span>Map</span>
                    </>
                )}
            </button>
          </div>
        </div>
        
        {state.demoMode && (
             <div className="max-w-4xl mx-auto mt-2 pointer-events-auto">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 px-3 flex items-center gap-2 text-xs text-orange-800 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span>Using Demo Data (CORS/API Limit)</span>
                </div>
            </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-slate-100">
        {viewMode === 'map' ? (
             <ParkingMap 
                userLocation={state.userLocation} 
                carparks={sortedCarparks}
                onSelectCarpark={handleSelectCarpark}
                selectedCarpark={state.selectedCarpark}
            />
        ) : (
            // List View
            <div className="h-full overflow-y-auto pt-52 pb-24 px-4 sm:px-6 md:pt-56">
                <div className="max-w-4xl mx-auto space-y-3">
                    {sortedCarparks.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <p>No parking locations found.</p>
                        </div>
                    ) : (
                        sortedCarparks.map(carpark => {
                            const total = carpark.occupancy.total;
                            const free = carpark.spots_free || 0;
                            const percentage = total > 0 ? (free / total) : 0;
                            let statusColor = "text-green-600 bg-green-50";
                            if (percentage < 0.1) statusColor = "text-red-600 bg-red-50";
                            else if (percentage < 0.3) statusColor = "text-orange-600 bg-orange-50";

                            let distanceStr = "";
                            if (state.userLocation) {
                                const d = getDistanceFromLatLonInKm(
                                    state.userLocation.latitude, state.userLocation.longitude, 
                                    parseFloat(carpark.latitude), parseFloat(carpark.longitude)
                                );
                                distanceStr = d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)}km`;
                            }

                            return (
                                <div 
                                    key={carpark.facility_id}
                                    onClick={() => {
                                        handleSelectCarpark(carpark);
                                        // Optional: Switch to map on click?
                                        // setViewMode('map'); 
                                    }}
                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-between items-center group"
                                >
                                    <div className="min-w-0 flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{carpark.facility_name}</h3>
                                            {distanceStr && (
                                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                                    {distanceStr}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">Zone: {carpark.tsn || 'N/A'}</p>
                                    </div>
                                    <div className={`flex flex-col items-end shrink-0 px-3 py-1.5 rounded-lg ${statusColor}`}>
                                        <span className="text-xl font-bold leading-none">{free}</span>
                                        <span className="text-[10px] font-semibold uppercase opacity-80">Free</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}
      </div>

      {/* "Nearby" Overlay - Visible on Map Mode when nothing is selected */}
      {viewMode === 'map' && !state.selectedCarpark && nearestThree.length > 0 && (
         <div className="absolute bottom-0 left-0 right-0 p-4 z-[900] pointer-events-none animate-slide-up sm:max-w-md sm:m-4">
             <div className="pointer-events-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-blue-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Nearest Locations</h3>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {nearestThree.map(carpark => {
                        const d = state.userLocation ? getDistanceFromLatLonInKm(
                            state.userLocation.latitude, state.userLocation.longitude,
                            parseFloat(carpark.latitude), parseFloat(carpark.longitude)
                        ) : 0;
                        const distStr = d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)}km`;
                        const free = carpark.spots_free || 0;
                        const total = carpark.occupancy.total;
                        const percentage = total > 0 ? (free / total) : 0;
                        let textColor = "text-green-600";
                        if (percentage < 0.1) textColor = "text-red-600";
                        else if (percentage < 0.3) textColor = "text-orange-600";

                        return (
                            <div 
                                key={carpark.facility_id}
                                onClick={() => handleSelectCarpark(carpark)}
                                className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group"
                            >
                                <div className="min-w-0 pr-3">
                                    <h4 className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600">{carpark.facility_name}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">{distStr} away</p>
                                </div>
                                <div className="flex items-center gap-2 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className={`text-sm font-bold ${textColor}`}>{free}</span>
                                        <span className="text-[9px] text-slate-400 uppercase">Free</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>
                            </div>
                        )
                    })}
                </div>
             </div>
         </div>
      )}

      {/* Detail Overlay - Visible in both modes if selected */}
      {state.selectedCarpark && (
        <DetailCard 
          carpark={state.selectedCarpark} 
          onClose={handleCloseDetail}
          userLocation={state.userLocation}
        />
      )}
    </div>
  );
};

export default App;
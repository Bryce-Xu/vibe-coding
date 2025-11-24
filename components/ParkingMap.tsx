import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { Carpark, Coordinate } from '../types';
import { Crosshair } from 'lucide-react';

// Map tile sources - optimized for stability and performance
const MAP_SOURCES = [
  {
    name: 'OpenStreetMap', // Default lightweight map
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
    minZoom: 9
  },
  {
    name: 'CartoDB Positron (Light)', // Clean look, usually fast
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    minZoom: 9
  },
  {
    name: 'Esri World Street Map', // Alternative stable map
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 19,
    minZoom: 9
  },
  {
    name: 'Esri World Imagery', // Satellite view
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
    minZoom: 9
  }
];

// Tile cache using IndexedDB for persistent storage
class TileCache {
  private static dbName = 'mapTileCache';
  private static storeName = 'tiles';
  private static db: IDBDatabase | null = null;
  private static initPromise: Promise<IDBDatabase> | null = null;

  static async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  static async get(key: string): Promise<string | null> {
    try {
      const db = await this.init();
      return new Promise((resolve) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result && Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  static async set(key: string, data: string): Promise<void> {
    try {
      const db = await this.init();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.put({ key, data, timestamp: Date.now() });
    } catch {
      // Ignore errors
    }
  }
}

// Optimized TileLayer
const OptimizedTileLayer: React.FC<{ source: typeof MAP_SOURCES[0] }> = ({ source }) => {
  useEffect(() => {
    // Initialize tile cache (silent fail ok)
    TileCache.init().catch(() => {});
  }, []);

  return (
    <TileLayer
      attribution={source.attribution}
      url={source.url}
      subdomains={source.subdomains || []} // Some sources don't have subdomains
      maxZoom={source.maxZoom}
      minZoom={source.minZoom || 9}
      crossOrigin="anonymous"
      updateWhenZooming={false}
      updateWhenIdle={true}
      keepBuffer={2} // Increased buffer slightly for smoother panning
    />
  );
};

// Fix Leaflet's default icon path issues in React by using CDN URLs
// Direct imports of .png files fail in this environment
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ParkingMapProps {
  userLocation: Coordinate | null;
  carparks: Carpark[];
  onSelectCarpark: (carpark: Carpark) => void;
  selectedCarpark: Carpark | null;
}

// Component to recenter map when user location changes
const RecenterMap = ({ location }: { location: Coordinate | null }) => {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.latitude, location.longitude], 13);
    }
  }, [location, map]);
  return null;
};

// Custom icons based on availability
const getIcon = (free: number, total: number, options?: { selected?: boolean }) => {
  const percentage = total > 0 ? (free / total) : 0;
  let color = '#22c55e'; // green-500
  if (percentage < 0.1) color = '#ef4444'; // red-500
  else if (percentage < 0.3) color = '#f97316'; // orange-500

  if (options?.selected) {
    color = '#2563eb'; // blue-600 for selected marker
  }

  const size = options?.selected ? 40 : 32;
  const anchor = options?.selected ? 20 : 16;

  // Create a custom SVG icon
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${options?.selected ? 'w-10 h-10 drop-shadow-2xl' : 'w-8 h-8 drop-shadow-lg'}">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3" fill="white"></circle>
  </svg>`;

  return new L.DivIcon({
    className: 'custom-icon',
    html: svg,
    iconSize: [size, size],
    iconAnchor: [anchor, size - 8],
    popupAnchor: [0, -anchor],
  });
};

const UserIcon = new L.DivIcon({
    className: 'user-icon',
    html: `
    <div class="relative flex h-6 w-6">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-6 w-6 bg-blue-500 border-2 border-white shadow-lg items-center justify-center">
      </span>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// Component to handle lazy loading of markers (only render visible ones)
const LazyMarkers: React.FC<{ 
  carparks: Carpark[]; 
  onSelectCarpark: (carpark: Carpark) => void;
  selectedCarpark: Carpark | null;
}> = ({ carparks, onSelectCarpark, selectedCarpark }) => {
  const map = useMap();
  const [visibleCarparks, setVisibleCarparks] = useState<Carpark[]>([]);

  useEffect(() => {
    const updateVisibleMarkers = () => {
      const bounds = map.getBounds();
      const visible = carparks.filter(carpark => {
        const lat = parseFloat(carpark.latitude);
        const lng = parseFloat(carpark.longitude);
        if (isNaN(lat) || isNaN(lng)) return false;
        return bounds.contains([lat, lng]);
      });
      if (visible.length > 0) {
        setVisibleCarparks(visible);
      } else {
        setVisibleCarparks(carparks.slice(0, Math.min(50, carparks.length)));
      }
    };

    updateVisibleMarkers();
    map.on('moveend', updateVisibleMarkers);
    map.on('zoomend', updateVisibleMarkers);

    return () => {
      map.off('moveend', updateVisibleMarkers);
      map.off('zoomend', updateVisibleMarkers);
    };
  }, [map, carparks]);

  return (
    <>
      {visibleCarparks.map((carpark) => {
        const lat = parseFloat(carpark.latitude);
        const lng = parseFloat(carpark.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;
        const isSelected = selectedCarpark?.facility_id === carpark.facility_id;

        return (
          <Marker 
            key={carpark.facility_id} 
            position={[lat, lng]}
            icon={getIcon(carpark.spots_free || 0, carpark.occupancy.total, { selected: isSelected })}
            eventHandlers={{
              click: () => onSelectCarpark(carpark)
            }}
          />
        );
      })}
    </>
  );
};

// Component to handle map resize invalidation
const MapInvalidator = () => {
  const map = useMap();

  useEffect(() => {
    // Immediate invalidation
    map.invalidateSize();

    // Delayed invalidation to handle layout reflows/animations
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);
    const timer3 = setTimeout(() => map.invalidateSize(), 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [map]);

  return null;
};

export const ParkingMap: React.FC<ParkingMapProps> = ({ userLocation, carparks, onSelectCarpark, selectedCarpark }) => {
  const center = useMemo<[number, number]>(() => {
    return userLocation ? [userLocation.latitude, userLocation.longitude] : [-33.8688, 151.2093]; // Default to Sydney
  }, [userLocation]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  useEffect(() => {
    if (selectedCarpark && mapInstance) {
      const lat = parseFloat(selectedCarpark.latitude);
      const lng = parseFloat(selectedCarpark.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        const targetZoom = Math.max(mapInstance.getZoom(), 14);
        mapInstance.flyTo([lat, lng], targetZoom, { duration: 0.7 });
      }
    }
  }, [selectedCarpark, mapInstance]);

  const handleLocateUser = useCallback(() => {
    if (!mapInstance) return;

    const goToLocation = (lat: number, lng: number) => {
      mapInstance.flyTo([lat, lng], 14, { duration: 0.6 });
    };

    if (userLocation) {
      goToLocation(userLocation.latitude, userLocation.longitude);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          goToLocation(latitude, longitude);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          alert('Unable to access your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported in this browser.');
    }
  }, [mapInstance, userLocation]);

  return (
    <div className="h-full w-full relative z-0">
      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-slate-500 text-xs">Loading map...</p>
          </div>
        </div>
      )}
      
      <MapContainer 
        center={center} 
        zoom={10} 
        minZoom={9}
        maxZoom={18} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        preferCanvas={true}
        whenReady={() => setMapLoaded(true)}
        whenCreated={setMapInstance}
      >
        {/* Map Invalidator to fix viewport size issues */}
        <MapInvalidator />
        {/* Map Invalidator to fix viewport size issues */}
        <MapInvalidator />
        
        {/* Layer Control allows user to switch map sources manually */}
        <LayersControl position="topright">
          {MAP_SOURCES.map((source, index) => (
            <LayersControl.BaseLayer 
              key={source.name} 
              checked={index === 0} // First one is default
              name={source.name}
            >
              <OptimizedTileLayer source={source} />
            </LayersControl.BaseLayer>
          ))}
        </LayersControl>
        
        <RecenterMap location={userLocation} />

        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={UserIcon}>
             <Popup>You are here</Popup>
          </Marker>
        )}

        {/* Lazy load markers - only render visible ones */}
        <LazyMarkers carparks={carparks} onSelectCarpark={onSelectCarpark} selectedCarpark={selectedCarpark} />
      </MapContainer>

      {mapInstance && (
        <button
          onClick={handleLocateUser}
          className="absolute bottom-16 right-4 md:bottom-6 md:right-6 z-[1200] bg-white shadow-lg rounded-full p-3 border border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white transition-all active:scale-95 pointer-events-auto"
          title="Center map on my location"
          aria-label="Center map on my location"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
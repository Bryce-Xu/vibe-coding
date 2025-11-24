import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Carpark, Coordinate } from '../types';

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
const getIcon = (free: number, total: number) => {
  const percentage = total > 0 ? (free / total) : 0;
  let color = '#22c55e'; // green-500
  if (percentage < 0.1) color = '#ef4444'; // red-500
  else if (percentage < 0.3) color = '#f97316'; // orange-500

  // Create a custom SVG icon
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 drop-shadow-lg">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3" fill="white"></circle>
  </svg>`;

  return new L.DivIcon({
    className: 'custom-icon',
    html: svg,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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

export const ParkingMap: React.FC<ParkingMapProps> = ({ userLocation, carparks, onSelectCarpark, selectedCarpark }) => {
  const center = useMemo<[number, number]>(() => {
    return userLocation ? [userLocation.latitude, userLocation.longitude] : [-33.8688, 151.2093]; // Default to Sydney
  }, [userLocation]);

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterMap location={userLocation} />

        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={UserIcon}>
             <Popup>You are here</Popup>
          </Marker>
        )}

        {carparks.map((carpark) => {
            const lat = parseFloat(carpark.latitude);
            const lng = parseFloat(carpark.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            return (
                <Marker 
                    key={carpark.facility_id} 
                    position={[lat, lng]}
                    icon={getIcon(carpark.spots_free || 0, carpark.occupancy.total)}
                    eventHandlers={{
                        click: () => onSelectCarpark(carpark)
                    }}
                />
            );
        })}
      </MapContainer>
    </div>
  );
};
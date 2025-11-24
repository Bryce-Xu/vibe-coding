import React from 'react';
import { Carpark } from '../types';
import { X, Navigation, Car, Clock } from 'lucide-react';

interface DetailCardProps {
  carpark: Carpark | null;
  onClose: () => void;
  userLocation: { latitude: number; longitude: number } | null;
}

export const DetailCard: React.FC<DetailCardProps> = ({ carpark, onClose, userLocation }) => {
  if (!carpark) return null;

  const total = carpark.occupancy.total;
  const free = carpark.spots_free || 0;
  const percentage = Math.round((free / total) * 100);
  
  let statusColor = "text-green-600 bg-green-50 border-green-200";
  let statusText = "Good Availability";
  if (percentage < 10) {
      statusColor = "text-red-600 bg-red-50 border-red-200";
      statusText = "Full / Busy";
  } else if (percentage < 30) {
      statusColor = "text-orange-600 bg-orange-50 border-orange-200";
      statusText = "Filling Up";
  }

  const handleDirections = () => {
    if (carpark) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${carpark.latitude},${carpark.longitude}`, '_blank');
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 animate-slide-up sm:max-w-md sm:m-4 sm:rounded-xl">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="relative p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 pr-8 leading-tight">{carpark.facility_name}</h2>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Main Status */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${statusColor}`}>
             <div>
                <span className="block text-xs font-semibold uppercase tracking-wider opacity-80">Status</span>
                <span className="text-lg font-bold">{statusText}</span>
             </div>
             <div className="text-right">
                <span className="block text-3xl font-black">{free}</span>
                <span className="text-xs font-medium opacity-80">spots free</span>
             </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-1 text-slate-500">
                    <Car className="w-4 h-4" />
                    <span className="text-xs font-medium">Capacity</span>
                </div>
                <div className="text-lg font-semibold text-slate-800">{total} <span className="text-xs font-normal text-slate-500">total</span></div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <div className="flex items-center gap-2 mb-1 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Last Update</span>
                </div>
                <div className="text-lg font-semibold text-slate-800">{carpark.occupancy.time || 'N/A'}</div>
            </div>
          </div>

          {/* Action */}
          <button 
            onClick={handleDirections}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-blue-200 shadow-lg"
          >
            <Navigation className="w-5 h-5" />
            Navigate Here
          </button>
        </div>
      </div>
    </div>
  );
};
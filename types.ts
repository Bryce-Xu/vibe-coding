export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Occupancy {
  loop: string;
  total: number;
  occupied: number;
  month: string;
  time: string;
}

export interface Carpark {
  facility_id: string;
  facility_name: string;
  latitude: string;
  longitude: string;
  occupancy: Occupancy;
  tsn: string;
  park_id: string;
  zones: any[];
  spots_free?: number; // Computed property
}

export interface AppState {
  userLocation: Coordinate | null;
  carparks: Carpark[];
  loading: boolean;
  error: string | null;
  selectedCarpark: Carpark | null;
  demoMode: boolean;
}
// Note: We no longer use REST API endpoints
// All data is fetched via GraphQL API through the proxy endpoint: /api/graphql

/**
 * Metro stations with real-time occupancy data
 * According to official documentation: https://opendata.transport.nsw.gov.au/dataset/car-park-api
 * Only these 5 Sydney Metro stations report real-time occupancy levels
 */
export const METRO_STATIONS_WITH_REALTIME_DATA = [
  'Tallawong',
  'Bella Vista', 
  'Hills Showground',
  'Cherrybrook',
  'Kellyville'
];

/**
 * Facility IDs for Metro stations (based on API response)
 * These are the active Park&Ride facilities, not historical ones
 */
export const METRO_STATION_FACILITY_IDS = [
  '26', // Tallawong P1
  '27', // Tallawong P2
  '28', // Tallawong P3
  '31', // Bella Vista
  '32', // Hills Showground
  '33', // Cherrybrook
  '29', // Kellyville (north)
  '30', // Kellyville (south)
];

/**
 * Check if a carpark has real-time occupancy data available
 */
export const hasRealtimeOccupancyData = (carpark: { facility_id: string; facility_name: string }): boolean => {
  // Check by facility ID
  if (METRO_STATION_FACILITY_IDS.includes(carpark.facility_id)) {
    return true;
  }
  
  // Check by name (fallback)
  const nameLower = carpark.facility_name.toLowerCase();
  return METRO_STATIONS_WITH_REALTIME_DATA.some(station => 
    nameLower.includes(station.toLowerCase())
  );
};

// Mock data to use if API fails (likely due to CORS in browser environment)
export const MOCK_CARPARKS = [
  {
    facility_id: "1",
    facility_name: "Tallawong Station Car Park",
    latitude: "-33.6896",
    longitude: "150.9068",
    tsn: "TWG",
    park_id: "P1",
    zones: [],
    occupancy: {
      loop: "1",
      total: 1000,
      occupied: 850,
      month: "Oct",
      time: "12:00"
    }
  },
  {
    facility_id: "2",
    facility_name: "Kellyville Station Car Park",
    latitude: "-33.7135",
    longitude: "150.9490",
    tsn: "KVE",
    park_id: "P2",
    zones: [],
    occupancy: {
      loop: "1",
      total: 1360,
      occupied: 200,
      month: "Oct",
      time: "12:05"
    }
  },
  {
    facility_id: "3",
    facility_name: "Bella Vista Station",
    latitude: "-33.7299",
    longitude: "150.9577",
    tsn: "BVA",
    park_id: "P3",
    zones: [],
    occupancy: {
      loop: "1",
      total: 800,
      occupied: 795,
      month: "Oct",
      time: "12:10"
    }
  },
  {
    facility_id: "4",
    facility_name: "Hills Showground Station",
    latitude: "-33.7275",
    longitude: "150.9856",
    tsn: "HSG",
    park_id: "P4",
    zones: [],
    occupancy: {
      loop: "1",
      total: 600,
      occupied: 300,
      month: "Oct",
      time: "12:15"
    }
  },
   {
    facility_id: "5",
    facility_name: "Gordon Station Car Park",
    latitude: "-33.7562",
    longitude: "151.1540",
    tsn: "GDN",
    park_id: "P5",
    zones: [],
    occupancy: {
      loop: "1",
      total: 200,
      occupied: 180,
      month: "Oct",
      time: "12:15"
    }
  }
];
import { Carpark, Occupancy } from '../types';
import { TFNSW_API_KEY, TFNSW_BASE_URL } from '../constants';

// Helper to calculate free spots safely
const enrichCarparkData = (carpark: any): Carpark => {
  const total = parseInt(String(carpark.occupancy?.total || 0), 10);
  const occupied = parseInt(String(carpark.occupancy?.occupied || 0), 10);
  return {
    ...carpark,
    occupancy: {
        ...carpark.occupancy,
        total,
        occupied
    } as Occupancy,
    spots_free: Math.max(0, total - occupied)
  };
};

export const fetchCarparkData = async (): Promise<{ data: Carpark[], isDemo: boolean }> => {
  // Ensure API key is available
  if (!TFNSW_API_KEY) {
    throw new Error("TFNSW API Key is not configured. Please set VITE_TFNSW_API_KEY environment variable.");
  }

  const response = await fetch(TFNSW_BASE_URL, {
    method: 'GET',
    headers: {
      'Authorization': `apikey ${TFNSW_API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to fetch parking data: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  
  // The API returns an object with facility_id as keys and facility_name as values
  // Format: { "486": "Park&Ride - Ashfield", "487": "Park&Ride - Kogarah", ... }
  // We need to transform this into our Carpark format
  
  let parsedData: Carpark[] = [];
  
  if (Array.isArray(data)) {
      // If it's an array, map directly
      parsedData = data.map(enrichCarparkData);
  } else if (typeof data === 'object' && data !== null) {
      // Handle object format: { facility_id: facility_name }
      parsedData = Object.entries(data).map(([facility_id, facility_name]) => {
        // Create a basic carpark object - we'll need to fetch occupancy separately
        // For now, create a structure that matches our type
        const carpark: any = {
          facility_id: facility_id,
          facility_name: typeof facility_name === 'string' ? facility_name : String(facility_name),
          latitude: "0", // Will need to be fetched from another endpoint or geocoded
          longitude: "0",
          tsn: "", // Will need to be fetched from another endpoint
          park_id: facility_id,
          zones: [],
          occupancy: {
            loop: "1",
            total: 0, // Will need to fetch from occupancy endpoint
            occupied: 0,
            month: "",
            time: ""
          }
        };
        return enrichCarparkData(carpark);
      });
  }

  if (parsedData.length === 0) {
    console.warn("API returned empty data. Check API response structure.");
  } else {
    console.log(`✅ Successfully loaded ${parsedData.length} carparks from Transport NSW API`);
  }

  return { data: parsedData, isDemo: false };
};
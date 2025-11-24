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
      'Authorization': `Bearer ${TFNSW_API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to fetch parking data: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  
  // The API structure can vary, sometimes it's an object with keys, sometimes an array.
  // We assume a standard array or a mapped object.
  // Based on typical TfNSW output, it might be a dictionary facility_id -> data or a flat array.
  
  let parsedData: Carpark[] = [];
  
  if (Array.isArray(data)) {
      parsedData = data.map(enrichCarparkData);
  } else if (typeof data === 'object' && data !== null) {
      // Handle potential keyed response
      parsedData = Object.values(data).map(enrichCarparkData);
  }

  if (parsedData.length === 0) {
    console.warn("API returned empty data. Check API response structure.");
  }

  return { data: parsedData, isDemo: false };
};
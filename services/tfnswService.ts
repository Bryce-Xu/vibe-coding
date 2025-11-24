import { Carpark, Occupancy } from '../types';
import { TFNSW_API_KEY, TFNSW_BASE_URL, MOCK_CARPARKS } from '../constants';

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
  try {
    const response = await fetch(TFNSW_BASE_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TFNSW_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`API Error: ${response.status} - Falling back to mock data.`);
      throw new Error("Failed to fetch from real API");
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

    return { data: parsedData, isDemo: false };

  } catch (error) {
    console.error("Fetching real data failed (likely CORS or Key issue), using Mock Data for demonstration.", error);
    // Fallback to mock data so the app is usable in the preview environment
    const mockData = MOCK_CARPARKS.map(enrichCarparkData);
    return { data: mockData, isDemo: true };
  }
};
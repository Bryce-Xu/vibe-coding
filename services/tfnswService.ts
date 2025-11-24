import { Carpark, Occupancy } from '../types';
import { TFNSW_API_KEY, TFNSW_BASE_URL, TFNSW_OCCUPANCY_URL } from '../constants';

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

/**
 * Fetch occupancy data for carparks
 * This endpoint may have rate limits, so we handle errors gracefully
 */
const fetchOccupancyData = async (): Promise<Record<string, any>> => {
  try {
    const response = await fetch(TFNSW_OCCUPANCY_URL, {
      method: 'GET',
      headers: {
        'Authorization': `apikey ${TFNSW_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      // If it's a quota/rate limit error, we'll continue without occupancy data
      if (response.status === 429 || errorText.includes('quota') || errorText.includes('rate limit')) {
        console.warn('⚠️ Occupancy API quota exceeded. Continuing without real-time occupancy data.');
        return {};
      }
      throw new Error(`Failed to fetch occupancy data: ${response.status}`);
    }

    const data = await response.json();
    return data || {};
  } catch (error) {
    console.warn('⚠️ Failed to fetch occupancy data:', error);
    return {};
  }
};

/**
 * Merge occupancy data into carpark list
 */
const mergeOccupancyData = (carparks: Carpark[], occupancyData: Record<string, any>): Carpark[] => {
  if (!occupancyData || Object.keys(occupancyData).length === 0) {
    return carparks;
  }

  return carparks.map(carpark => {
    // Try to find occupancy data by facility_id
    const occupancy = occupancyData[carpark.facility_id];
    
    if (occupancy && typeof occupancy === 'object') {
      // If occupancy is an object with the expected structure
      return {
        ...carpark,
        occupancy: {
          loop: String(occupancy.loop || occupancy.Loop || '1'),
          total: parseInt(String(occupancy.total || occupancy.Total || 0), 10),
          occupied: parseInt(String(occupancy.occupied || occupancy.Occupied || 0), 10),
          month: String(occupancy.month || occupancy.Month || ''),
          time: String(occupancy.time || occupancy.Time || '')
        },
        spots_free: Math.max(0, parseInt(String(occupancy.total || occupancy.Total || 0), 10) - parseInt(String(occupancy.occupied || occupancy.Occupied || 0), 10))
      };
    } else if (occupancyData[`${carpark.facility_id}`]) {
      // Try alternative key format
      const altOccupancy = occupancyData[`${carpark.facility_id}`];
      if (altOccupancy && typeof altOccupancy === 'object') {
        return {
          ...carpark,
          occupancy: {
            loop: String(altOccupancy.loop || altOccupancy.Loop || '1'),
            total: parseInt(String(altOccupancy.total || altOccupancy.Total || 0), 10),
            occupied: parseInt(String(altOccupancy.occupied || altOccupancy.Occupied || 0), 10),
            month: String(altOccupancy.month || altOccupancy.Month || ''),
            time: String(altOccupancy.time || altOccupancy.Time || '')
          },
          spots_free: Math.max(0, parseInt(String(altOccupancy.total || altOccupancy.Total || 0), 10) - parseInt(String(altOccupancy.occupied || altOccupancy.Occupied || 0), 10))
        };
      }
    }
    
    return carpark;
  });
};

export const fetchCarparkData = async (): Promise<{ data: Carpark[], isDemo: boolean }> => {
  // Ensure API key is available
  if (!TFNSW_API_KEY) {
    throw new Error("TFNSW API Key is not configured. Please set VITE_TFNSW_API_KEY environment variable.");
  }

  // Fetch carpark list
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
  
  let parsedData: Carpark[] = [];
  
  if (Array.isArray(data)) {
      // If it's an array, map directly
      parsedData = data.map(enrichCarparkData);
  } else if (typeof data === 'object' && data !== null) {
      // Handle object format: { facility_id: facility_name }
      parsedData = Object.entries(data).map(([facility_id, facility_name]) => {
        // Create a basic carpark object
        const carpark: any = {
          facility_id: facility_id,
          facility_name: typeof facility_name === 'string' ? facility_name : String(facility_name),
          latitude: "0", // Coordinates may need to be geocoded or fetched from another source
          longitude: "0",
          tsn: "", // Station code may need to be extracted from name or fetched separately
          park_id: facility_id,
          zones: [],
          occupancy: {
            loop: "1",
            total: 0, // Will be populated from occupancy endpoint if available
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
    return { data: [], isDemo: false };
  }

  console.log(`✅ Successfully loaded ${parsedData.length} carparks from Transport NSW API`);

  // Try to fetch occupancy data (this may fail due to rate limits)
  console.log('📊 Attempting to fetch real-time occupancy data...');
  const occupancyData = await fetchOccupancyData();
  
  if (Object.keys(occupancyData).length > 0) {
    console.log(`✅ Successfully loaded occupancy data for ${Object.keys(occupancyData).length} carparks`);
    const enrichedData = mergeOccupancyData(parsedData, occupancyData);
    return { data: enrichedData, isDemo: false };
  } else {
    console.log('ℹ️ Occupancy data not available (may be due to rate limits). Carpark list will be shown without real-time availability.');
    return { data: parsedData, isDemo: false };
  }
};
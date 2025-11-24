import { Carpark, Occupancy } from '../types';
import { TFNSW_API_KEY, TFNSW_BASE_URL, TFNSW_OCCUPANCY_URL } from '../constants';
import { scrapeCarparkOccupancy, matchScrapedData } from './webScrapingService';

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
 * Fetch occupancy data for carparks with retry and rate limit handling
 * This endpoint may have rate limits, so we implement smart retry logic
 */
const fetchOccupancyData = async (retryCount = 0): Promise<Record<string, any>> => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000; // 2 seconds

  try {
    // Use proxy in development to avoid CORS issues
    const isDevelopment = import.meta.env.DEV;
    const occupancyUrl = isDevelopment 
      ? `/api/tfnsw/v1/carpark/occupancy`  // Use Vite proxy in development
      : TFNSW_OCCUPANCY_URL;                // Direct API call in production

    const response = await fetch(occupancyUrl, {
      method: 'GET',
      headers: isDevelopment 
        ? {
            // In development, proxy handles auth
            'Accept': 'application/json'
          }
        : {
            // In production, send auth header directly
            'Authorization': `apikey ${TFNSW_API_KEY}`,
            'Accept': 'application/json'
          }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Check if it's a quota/rate limit error
      const isQuotaError = response.status === 429 || 
                          errorText.includes('quota') || 
                          errorText.includes('rate limit') ||
                          errorText.includes('exceeded');

      if (isQuotaError) {
        // If we haven't exceeded max retries, wait and retry
        if (retryCount < MAX_RETRIES) {
          console.log(`⏳ Occupancy API quota exceeded. Retrying in ${RETRY_DELAY/1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchOccupancyData(retryCount + 1);
        } else {
          console.warn('⚠️ Occupancy API quota exceeded after retries. Continuing without real-time occupancy data.');
          console.info('💡 Tip: You can request higher quota limits by emailing OpenDataHelp@transport.nsw.gov.au');
          return {};
        }
      }
      
      // For other errors, throw immediately
      throw new Error(`Failed to fetch occupancy data: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Validate that we got actual occupancy data
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      console.warn('⚠️ Occupancy API returned empty data');
      return {};
    }

    return data || {};
  } catch (error) {
    // Only retry on network errors, not on quota errors (handled above)
    if (retryCount < MAX_RETRIES && error instanceof TypeError) {
      console.log(`⏳ Network error. Retrying in ${RETRY_DELAY/1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchOccupancyData(retryCount + 1);
    }
    
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

/**
 * Fetch only occupancy data (for manual refresh)
 * PRIORITY: Web scraping first, then API as fallback
 */
export const fetchOccupancyDataOnly = async (): Promise<Record<string, any>> => {
  // Try web scraping first
  try {
    const scrapedData = await scrapeCarparkOccupancy();
    if (scrapedData && Object.keys(scrapedData).length > 0) {
      // Convert scraped data format to match API format
      const convertedData: Record<string, any> = {};
      Object.entries(scrapedData).forEach(([name, data]) => {
        convertedData[name] = {
          total: data.spaces * 2, // Estimate total
          occupied: data.spaces, // This is approximate
          available: data.spaces
        };
      });
      return convertedData;
    }
  } catch (error) {
    console.warn('⚠️ Web scraping failed, trying API...', error);
  }
  
  // Fallback to API
  try {
    const apiData = await fetchOccupancyData();
    if (apiData && Object.keys(apiData).length > 0) {
      return apiData;
    }
  } catch (error) {
    console.error('⚠️ API also failed:', error);
  }
  
  return {};
};

export const fetchCarparkData = async (): Promise<{ data: Carpark[], isDemo: boolean }> => {
  // Ensure API key is available
  if (!TFNSW_API_KEY) {
    throw new Error("TFNSW API Key is not configured. Please set VITE_TFNSW_API_KEY environment variable.");
  }

  // Use proxy in development to avoid CORS issues, direct URL in production
  const isDevelopment = import.meta.env.DEV;
  const apiUrl = isDevelopment 
    ? `/api/tfnsw/v1/carpark`  // Use Vite proxy in development
    : TFNSW_BASE_URL;            // Direct API call in production

  // Fetch carpark list
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: isDevelopment 
      ? {
          // In development, proxy handles auth
          'Accept': 'application/json'
        }
      : {
          // In production, send auth header directly
          'Authorization': `apikey ${TFNSW_API_KEY}`,
          'Accept': 'application/json'
        }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
    
    // Provide more helpful error messages
    let errorMessage = `Failed to fetch parking data: ${response.status} ${response.statusText}`;
    if (errorText) {
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.ErrorDetails?.Message) {
          errorMessage = errorJson.ErrorDetails.Message;
        }
      } catch {
        // If not JSON, use the text as-is
        if (errorText.length < 200) {
          errorMessage += `. ${errorText}`;
        }
      }
    }
    
    throw new Error(errorMessage);
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

  // PRIORITY: Try web scraping first (more reliable and no quota limits)
  console.log('📊 Attempting to fetch real-time occupancy data from website...');
  
  try {
    const scrapedData = await scrapeCarparkOccupancy();
    if (scrapedData && Object.keys(scrapedData).length > 0) {
      const enrichedData = matchScrapedData(parsedData, scrapedData);
      const enrichedCount = enrichedData.filter(c => c.occupancy.total > 0).length;
      console.log(`✅ Successfully loaded occupancy data from website for ${enrichedCount} carparks`);
      return { data: enrichedData, isDemo: false };
    }
  } catch (scrapeError) {
    console.warn('⚠️ Web scraping failed, trying API as fallback:', scrapeError);
  }
  
  // Fallback: Try API if web scraping fails
  console.log('🔄 Web scraping unavailable, trying API...');
  try {
    const occupancyData = await fetchOccupancyData();
    
    if (occupancyData && Object.keys(occupancyData).length > 0) {
      const enrichedData = mergeOccupancyData(parsedData, occupancyData);
      const enrichedCount = enrichedData.filter(c => c.occupancy.total > 0).length;
      console.log(`✅ Successfully loaded occupancy data from API for ${enrichedCount} carparks`);
      return { data: enrichedData, isDemo: false };
    } else {
      console.log('ℹ️ API returned no occupancy data (may be due to rate limits).');
    }
  } catch (error) {
    console.warn('⚠️ API also failed:', error);
  }
  
  console.log('ℹ️ Carpark list will be shown without real-time availability.');
  return { data: parsedData, isDemo: false };
};
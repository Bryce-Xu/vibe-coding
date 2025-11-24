import { Carpark, Occupancy } from '../types';
import { TFNSW_API_KEY, TFNSW_BASE_URL, TFNSW_OCCUPANCY_URL } from '../constants';
import { scrapeCarparkOccupancy, matchScrapedData } from './webScrapingService';
import { getCarparkCoordinates } from '../carpark-coordinates';

// GraphQL API endpoint
const GRAPHQL_API_URL = 'https://transportnsw.info/api/graphql';

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

const ensureCoordinates = (carparks: Carpark[]): Carpark[] => {
  return carparks.map(carpark => {
    const lat = parseFloat(carpark.latitude);
    const lng = parseFloat(carpark.longitude);
    const hasValidCoords = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);

    if (hasValidCoords) return carpark;

    const coords = getCarparkCoordinates(carpark.facility_name);
    if (coords) {
      return {
        ...carpark,
        latitude: coords.latitude,
        longitude: coords.longitude,
        tsn: carpark.tsn || coords.tsn || ''
      };
    }

    return carpark;
  });
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
 * PRIORITY: GraphQL API first, then web scraping, then REST API as fallback
 */
export const fetchOccupancyDataOnly = async (): Promise<Record<string, any>> => {
  // Try GraphQL API first (new primary method)
  try {
    const graphqlCarparks = await fetchCarparkDataFromGraphQL();
    if (graphqlCarparks && graphqlCarparks.length > 0) {
      // Convert to the expected format: { facility_id: { total, occupied, ... } }
      const convertedData: Record<string, any> = {};
      graphqlCarparks.forEach(carpark => {
        convertedData[carpark.facility_id] = {
          total: carpark.occupancy.total,
          occupied: carpark.occupancy.occupied,
          loop: carpark.occupancy.loop,
          month: carpark.occupancy.month,
          time: carpark.occupancy.time
        };
      });
      return convertedData;
    }
  } catch (error) {
    console.warn('⚠️ GraphQL API failed, trying web scraping...', error);
  }
  
  // Try web scraping as fallback
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
    console.warn('⚠️ Web scraping failed, trying REST API...', error);
  }
  
  // Fallback to REST API
  try {
    const apiData = await fetchOccupancyData();
    if (apiData && Object.keys(apiData).length > 0) {
      return apiData;
    }
  } catch (error) {
    console.error('⚠️ REST API also failed:', error);
  }
  
  return {};
};

/**
 * Fetch carpark data from GraphQL API
 * This is the new primary method for getting real-time parking data
 */
const fetchCarparkDataFromGraphQL = async (): Promise<Carpark[]> => {
  try {
    const query = {
      query: "query{result:widgets{pnrLocations{name spots occupancy}}}"
    };

    // Use proxy in both development and production to avoid CORS issues
    // In development: Vite proxy handles it
    // In production: Express server proxy handles it
    const graphqlUrl = '/api/graphql';

    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'NSW-Park-Ride-Checker/1.0'
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`GraphQL API error: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const result = await response.json();
    
    // Handle GraphQL response structure: { data: { result: { widgets: { pnrLocations: [...] } } } }
    const pnrLocations = result?.data?.result?.widgets?.pnrLocations || [];
    
    if (!Array.isArray(pnrLocations) || pnrLocations.length === 0) {
      console.warn('⚠️ GraphQL API returned empty or invalid data structure');
      return [];
    }

    // Get current timestamp for last update
    const now = new Date();
    const updateTime = now.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const updateMonth = now.toLocaleDateString('en-AU', { 
      month: 'short' 
    });

    // Convert GraphQL response to Carpark format
    const missingCoords = new Set<string>();

    const carparks: Carpark[] = pnrLocations.map((location: any, index: number) => {
      let name = location.name || '';
      
      // Clean name: remove "(historical only)" and other markers
      name = name
        .replace(/\s*\(historical only\)\s*/gi, '')
        .replace(/\s*\(historical\)\s*/gi, '')
        .trim();
      
      const spots = parseInt(String(location.spots || 0), 10); // Available spots
      const occupancy = parseInt(String(location.occupancy || 0), 10); // Occupied spots
      const total = spots + occupancy; // Total spots

      // Generate a facility_id if not provided (use index or hash of name)
      const facility_id = location.facility_id || `graphql_${index}_${name.replace(/\s+/g, '_').toLowerCase()}`;

      // Get coordinates from mapping
      const coords = getCarparkCoordinates(name);
      if (!coords) {
        missingCoords.add(name);
      }

      return enrichCarparkData({
        facility_id,
        facility_name: name,
        latitude: coords?.latitude || "0",
        longitude: coords?.longitude || "0",
        tsn: coords?.tsn || "",
        park_id: facility_id,
        zones: [],
        occupancy: {
          loop: "1",
          total,
          occupied: occupancy,
          month: updateMonth,
          time: updateTime
        }
      });
    });

    if (missingCoords.size > 0) {
      console.warn(`⚠️ Missing coordinates for ${missingCoords.size} carparks:`, Array.from(missingCoords).join(', '));
    }

    const enriched = ensureCoordinates(carparks);

    console.log(`✅ Successfully loaded ${enriched.length} carparks from GraphQL API`);
    return enriched;
  } catch (error) {
    console.error('⚠️ Failed to fetch data from GraphQL API:', error);
    throw error;
  }
};

export const fetchCarparkData = async (): Promise<{ data: Carpark[], isDemo: boolean }> => {
  // Try GraphQL API first (new primary method)
  console.log('📊 Fetching real-time parking data from GraphQL API...');
  
  try {
    const graphqlData = await fetchCarparkDataFromGraphQL();
    if (graphqlData && graphqlData.length > 0) {
      const enrichedCount = graphqlData.filter(c => c.occupancy.total > 0).length;
      console.log(`✅ Successfully loaded ${enrichedCount} carparks with occupancy data from GraphQL API`);
      return { data: graphqlData, isDemo: false };
    }
  } catch (graphqlError) {
    console.warn('⚠️ GraphQL API failed, falling back to REST API:', graphqlError);
  }

  // Fallback to REST API if GraphQL fails
  console.log('🔄 Falling back to REST API...');
  
  // Ensure API key is available for REST API fallback
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

  parsedData = ensureCoordinates(parsedData);

  if (parsedData.length === 0) {
    console.warn("API returned empty data. Check API response structure.");
    return { data: [], isDemo: false };
  }

  console.log(`✅ Successfully loaded ${parsedData.length} carparks from Transport NSW REST API`);

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
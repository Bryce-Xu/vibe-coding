import { Carpark, Occupancy } from '../types';
import { scrapeCarparkOccupancy, matchScrapedData } from './webScrapingService';
import { getCarparkCoordinates } from '../carpark-coordinates';

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
 * Fetch only occupancy data (for manual refresh)
 * Uses GraphQL API only, with web scraping as fallback
 */
export const fetchOccupancyDataOnly = async (): Promise<Record<string, any>> => {
  // Try GraphQL API first (primary method)
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
    console.warn('⚠️ Web scraping also failed:', error);
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
  // Use GraphQL API only (via proxy endpoint)
  console.log('📊 Fetching real-time parking data from GraphQL API...');
  
  try {
    const graphqlData = await fetchCarparkDataFromGraphQL();
    if (graphqlData && graphqlData.length > 0) {
      const enrichedCount = graphqlData.filter(c => c.occupancy.total > 0).length;
      console.log(`✅ Successfully loaded ${enrichedCount} carparks with occupancy data from GraphQL API`);
      return { data: graphqlData, isDemo: false };
    }
  } catch (graphqlError) {
    console.warn('⚠️ GraphQL API failed, trying web scraping as fallback:', graphqlError);
    
    // Fallback to web scraping if GraphQL fails
    try {
      const scrapedData = await scrapeCarparkOccupancy();
      if (scrapedData && Object.keys(scrapedData).length > 0) {
        // Create basic carpark list from scraped data
        const carparks: Carpark[] = Object.entries(scrapedData).map(([name, data]) => {
          const coords = getCarparkCoordinates(name);
          return enrichCarparkData({
            facility_id: `scraped_${name.replace(/\s+/g, '_').toLowerCase()}`,
            facility_name: name,
            latitude: coords?.latitude || "0",
            longitude: coords?.longitude || "0",
            tsn: coords?.tsn || "",
            park_id: `scraped_${name.replace(/\s+/g, '_').toLowerCase()}`,
            zones: [],
            occupancy: {
              loop: "1",
              total: data.spaces * 2, // Estimate total
              occupied: data.spaces, // Approximate
              month: new Date().toLocaleDateString('en-AU', { month: 'short' }),
              time: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
            }
          });
        });
        
        const enrichedData = ensureCoordinates(carparks);
        const enrichedCount = enrichedData.filter(c => c.occupancy.total > 0).length;
        console.log(`✅ Successfully loaded ${enrichedCount} carparks from web scraping`);
        return { data: enrichedData, isDemo: false };
      }
    } catch (scrapeError) {
      console.error('⚠️ Web scraping also failed:', scrapeError);
    }
  }
  
  console.warn('⚠️ Unable to fetch parking data from any source');
  return { data: [], isDemo: false };
};
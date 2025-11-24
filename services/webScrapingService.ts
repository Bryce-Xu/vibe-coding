/**
 * Web Scraping Service for Transport NSW Park&Ride website
 * 
 * This service scrapes real-time occupancy data from:
 * https://transportnsw.info/travel-info/ways-to-get-around/drive/parking/transport-parkride-car-parks
 * 
 * Note: This is a fallback option when the official API has quota limits.
 * The website displays real-time occupancy data for all carparks.
 * 
 * IMPORTANT: Due to CORS restrictions, this should be called through a backend proxy
 * or CORS proxy service in production.
 */

interface ScrapedCarpark {
  name: string;
  spaces: number; // Available spaces
  facility_id?: string; // Will be matched with existing data
}

/**
 * Scrape carpark occupancy data from Transport NSW website
 * 
 * Uses the backend scraper API service (running on port 3001) which uses Puppeteer
 * to load the page and extract data after JavaScript execution.
 * 
 * @returns Promise<Record<string, ScrapedCarpark>> Map of carpark names to occupancy data
 */
export async function scrapeCarparkOccupancy(): Promise<Record<string, ScrapedCarpark>> {
  try {
    // Use the backend scraper API (proxied through Vite)
    const url = '/api/scrape/carpark-occupancy';
    
    console.log('🕷️ Fetching carpark data from scraper API...');
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to fetch scraped data: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    
    // Convert the API response to our format
    const carparkData: Record<string, ScrapedCarpark> = {};
    
    Object.entries(data).forEach(([name, item]: [string, any]) => {
      if (item && typeof item === 'object' && 'name' in item && 'spaces' in item) {
        carparkData[name] = {
          name: item.name,
          spaces: item.spaces
        };
      }
    });

    if (Object.keys(carparkData).length === 0) {
      throw new Error('No carpark data found in scraper response');
    }

    console.log(`✅ Successfully scraped ${Object.keys(carparkData).length} carparks from website`);
    return carparkData;
    
  } catch (error) {
    console.error('⚠️ Failed to scrape carpark data:', error);
    throw error;
  }
}

/**
 * Extract carpark data from DOM (works in browser environment)
 * This function extracts data from buttons/elements that contain carpark information
 */
function scrapeFromDOM(): Record<string, ScrapedCarpark> {
  const carparkData: Record<string, ScrapedCarpark> = {};
  
  // Try to find buttons or elements containing carpark data
  // The website shows data in buttons with format: "Park&Ride - {Name} {spaces} spaces"
  const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
  
  buttons.forEach(btn => {
    const text = btn.textContent || btn.innerText || '';
    if (text.includes('Park&Ride') && text.includes('spaces')) {
      // Pattern: Park&Ride - {Name} {number} spaces
      const match = text.match(/Park&Ride\s*-\s*([^0-9]+?)\s+(\d+)\s+spaces/i);
      if (match) {
        const name = match[1].trim();
        const spaces = parseInt(match[2], 10);
        const normalizedName = name.replace(/\s+/g, ' ').trim();
        
        if (!carparkData[normalizedName] || carparkData[normalizedName].spaces === 0) {
          carparkData[normalizedName] = {
            name: normalizedName,
            spaces
          };
        }
      }
    }
  });
  
  console.log(`✅ Extracted ${Object.keys(carparkData).length} carparks from DOM`);
  return carparkData;
}

/**
 * Match scraped data with existing carpark list by name
 * 
 * @param carparks Existing carpark list
 * @param scrapedData Scraped occupancy data
 * @returns Updated carparks with occupancy data
 */
export function matchScrapedData(
  carparks: any[],
  scrapedData: Record<string, ScrapedCarpark>
): any[] {
  return carparks.map(carpark => {
    // Try to match by facility name
    const facilityName = carpark.facility_name || '';
    
    // Remove "Park&Ride - " prefix for matching
    const nameWithoutPrefix = facilityName.replace(/^Park&Ride\s*-\s*/i, '').trim();
    
    // Try exact match first
    let matched = scrapedData[nameWithoutPrefix];
    
    // If no exact match, try fuzzy matching
    if (!matched) {
      const keys = Object.keys(scrapedData);
      const fuzzyMatch = keys.find(key => {
        // Check if names are similar (case-insensitive, ignore extra spaces)
        const normalizedKey = key.toLowerCase().replace(/\s+/g, ' ').trim();
        const normalizedName = nameWithoutPrefix.toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Exact match after normalization
        if (normalizedKey === normalizedName) return true;
        
        // Check if one contains the other (for partial matches)
        if (normalizedKey.includes(normalizedName) || normalizedName.includes(normalizedKey)) {
          // Additional check: ensure it's not too different
          const keyWords = normalizedKey.split(' ');
          const nameWords = normalizedName.split(' ');
          const commonWords = keyWords.filter(w => nameWords.includes(w));
          // At least 50% of words should match
          return commonWords.length >= Math.min(keyWords.length, nameWords.length) * 0.5;
        }
        
        return false;
      });
      
      if (fuzzyMatch) {
        matched = scrapedData[fuzzyMatch];
      }
    }
    
    if (matched) {
      // The website shows available spaces, but we need total and occupied
      // We'll use the available spaces as spots_free
      // For total, we'll try to preserve existing total if available, or estimate
      const existingTotal = carpark.occupancy?.total || 0;
      const estimatedTotal = existingTotal > 0 ? existingTotal : matched.spaces * 2; // Rough estimate
      
      return {
        ...carpark,
        occupancy: {
          ...carpark.occupancy,
          total: estimatedTotal,
          occupied: Math.max(0, estimatedTotal - matched.spaces),
        },
        spots_free: matched.spaces
      };
    }
    
    return carpark;
  });
}


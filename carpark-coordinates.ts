/**
 * Carpark coordinates mapping
 * Since GraphQL API doesn't provide coordinates, we maintain a mapping here
 * Coordinates are approximate and based on station locations
 */

export interface CarparkCoordinates {
  latitude: string;
  longitude: string;
  tsn?: string; // Station code if available
}

// Mapping of carpark names to coordinates
// Names should match GraphQL API response (case-insensitive matching)
export const CARPARK_COORDINATES: Record<string, CarparkCoordinates> = {
  // Metro Stations (Sydney Metro Northwest)
  'park&ride - tallawong': { latitude: '-33.6896', longitude: '150.9068', tsn: 'TWG' },
  'park&ride - kellyville': { latitude: '-33.7135', longitude: '150.9490', tsn: 'KVE' },
  'park&ride - bella vista': { latitude: '-33.7299', longitude: '150.9577', tsn: 'BVA' },
  'park&ride - hills showground': { latitude: '-33.7275', longitude: '150.9856', tsn: 'HSG' },
  'park&ride - cherrybrook': { latitude: '-33.7375', longitude: '151.0033', tsn: 'CBK' },
  
  // Train Stations
  'park&ride - ashfield': { latitude: '-33.8889', longitude: '151.1256', tsn: 'AFD' },
  'park&ride - beverly hills': { latitude: '-33.9481', longitude: '151.0806', tsn: 'BVH' },
  'park&ride - brookvale': { latitude: '-33.7608', longitude: '151.2650', tsn: 'BKV' },
  'park&ride - campbelltown farrow rd (north)': { latitude: '-34.0667', longitude: '150.8167', tsn: 'CTN' },
  'park&ride - campbelltown hurley st': { latitude: '-34.0667', longitude: '150.8167', tsn: 'CTN' },
  'park&ride - dee why': { latitude: '-33.7500', longitude: '151.3000', tsn: 'DYH' },
  'park&ride - edmondson park (south)': { latitude: '-33.9600', longitude: '150.8600', tsn: 'EDP' },
  'park&ride - gordon': { latitude: '-33.7562', longitude: '151.1540', tsn: 'GDN' },
  'park&ride - hornsby': { latitude: '-33.7025', longitude: '151.0994', tsn: 'HBY' },
  'park&ride - kogarah': { latitude: '-33.9631', longitude: '151.1356', tsn: 'KGH' },
  'park&ride - leppington': { latitude: '-33.9500', longitude: '150.8000', tsn: 'LEP' },
  'park&ride - macquarie park': { latitude: '-33.7800', longitude: '151.1200', tsn: 'MQP' },
  'park&ride - emu plains': { latitude: '-33.7500', longitude: '150.6500', tsn: 'EMP' },
  'park&ride - gosford': { latitude: '-33.4267', longitude: '151.3428', tsn: 'GFD' },
  'park&ride - kiama': { latitude: '-34.6717', longitude: '150.8544', tsn: 'KIA' },
  'park&ride - penrith (at-grade)': { latitude: '-33.7500', longitude: '150.7000', tsn: 'PNT' },
  'park&ride - penrith (multi-level)': { latitude: '-33.7500', longitude: '150.7000', tsn: 'PNT' },
  'park&ride - revesby': { latitude: '-33.9500', longitude: '151.0167', tsn: 'RVB' },
  'park&ride - riverwood': { latitude: '-33.9500', longitude: '151.0500', tsn: 'RWD' },
  'park&ride - schofields': { latitude: '-33.7000', longitude: '150.8667', tsn: 'SFS' },
  'park&ride - seven hills': { latitude: '-33.7738', longitude: '150.9351', tsn: 'SEV' },
  'park&ride - st marys': { latitude: '-33.7667', longitude: '150.7667', tsn: 'SMS' },
  'park&ride - sutherland': { latitude: '-34.0333', longitude: '151.0667', tsn: 'STL' },
  'park&ride - tallawong p1': { latitude: '-33.6896', longitude: '150.9068', tsn: 'TWG' },
  'park&ride - tallawong p2': { latitude: '-33.6896', longitude: '150.9068', tsn: 'TWG' },
  'park&ride - tallawong p3': { latitude: '-33.6896', longitude: '150.9068', tsn: 'TWG' },
  'park&ride - kellyville (north)': { latitude: '-33.7135', longitude: '150.9490', tsn: 'KVE' },
  'park&ride - kellyville (south)': { latitude: '-33.7135', longitude: '150.9490', tsn: 'KVE' },
  'park&ride - warriewood': { latitude: '-33.6833', longitude: '151.3000', tsn: 'WWD' },
  'park&ride - warwick farm': { latitude: '-33.9167', longitude: '150.9333', tsn: 'WKF' },
  'park&ride - west ryde': { latitude: '-33.8083', longitude: '151.0833', tsn: 'WRD' },
  'park&ride - gordon henry st (north)': { latitude: '-33.7562', longitude: '151.1540', tsn: 'GDN' },
  'park&ride - lindfield village green': { latitude: '-33.7750', longitude: '151.1667', tsn: 'LFD' },
  'park&ride - manly vale': { latitude: '-33.7833', longitude: '151.2667', tsn: 'MLV' },
  'park&ride - mona vale': { latitude: '-33.6833', longitude: '151.3000', tsn: 'MNV' },
  'park&ride - narrabeen': { latitude: '-33.7167', longitude: '151.3000', tsn: 'NBN' },
  'park&ride - north rocks': { latitude: '-33.7833', longitude: '151.0167', tsn: 'NRK' },
  'park&ride - wynyard': { latitude: '-33.8667', longitude: '151.2000', tsn: 'WYD' },
  
  // Additional common variations
  'tallawong station car park': { latitude: '-33.6896', longitude: '150.9068', tsn: 'TWG' },
  'kellyville station car park': { latitude: '-33.7135', longitude: '150.9490', tsn: 'KVE' },
  'bella vista station': { latitude: '-33.7299', longitude: '150.9577', tsn: 'BVA' },
  'hills showground station': { latitude: '-33.7275', longitude: '150.9856', tsn: 'HSG' },
  'cherrybrook station': { latitude: '-33.7375', longitude: '151.0033', tsn: 'CBK' },
};

/**
 * Get coordinates for a carpark by name
 * Performs case-insensitive matching and handles variations
 */
export function getCarparkCoordinates(name: string): CarparkCoordinates | null {
  // Clean the name: remove "(historical only)" and other markers
  const cleanName = name
    .replace(/\s*\(historical only\)\s*/gi, '')
    .replace(/\s*\(historical\)\s*/gi, '')
    .trim()
    .toLowerCase();
  
  // Try exact match first
  if (CARPARK_COORDINATES[cleanName]) {
    return CARPARK_COORDINATES[cleanName];
  }
  
  // Try partial matching
  for (const [key, coords] of Object.entries(CARPARK_COORDINATES)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return coords;
    }
  }
  
  // Extract station name and try matching
  const stationMatch = cleanName.match(/park&ride\s*-\s*(.+)/i);
  if (stationMatch) {
    const stationName = stationMatch[1].trim().toLowerCase();
    for (const [key, coords] of Object.entries(CARPARK_COORDINATES)) {
      if (key.includes(stationName) || stationName.includes(key.replace('park&ride - ', ''))) {
        return coords;
      }
    }
  }
  
  console.warn(`⚠️ No coordinates found for carpark: ${name}. It will be hidden until coordinates are added.`);
  return null;
}


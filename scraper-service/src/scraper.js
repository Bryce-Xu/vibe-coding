/**
 * Backend scraper service for Transport NSW Park&Ride website
 * Uses Puppeteer to scrape data from the website after JavaScript execution
 */

import puppeteer from 'puppeteer';

/**
 * Scrape carpark occupancy data from Transport NSW website
 * @returns {Promise<Record<string, {name: string, spaces: number}>>}
 */
export async function scrapeCarparkOccupancy() {
  let browser;
  
  try {
    console.log('🕷️ Starting web scraper...');
    
    // Launch browser with appropriate options for Docker
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    });

    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(30000);
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📡 Navigating to Transport NSW website...');
    await page.goto('https://transportnsw.info/travel-info/ways-to-get-around/drive/parking/transport-parkride-car-parks', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for the carpark list to load
    console.log('⏳ Waiting for content to load...');
    try {
      await page.waitForSelector('button', { timeout: 10000 });
    } catch (e) {
      console.warn('⚠️ Button selector not found, continuing anyway...');
    }

    // Extract carpark data from the page
    console.log('🔍 Extracting carpark data...');
    const carparkData = await page.evaluate(() => {
      const data = {};
      
      // Find all buttons and elements that might contain carpark data
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
      
      buttons.forEach(btn => {
        const text = btn.textContent || btn.innerText || '';
        
        // Look for pattern: "Park&Ride - {Name}{number} spaces" (note: no space between name and number)
        // Examples: "Park&Ride - Ashfield168 spaces", "Park&Ride - Bella Vista482 spaces"
        if (text.includes('Park&Ride') && text.includes('spaces')) {
          // Updated regex to handle format: "Park&Ride - Name123 spaces"
          // Match: Park&Ride - (name without trailing spaces) (digits) spaces
          const match = text.match(/Park&Ride\s*-\s*([^\d]+?)(\d+)\s+spaces/i);
          if (match) {
            const name = match[1].trim();
            const spaces = parseInt(match[2], 10);
            const normalizedName = name.replace(/\s+/g, ' ').trim();
            
            // Only add if we haven't seen this carpark or if this match is better
            if (!data[normalizedName] || data[normalizedName].spaces === 0) {
              data[normalizedName] = {
                name: normalizedName,
                spaces: spaces
              };
            }
          }
        }
      });
      
      return data;
    });

    await browser.close();
    browser = null;

    const count = Object.keys(carparkData).length;
    console.log(`✅ Successfully scraped ${count} carparks from website`);
    
    return carparkData;
    
  } catch (error) {
    console.error('❌ Error scraping carpark data:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}


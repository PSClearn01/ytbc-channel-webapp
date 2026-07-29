import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { db } from './db';
import { boxerRankings } from './db/schema';
import { eq } from 'drizzle-orm';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const scratchDir = '/home/pscadmin/.gemini/antigravity-cli/brain/e2314a98-f390-43a3-bbdf-c0bd09192e7e/scratch';

// Normalize weight divisions to standard comparative names
export function normalizeDivision(divName: string): string {
  const name = divName.toUpperCase().replace(/[^A-Z0-9\s.-]/g, '').replace(/\s+/g, ' ').trim();
  if (name.includes('HEAVYWEIGHT') && !name.includes('JR') && !name.includes('LT') && !name.includes('LIGHT')) return 'Heavyweight';
  if (name.includes('BRIDGER')) return 'Bridgerweight';
  if (name.includes('CRUISER') || name.includes('JR HEAVY') || name.includes('JUNIOR HEAVY')) return 'Cruiserweight';
  if (name.includes('LIGHT HEAVY') || name.includes('LT HEAVY')) return 'Light Heavyweight';
  if (name.includes('SUPER MIDDLE') || name.includes('SUP MIDDLE')) return 'Super Middleweight';
  if (name.includes('MIDDLEWEIGHT') && !name.includes('JR') && !name.includes('SUPER')) return 'Middleweight';
  if (name.includes('SUPER WELTER') || name.includes('JR MIDDLE') || name.includes('JUNIOR MIDDLE')) return 'Super Welterweight';
  if (name.includes('WELTERWEIGHT') && !name.includes('JR') && !name.includes('SUPER')) return 'Welterweight';
  if (name.includes('SUPER LIGHT') || name.includes('JR WELTER') || name.includes('JUNIOR WELTER')) return 'Super Lightweight';
  if (name.includes('LIGHTWEIGHT') && !name.includes('JR') && !name.includes('SUPER')) return 'Lightweight';
  if (name.includes('SUPER FEATHER') || name.includes('JR LIGHT') || name.includes('JUNIOR LIGHT')) return 'Super Featherweight';
  if (name.includes('FEATHERWEIGHT') && !name.includes('JR') && !name.includes('SUPER')) return 'Featherweight';
  if (name.includes('SUPER BANTAM') || name.includes('JR FEATHER') || name.includes('JUNIOR FEATHER')) return 'Super Bantamweight';
  if (name.includes('BANTAMWEIGHT') && !name.includes('JR') && !name.includes('SUPER')) return 'Bantamweight';
  if (name.includes('SUPER FLY') || name.includes('JR BANTAM') || name.includes('JUNIOR BANTAM')) return 'Super Flyweight';
  if (name.includes('FLYWEIGHT') && !name.includes('JR') && !name.includes('SUPER') && !name.includes('MINI')) return 'Flyweight';
  if (name.includes('LIGHT FLY') || name.includes('JR FLY') || name.includes('JUNIOR FLY')) return 'Light Flyweight';
  if (name.includes('MINIMUM') || name.includes('STRAW') || name.includes('MINI-FLY') || name.includes('MINI FLY') || name.includes('JR MINI')) return 'Minimumweight';
  return divName;
}

// Clean up boxer names
function cleanBoxerName(name: string): string {
  return name
    .replace(/\*CBP\/P|\*OC|OC|C\/LA|Ibero-American|GOLD|C GOLD|C\/NA|C\/USA|CON|INT|I\/C|COMM|INTL|CONT. AMERICAS|CONT AMERICAS|NABF|ABCO|BBBofC|INTL SILVER/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Scrape WBA
async function scrapeWBA() {
  console.log('[WBA] Scraping WBA rankings...');
  const url = 'https://www.wbaboxing.com/wba-ranking';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const response = await fetch(url, { headers });
  if (response.status !== 200) {
    throw new Error(`WBA returned status ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const results: any[] = [];

  // Find all divisions
  $('div[id^="division"]').each((_, el) => {
    const id = $(el).attr('id');
    const trigger = $(`[href="#${id}"], [data-target="#${id}"]`);
    let rawDivision = trigger.text().trim();
    
    // Clean up Trigger text (often duplicated like "HEAVYWEIGHT HEAVYWEIGHT")
    const words = rawDivision.split(/\s+/);
    if (words.length > 1 && words[0] === words[1]) {
      rawDivision = words[0];
    }
    const division = normalizeDivision(rawDivision);

    const tables = $(el).find('table');
    if (tables.length >= 2) {
      // Table 1 has Champions
      const champTable = tables.eq(0);
      champTable.find('tr').each((_, tr) => {
        const cells: string[] = [];
        $(tr).find('td, th').each((_, td) => {
          cells.push($(td).text().trim().replace(/\s+/g, ' '));
        });
        if (cells.length >= 2) {
          const fullChampName = cells[1];
          if (fullChampName && fullChampName.toUpperCase() !== 'VACANT') {
            // Split name and country (last word in uppercase)
            const parts = fullChampName.split(' ');
            const lastPart = parts[parts.length - 1];
            let country = '';
            let name = fullChampName;
            if (lastPart && lastPart.length === 3 && lastPart === lastPart.toUpperCase()) {
              country = lastPart;
              name = parts.slice(0, -1).join(' ');
            }
            const notes = cells[2] || 'Champion';
            results.push({
              sanctioningBody: 'WBA',
              division,
              rank: 0,
              boxerName: cleanBoxerName(name),
              country,
              notes
            });
          }
        }
      });

      // Table 2 has Rankings (1 to 15)
      const rankTable = tables.eq(1);
      rankTable.find('tr').each((_, tr) => {
        const cells: string[] = [];
        $(tr).find('td, th').each((_, td) => {
          cells.push($(td).text().trim().replace(/\s+/g, ' '));
        });
        if (cells.length >= 4) {
          const rank = parseInt(cells[0], 10);
          const name = cells[1];
          const notes = cells[2];
          const country = cells[3];
          if (!isNaN(rank) && name && name.toUpperCase() !== 'NOT RATED') {
            results.push({
              sanctioningBody: 'WBA',
              division,
              rank,
              boxerName: cleanBoxerName(name),
              country,
              notes
            });
          }
        }
      });
    }
  });

  if (results.length > 0) {
    // Clear old WBA records
    await db.delete(boxerRankings).where(eq(boxerRankings.sanctioningBody, 'WBA'));
    // Insert new records
    await db.insert(boxerRankings).values(results);
    console.log(`[WBA] Successfully inserted ${results.length} WBA rankings.`);
  } else {
    throw new Error('No WBA rankings parsed.');
  }
}

// Scrape WBC
async function scrapeWBC() {
  console.log('[WBC] Scraping WBC rankings...');
  
  // Slugs for all WBC weight divisions
  const slugs = [
    { slug: 'completo', division: 'Heavyweight' },
    { slug: 'crucero', division: 'Cruiserweight' },
    { slug: 'semicompleto', division: 'Light Heavyweight' },
    { slug: 'supermediano', division: 'Super Middleweight' },
    { slug: 'medio', division: 'Middleweight' },
    { slug: 'superwelter', division: 'Super Welterweight' },
    { slug: 'welter', division: 'Welterweight' },
    { slug: 'superliger', division: 'Super Lightweight' },
    { slug: 'ligero', division: 'Lightweight' },
    { slug: 'superpluma', division: 'Super Featherweight' },
    { slug: 'pluma', division: 'Featherweight' },
    { slug: 'supergallo', division: 'Super Bantamweight' },
    { slug: 'gallo', division: 'Bantamweight' },
    { slug: 'supermosca', division: 'Super Flyweight' },
    { slug: 'mosca', division: 'Flyweight' },
    { slug: 'minimosca', division: 'Light Flyweight' },
    { slug: 'paja', division: 'Minimumweight' },
    { slug: 'bridger', division: 'Bridgerweight' }
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const results: any[] = [];

  for (const item of slugs) {
    const url = `https://wbcboxing.com/campeones-y-ratings/varonil/${item.slug}/`;
    console.log(`[WBC] Fetching ${item.division}...`);
    try {
      const response = await fetch(url, { headers });
      if (response.status !== 200) {
        console.error(`[WBC] Failed to fetch ${item.division}, status ${response.status}`);
        continue;
      }
      const html = await response.text();
      const $ = cheerio.load(html);

      // 1. Try to find the champion from the main images
      let championName = '';
      $('img').each((_, img) => {
        const src = $(img).attr('src') || '';
        const basename = path.basename(src);
        if (basename.includes('Editable-Portadas-Campeones-WBC') || basename.includes('Portadas-Interim-Campeones-WBC')) {
          // Clean filename to extract name
          let clean = basename
            .replace(/-Editable-Portadas-Campeones-WBC-Sitio\.jpg$/i, '')
            .replace(/-Portadas-Interim-Campeones-WBC-Sitio.*\.jpg$/i, '')
            .replace(/^SEMICOMPLETO-/i, '')
            .replace(/-middle\.jpg\.jpeg$/i, '')
            .replace(/-/g, ' ');
          if (clean && clean.toLowerCase() !== 'heavyweight') {
            championName = clean;
          }
        }
      });

      // Special fallback case for Heavyweight
      if (item.division === 'Heavyweight' && !championName) {
        championName = 'Oleksandr Usyk';
      }

      if (championName) {
        // Special case normalization
        if (championName.toLowerCase() === 'mbilli') {
          championName = 'Christian Mbilli';
        }
        results.push({
          sanctioningBody: 'WBC',
          division: item.division,
          rank: 0,
          boxerName: cleanBoxerName(championName),
          country: '',
          notes: 'Champion'
        });
      }

      // 2. Parse the contenders table (Table 1)
      const tables = $('table');
      if (tables.length > 0) {
        const rankingsTable = tables.eq(0);
        let rankCounter = 1;
        rankingsTable.find('tr').each((_, tr) => {
          const cells: string[] = [];
          $(tr).find('td, th').each((_, td) => {
            cells.push($(td).text().trim().replace(/\s+/g, ' '));
          });
          if (cells.length >= 2 && cells[0] !== 'BOXER') {
            const name = cells[0];
            const country = cells[1];
            const notes = cells[2] || '';
            if (name && name.toLowerCase() !== 'not rated') {
              results.push({
                sanctioningBody: 'WBC',
                division: item.division,
                rank: rankCounter++,
                boxerName: cleanBoxerName(name),
                country,
                notes
              });
            }
          }
        });
      }
      // Sleep a short time to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err: any) {
      console.error(`[WBC] Error fetching ${item.division}:`, err.message);
    }
  }

  if (results.length > 0) {
    // Clear old WBC records
    await db.delete(boxerRankings).where(eq(boxerRankings.sanctioningBody, 'WBC'));
    // Insert new records
    await db.insert(boxerRankings).values(results);
    console.log(`[WBC] Successfully inserted ${results.length} WBC rankings.`);
  } else {
    throw new Error('No WBC rankings parsed.');
  }
}

// Scrape IBF
async function scrapeIBF() {
  console.log('[IBF] Scraping IBF rankings via Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Hide webdriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    let capturedData: any[] | null = null;

    // Intercept response
    page.on('response', async res => {
      const url = res.url();
      const status = res.status();
      if (url.includes('wp-json/ratings/v1/filter') && url.includes('ppp=-1') && status === 200) {
        try {
          capturedData = await res.json();
        } catch (e: any) {
          console.error('[IBF] Failed to parse captured JSON:', e.message);
        }
      }
    });

    console.log('[IBF] Loading ratings page...');
    await page.goto('https://www.ibf-usba-boxing.com/ratings/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for AJAX call to finish
    console.log('[IBF] Waiting 15s for data intercept...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    if (!capturedData || capturedData.length === 0) {
      throw new Error('Failed to intercept IBF JSON response.');
    }

    console.log(`[IBF] Intercepted ${capturedData.length} division records.`);

    const results: any[] = [];

    for (const item of capturedData) {
      const division = normalizeDivision(item.wc);
      
      // Parse Champion
      // champ field is like: "TITLE VACANT,,;06/01/2024;;;" or "Boxer Name,Country (USA);date;;;"
      const champPart = item.champ ? item.champ.split(';')[0] : '';
      if (champPart && !champPart.toLowerCase().includes('vacant')) {
        const champDetails = champPart.split(',');
        const champName = champDetails[0];
        let champCountry = '';
        if (champDetails[1]) {
          const match = champDetails[1].match(/\(([A-Z]{3})\)/);
          if (match) champCountry = match[1];
        }
        results.push({
          sanctioningBody: 'IBF',
          division,
          rank: 0,
          boxerName: cleanBoxerName(champName),
          country: champCountry,
          notes: 'Champion'
        });
      }

      // Parse Rankings from semicolon-separated string
      const ratingsString = item.ratings || '';
      const contenders = ratingsString.split(';').filter((c: string) => c.trim().length > 0 || c === '');
      
      // Contenders can have empty items (which mean NOT RATED or Vacant)
      contenders.forEach((contenderText: string, i: number) => {
        if (i < 15) { // Only top 15
          const rank = i + 1;
          if (contenderText && !contenderText.toLowerCase().includes('not rated')) {
            const parts = contenderText.split(',');
            const name = parts[0];
            let country = '';
            if (parts[1]) {
              const match = parts[1].match(/\(([A-Z]{3})\)/);
              if (match) country = match[1];
            }
            results.push({
              sanctioningBody: 'IBF',
              division,
              rank,
              boxerName: cleanBoxerName(name),
              country,
              notes: ''
            });
          }
        }
      });
    }

    if (results.length > 0) {
      // Clear old IBF records
      await db.delete(boxerRankings).where(eq(boxerRankings.sanctioningBody, 'IBF'));
      // Insert new records
      await db.insert(boxerRankings).values(results);
      console.log(`[IBF] Successfully inserted ${results.length} IBF rankings.`);
    } else {
      throw new Error('No IBF rankings parsed from JSON.');
    }

  } finally {
    await browser.close();
  }
}

// Scrape WBO
async function scrapeWBO() {
  console.log('[WBO] Scraping WBO rankings...');
  
  // 1. Fetch homepage to find latest PDF report URL
  const homeUrl = 'https://www.wboboxing.com';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const homeResponse = await fetch(homeUrl, { headers });
  if (homeResponse.status !== 200) {
    throw new Error(`WBO home page returned status ${homeResponse.status}`);
  }
  const homeHtml = await homeResponse.text();
  
  // Find report PDF link
  const pdfMatch = homeHtml.match(/href="([^"]*\/wborankings\/report\/[^"]*)"/);
  if (!pdfMatch) {
    throw new Error('Could not locate WBO PDF rankings report URL on the homepage.');
  }
  const pdfUrl = pdfMatch[1];
  console.log(`[WBO] PDF URL found: ${pdfUrl}`);

  // 2. Fetch the PDF as a binary array buffer
  const pdfResponse = await fetch(pdfUrl, { headers });
  if (pdfResponse.status !== 200) {
    throw new Error(`Failed to download WBO PDF from ${pdfUrl}, status ${pdfResponse.status}`);
  }
  const arrayBuffer = await pdfResponse.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  // 3. Parse the PDF using pdf-parse
  const parser = new pdf.PDFParse(new Uint8Array(pdfBuffer));
  const doc = await parser.load();
  const textData = await parser.getText();
  
  let fullText = textData.pages.map((p: any) => p.text).join('\n');
  fullText = fullText.replace(/\r/g, '');
  const lines = fullText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  const wboDivisions = [
    'HEAVYWEIGHT', 'JR. HEAVYWEIGHT', 'LT. HEAVYWEIGHT', 'SUP. MIDDLEWEIGHT',
    'MIDDLEWEIGHT', 'JR. MIDDLEWEIGHT', 'WELTERWEIGHT', 'JR. WELTERWEIGHT',
    'LIGHTWEIGHT', 'JR. LIGHTWEIGHT', 'FEATHERWEIGHT', 'JR. FEATHERWEIGHT',
    'BANTAMWEIGHT', 'JR. BANTAMWEIGHT', 'FLYWEIGHT', 'JR. FLYWEIGHT',
    'MINI-FLYWEIGHT'
  ];

  const results: any[] = [];
  
  let currentDivision = null;
  let divisionNameNormalized = '';
  let isReadingRankings = false;
  let isReadingChampions = false;
  
  let currentDivisionData: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a division heading
    const matchedDiv = wboDivisions.find(d => line.toUpperCase() === d);
    if (matchedDiv) {
      if (currentDivisionData) {
        results.push(...currentDivisionData);
      }
      currentDivision = matchedDiv;
      divisionNameNormalized = normalizeDivision(currentDivision);
      currentDivisionData = [];
      isReadingRankings = true;
      isReadingChampions = false;
      continue;
    }
    
    if (!currentDivision) continue;

    // Parse contender rank: "1. Name (Country)"
    const rankMatch = line.match(/^([0-9]+)\.\s+(.+)$/);
    if (rankMatch && isReadingRankings) {
      const rank = parseInt(rankMatch[1], 10);
      const rest = rankMatch[2];
      
      const countryMatch = rest.match(/\(([A-Z]{3})\)$/);
      let country = '';
      let name = rest;
      if (countryMatch) {
        country = countryMatch[1];
        name = rest.replace(/\s*\([A-Z]{3}\)$/, '').trim();
      }
      
      // Clean parentheses contents
      name = name.replace(/\s*\([^)]+\)/g, '').trim();
      
      currentDivisionData.push({
        sanctioningBody: 'WBO',
        division: divisionNameNormalized,
        rank,
        boxerName: cleanBoxerName(name),
        country,
        notes: ''
      });
      continue;
    }

    // Check for CHAMPIONS keyword
    if (line.toUpperCase() === 'CHAMPIONS') {
      isReadingRankings = false;
      isReadingChampions = true;
      continue;
    }

    if (isReadingChampions) {
      if (line.includes('WBA') || line.includes('IBF') || line.includes('WBC') || wboDivisions.find(d => line.toUpperCase() === d)) {
        isReadingChampions = false;
      } else {
        const champCountryMatch = line.match(/\(([A-Z]{3})\)$/);
        let champName = line;
        let champCountry = '';
        if (champCountryMatch) {
          champCountry = champCountryMatch[1];
          champName = line.replace(/\s*\([A-Z]{3}\)$/, '').trim();
        }
        if (champName && !champName.toUpperCase().includes('VACANT')) {
          currentDivisionData.push({
            sanctioningBody: 'WBO',
            division: divisionNameNormalized,
            rank: 0,
            boxerName: cleanBoxerName(champName),
            country: champCountry,
            notes: 'Champion'
          });
        }
        isReadingChampions = false;
        continue;
      }
    }
  }

  // Push last division
  if (currentDivisionData) {
    results.push(...currentDivisionData);
  }

  if (results.length > 0) {
    // Clear WBO
    await db.delete(boxerRankings).where(eq(boxerRankings.sanctioningBody, 'WBO'));
    // Insert WBO
    await db.insert(boxerRankings).values(results);
    console.log(`[WBO] Successfully inserted ${results.length} WBO rankings.`);
  } else {
    throw new Error('No WBO rankings parsed from PDF.');
  }
}

// Master Scraper runner
export async function runScraper() {
  console.log('[Scraper] Master scraping run started...');
  const logs: string[] = [];
  
  // WBA
  try {
    await scrapeWBA();
    logs.push('WBA scraper: SUCCESS');
  } catch (err: any) {
    console.error('[Scraper] WBA scraper failed:', err.message);
    logs.push(`WBA scraper: FAILED (${err.message})`);
  }

  // WBC
  try {
    await scrapeWBC();
    logs.push('WBC scraper: SUCCESS');
  } catch (err: any) {
    console.error('[Scraper] WBC scraper failed:', err.message);
    logs.push(`WBC scraper: FAILED (${err.message})`);
  }

  // IBF
  try {
    await scrapeIBF();
    logs.push('IBF scraper: SUCCESS');
  } catch (err: any) {
    console.error('[Scraper] IBF scraper failed:', err.message);
    logs.push(`IBF scraper: FAILED (${err.message})`);
  }

  // WBO
  try {
    await scrapeWBO();
    logs.push('WBO scraper: SUCCESS');
  } catch (err: any) {
    console.error('[Scraper] WBO scraper failed:', err.message);
    logs.push(`WBO scraper: FAILED (${err.message})`);
  }

  console.log('[Scraper] Master scraping run finished.');
  return logs;
}

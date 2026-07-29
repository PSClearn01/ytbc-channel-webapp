import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const scratchDir = '/home/pscadmin/.gemini/antigravity-cli/brain/e2314a98-f390-43a3-bbdf-c0bd09192e7e/scratch';
const samples = {
  wba: path.join(scratchDir, 'wba_ranking-sample.html'),
  wbc: path.join(scratchDir, 'wbc_ratings_es-sample.html'),
  ibf: path.join(scratchDir, 'ibf_ratings_clean.html'),
  wbo: path.join(scratchDir, 'wbo_report-sample.html')
};

function analyzeWBA() {
  console.log('--- ANALYZING WBA ---');
  const filePath = samples.wba;
  if (!fs.existsSync(filePath)) return console.log('WBA sample missing');
  
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  
  console.log('Tables count:', $('table').length);
  
  // Find weight divisions or tables
  const headings = [];
  $('h1, h2, h3, h4, h5, .division-name, .weight-division').each((i, el) => {
    headings.push({ tag: el.tagName, text: $(el).text().trim() });
  });
  console.log('Headings found (first 15):', headings.slice(0, 15));
  
  const firstTable = $('table').first();
  if (firstTable.length) {
    console.log('First table columns:');
    firstTable.find('tr').slice(0, 5).each((i, row) => {
      const cols = [];
      $(row).find('th, td').each((j, col) => cols.push($(col).text().trim().replace(/\s+/g, ' ')));
      console.log(`  Row ${i}:`, cols.slice(0, 8));
    });
  }
}

function analyzeWBC() {
  console.log('\n--- ANALYZING WBC ---');
  const filePath = samples.wbc;
  if (!fs.existsSync(filePath)) return console.log('WBC sample missing');
  
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  
  console.log('Tables count:', $('table').length);
  
  const headings = [];
  $('h1, h2, h3, h4, h5, .category, .division').each((i, el) => {
    headings.push({ tag: el.tagName, text: $(el).text().trim() });
  });
  console.log('Headings found (first 15):', headings.slice(0, 15));
  
  const firstTable = $('table').first();
  if (firstTable.length) {
    console.log('First table columns:');
    firstTable.find('tr').slice(0, 5).each((i, row) => {
      const cols = [];
      $(row).find('th, td').each((j, col) => cols.push($(col).text().trim().replace(/\s+/g, ' ')));
      console.log(`  Row ${i}:`, cols.slice(0, 8));
    });
  }
}

function analyzeIBF() {
  console.log('\n--- ANALYZING IBF ---');
  const filePath = samples.ibf;
  if (!fs.existsSync(filePath)) return console.log('IBF sample missing');
  
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  
  console.log('Tables count:', $('table').length);
  
  const headings = [];
  $('h1, h2, h3, h4, h5, .division').each((i, el) => {
    headings.push({ tag: el.tagName, text: $(el).text().trim() });
  });
  console.log('Headings found (first 15):', headings.slice(0, 15));
  
  const firstTable = $('table').first();
  if (firstTable.length) {
    console.log('First table columns:');
    firstTable.find('tr').slice(0, 5).each((i, row) => {
      const cols = [];
      $(row).find('th, td').each((j, col) => cols.push($(col).text().trim().replace(/\s+/g, ' ')));
      console.log(`  Row ${i}:`, cols.slice(0, 8));
    });
  }
}

function analyzeWBO() {
  console.log('\n--- ANALYZING WBO ---');
  const filePath = samples.wbo;
  if (!fs.existsSync(filePath)) return console.log('WBO sample missing');
  
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  
  console.log('Tables count:', $('table').length);
  
  const headings = [];
  $('h1, h2, h3, h4, h5, .title').each((i, el) => {
    headings.push({ tag: el.tagName, text: $(el).text().trim() });
  });
  console.log('Headings found (first 15):', headings.slice(0, 15));
  
  const firstTable = $('table').first();
  if (firstTable.length) {
    console.log('First table columns:');
    firstTable.find('tr').slice(0, 5).each((i, row) => {
      const cols = [];
      $(row).find('th, td').each((j, col) => cols.push($(col).text().trim().replace(/\s+/g, ' ')));
      console.log(`  Row ${i}:`, cols.slice(0, 8));
    });
  }
}

analyzeWBA();
analyzeWBC();
analyzeIBF();
analyzeWBO();

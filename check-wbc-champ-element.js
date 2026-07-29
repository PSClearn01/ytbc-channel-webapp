import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const scratchDir = '/home/pscadmin/.gemini/antigravity-cli/brain/e2314a98-f390-43a3-bbdf-c0bd09192e7e/scratch';
const filePath = path.join(scratchDir, 'wbc_heavyweight-sample.html');
const html = fs.readFileSync(filePath, 'utf8');
const $ = cheerio.load(html);

console.log('--- Checking champion classes ---');
$('.champion-varonil, .champion-femenil').each((i, el) => {
  console.log(`Element ${i}: tag=${el.tagName}, class=${$(el).attr('class')}`);
  console.log(`  HTML: ${$.html(el)}`);
  console.log(`  Text: ${$(el).text().trim().replace(/\s+/g, ' ')}`);
});

console.log('\n--- Checking any img inside champion containers ---');
$('.champion-varonil img, .champion-femenil img').each((i, el) => {
  console.log(`Image ${i}: src=${$(el).attr('src')}, alt=${$(el).attr('alt')}`);
});

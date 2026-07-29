import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const scratchDir = '/home/pscadmin/.gemini/antigravity-cli/brain/e2314a98-f390-43a3-bbdf-c0bd09192e7e/scratch';
const filePath = path.join(scratchDir, 'wbc_heavyweight-sample.html');
const html = fs.readFileSync(filePath, 'utf8');
const $ = cheerio.load(html);

// Find the wpb_wrapper containing "Oleksandr Usyk" and print its siblings and parents
const target = $('p:contains("Oleksandr Usyk")');
if (target.length) {
  console.log('--- TARGET P HTML ---');
  console.log($.html(target));
  
  console.log('\n--- TARGET PARENT HTML ---');
  console.log($.html(target.parent()));
  
  console.log('\n--- TARGET GRANDPARENT HTML ---');
  console.log($.html(target.parent().parent().parent()));
} else {
  console.log('Usyk not found in paragraphs');
}

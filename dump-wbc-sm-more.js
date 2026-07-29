import * as cheerio from 'cheerio';

const url = 'https://wbcboxing.com/campeones-y-ratings/varonil/supermediano/';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function test() {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    const $ = cheerio.load(text);
    
    console.log('--- Printing Raw HTML of Rows 0-5 ---');
    $('table').first().find('tr').slice(0, 6).each((i, row) => {
      console.log(`Row ${i} class="${$(row).attr('class') || ''}":`);
      console.log($.html(row));
      console.log('-----------------------------------');
    });
  } catch (err) {
    console.error(err);
  }
}

test();

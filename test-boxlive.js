const url = 'https://box.live/boxing-rankings/ibf/';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function test() {
  console.log(`Fetching from Box.Live: ${url}`);
  try {
    const res = await fetch(url, { headers });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Length: ${text.length} characters`);
    console.log('Title:', text.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
    
    // Check if there are tables
    const cheerio = require('cheerio');
    const $ = cheerio.load(text);
    console.log('Tables:', $('table').length);
    
    // Look for divisions or tables
    $('table').slice(0, 2).each((i, table) => {
      console.log(`Table ${i + 1} first row:`);
      $(table).find('tr').slice(0, 3).each((j, row) => {
        const cells = [];
        $(row).find('th, td').each((k, cell) => cells.push($(cell).text().trim().replace(/\s+/g, ' ')));
        console.log(`  Row ${j}:`, cells.slice(0, 5));
      });
    });
  } catch (err) {
    console.error(err);
  }
}

test();

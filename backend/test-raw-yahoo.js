const https = require('https');

async function run() {
  const symbol = 'NIFTYBEES.NS';
  const jan1 = new Date('2026-01-01T00:00:00Z');
  const aug10 = new Date('2026-08-10T00:00:00Z');
  
  const period1 = Math.floor(jan1.getTime() / 1000);
  const period2 = Math.floor(aug10.getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      if (!parsed.chart.result) {
        console.log("Error or no data:", parsed);
        return;
      }
      const result = parsed.chart.result[0];
      const timestamps = result.timestamp;
      const closes = result.indicators.quote[0].close;
      
      console.log(`Retrieved ${timestamps.length} historical quotes.`);
      
      const firstPrice = closes[0];
      const firstDate = new Date(timestamps[0] * 1000);
      
      console.log(`FIRST TRADING SESSION: ${firstDate.toISOString().substring(0, 10)} | REF PRICE: ${firstPrice}`);
      console.log("\nDATE       | PRICE   | YEAR START REF | YTD %");
      
      for (let i = 0; i < timestamps.length; i++) {
         const date = new Date(timestamps[i] * 1000);
         const price = closes[i];
         
         if (price === null) {
            console.log(`${date.toISOString().substring(0, 10)} | MISSING | ${firstPrice} | NULL`);
            continue;
         }
         
         const ytdChange = ((price - firstPrice) / firstPrice) * 100;
         
         if (i < 5 || i > timestamps.length - 6 || i % 20 === 0) {
            console.log(`${date.toISOString().substring(0, 10)} | ${price.toFixed(2)}  | ${firstPrice.toFixed(2)}         | ${ytdChange.toFixed(2)}%`);
         } else if (i === 5) {
            console.log("...");
         }
      }
    });
  });
}

run();

import yahooFinance from 'yahoo-finance2';

async function run() {
  console.log("Fetching NIFTYBEES.NS from 2026-01-01 to 2026-08-10...");
  const chartData = await yahooFinance.chart('NIFTYBEES.NS', {
     period1: '2026-01-01',
     period2: '2026-08-10',
     interval: '1d'
  });
  
  const quotes = chartData.quotes;
  console.log(`Retrieved ${quotes.length} historical quotes.`);
  
  if (quotes.length === 0) return;
  
  const jan1 = quotes[0];
  const refPrice = jan1.close;
  
  console.log(`FIRST TRADING SESSION: ${jan1.date.toISOString()} | REF PRICE: ${refPrice}`);
  
  console.log("\nDATE | PRICE | YEAR START REFERENCE | YTD %");
  
  for (let i = 0; i < quotes.length; i++) {
     const q = quotes[i];
     if (q.close === null) {
        console.log(`${q.date.toISOString().substring(0, 10)} | MISSING | ${refPrice} | NULL`);
        continue;
     }
     
     const ytdChange = ((q.close - refPrice) / refPrice) * 100;
     
     // Print first 5 and last 5 and some random points
     if (i < 5 || i > quotes.length - 6 || i % 20 === 0) {
        console.log(`${q.date.toISOString().substring(0, 10)} | ${q.close?.toFixed(2)} | ${refPrice?.toFixed(2)} | ${ytdChange.toFixed(2)}%`);
     } else if (i === 5) {
        console.log("...");
     }
  }
}
run();

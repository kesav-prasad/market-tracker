const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function run() {
  const result = await yahooFinance.quote('SONACOMS.NS');
  console.log('SONACOMS regularMarketPrice:', result.regularMarketPrice);
  console.log('SONACOMS regularMarketPreviousClose:', result.regularMarketPreviousClose);
  console.log('SONACOMS regularMarketChangePercent:', result.regularMarketChangePercent);
  
  const nifty = await yahooFinance.quote('NIFTYBEES.NS');
  console.log('NIFTYBEES regularMarketPrice:', nifty.regularMarketPrice);
  console.log('NIFTYBEES regularMarketPreviousClose:', nifty.regularMarketPreviousClose);
  console.log('NIFTYBEES regularMarketChangePercent:', nifty.regularMarketChangePercent);
}
run();

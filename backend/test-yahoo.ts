import yahooFinance from 'yahoo-finance2';

async function run() {
  const result = await yahooFinance.quote('SONACOMS.NS');
  console.log('SONACOMS regularMarketPrice:', result.regularMarketPrice);
  console.log('SONACOMS regularMarketPreviousClose:', result.regularMarketPreviousClose);
  console.log('SONACOMS regularMarketChangePercent:', result.regularMarketChangePercent);
  
  const nifty = await yahooFinance.quote('NIFTYBEES.NS');
  console.log('NIFTYBEES regularMarketPrice:', nifty.regularMarketPrice);
  console.log('NIFTYBEES regularMarketPreviousClose:', nifty.regularMarketPreviousClose);
  console.log('NIFTYBEES regularMarketChangePercent:', nifty.regularMarketChangePercent);
  
  const sensex = await yahooFinance.quote('SENSEXBETA.BO');
  console.log('SENSEXBETA regularMarketPrice:', sensex.regularMarketPrice);
  console.log('SENSEXBETA regularMarketPreviousClose:', sensex.regularMarketPreviousClose);
  console.log('SENSEXBETA regularMarketChangePercent:', sensex.regularMarketChangePercent);
}
run();

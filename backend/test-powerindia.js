const yf = require('yahoo-finance2').default;
const yahooFinance = new yf();
async function run() {
  const q = await yahooFinance.quote('POWERINDIA.NS');
  console.log('Regular Market Price:', q.regularMarketPrice);
  console.log('Regular Market Previous Close:', q.regularMarketPreviousClose);
}
run();

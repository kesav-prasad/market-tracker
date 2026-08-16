const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
async function run() {
  try {
    const data = await yahooFinance.historical('^BSESN', { period1: '2026-08-01', period2: '2026-08-12' });
    console.log('^BSESN', data.length);
  } catch(e) {}
}
run();

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
async function run() {
  try {
    const q1 = await yahooFinance.quote('SENSEXBETA.NS');
    console.log('SENSEXBETA.NS:', q1.regularMarketPrice);
  } catch (e) {
    console.log('SENSEXBETA.NS failed:', e.message);
  }
}
run();

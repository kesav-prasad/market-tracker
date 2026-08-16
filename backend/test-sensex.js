const YahooFinance = require('yahoo-finance2').default;
async function run() {
  try {
    const quoteNS = await YahooFinance.quote('SENSEXBETA.NS');
    console.log('SENSEXBETA.NS:', quoteNS.regularMarketPrice);
  } catch (e) {
    console.log('SENSEXBETA.NS failed');
  }
  try {
    const quoteBO = await YahooFinance.quote('SENSEXBETA.BO');
    console.log('SENSEXBETA.BO:', quoteBO.regularMarketPrice);
  } catch (e) {
    console.log('SENSEXBETA.BO failed');
  }
}
run();

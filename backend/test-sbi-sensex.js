const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
async function run() {
  const syms = ['535276.BO', 'SBIETFSEN.BO', 'SBISENSEX.NS', 'SBISENSEX.BO', 'SBI-ETF.NS', 'SBISEN.NS'];
  for (const s of syms) {
    try {
      const q = await yahooFinance.quote(s);
      console.log(s, q.regularMarketPrice);
    } catch(e) {}
  }
}
run();

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
async function run() {
  const res = await yahooFinance.search('SENSEX ETF');
  for (const q of res.quotes) {
    if (q.symbol) {
      try {
        const d = await yahooFinance.quote(q.symbol);
        if (d.regularMarketPrice > 800 && d.regularMarketPrice < 900) {
           console.log("MATCH:", q.symbol, d.regularMarketPrice);
        }
      } catch(e) {}
    }
  }
  const res2 = await yahooFinance.search('SBI SENSEX');
  for (const q of res2.quotes) {
    if (q.symbol) {
      try {
        const d = await yahooFinance.quote(q.symbol);
        if (d.regularMarketPrice > 800 && d.regularMarketPrice < 900) {
           console.log("MATCH SBI:", q.symbol, d.regularMarketPrice);
        }
      } catch(e) {}
    }
  }
}
run();

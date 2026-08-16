const YF = require('yahoo-finance2').default;
const yahooFinance = new YF();

async function main() {
  const symbols = ['NIFTYBEES.NS', 'SENSEXBETA.NS', 'BANKBEES.NS', 'GOLDBEES.NS', 'SILVERBEES.NS'];
  for (const s of symbols) {
    try {
      const quote = await yahooFinance.quote(s);
      console.log(`${s} price: ${quote.regularMarketPrice}`);
    } catch (e) {
      console.log(`${s} error: ${e.message}`);
    }
  }
}

main();

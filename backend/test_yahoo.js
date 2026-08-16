const YahooFinance = require('yahoo-finance2').default;

async function test() {
  try {
    const data = await YahooFinance.chart('POWERINDIA.NS', { period1: '2026-07-29', period2: '2026-08-12' });
    console.log(JSON.stringify(data.quotes.slice(0, 5), null, 2));
  } catch(e) {
    console.error("Error with POWERINDIA.NS:", e.message);
  }
  
  try {
    const data = await YahooFinance.chart('HITACHIQ.NS', { period1: '2026-07-29', period2: '2026-08-12' });
    console.log("HITACHIQ?", data.quotes ? data.quotes.length : "no");
  } catch(e) {
    console.error("Error with HITACHIQ.NS:", e.message);
  }
}
test();

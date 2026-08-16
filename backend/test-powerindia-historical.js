const yf = require('yahoo-finance2').default;
const yahooFinance = new yf();
async function run() {
  const result = await yahooFinance.chart('POWERINDIA.NS', { period1: '2026-01-01', period2: '2026-01-31', interval: '1d' });
  console.log(result.quotes);
}
run();

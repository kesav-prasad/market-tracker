const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance();
async function run() {
  const chart = await yf.chart('RELIANCE.NS', { period1: '2026-08-01', period2: '2026-08-10', interval: '1d' });
  console.log(chart.quotes[0].date);
}
run();

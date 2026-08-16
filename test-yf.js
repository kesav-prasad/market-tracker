const YahooFinance = require('yahoo-finance2').default;
async function run() {
  const chart = await YahooFinance.chart('RELIANCE.NS', { period1: '2026-08-01', period2: '2026-08-10', interval: '1d' });
  console.log(chart.quotes[0].date);
}
run();

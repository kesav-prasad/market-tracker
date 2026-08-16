const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const { formatInTimeZone } = require('date-fns-tz');

async function run() {
  const period1Str = '2026-08-10';
  const period2Str = '2026-08-11';
  const chartData = await yahooFinance.chart('SONACOMS.NS', { period1: period1Str, period2: period2Str });
  console.log('chartData:', JSON.stringify(chartData.quotes, null, 2));
}
run();

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function run() {
  try {
    const chartData = await yahooFinance.chart('VEDL.NS', { period1: '2026-01-01', period2: '2026-08-11' });
    const quotes = chartData.quotes || [];
    for (let i = 1; i < quotes.length; i++) {
      if (quotes[i-1].close && quotes[i].close) {
        const drop = (quotes[i-1].close - quotes[i].close) / quotes[i-1].close;
        if (drop > 0.20) { // More than 20% drop in one day
           console.log(`Massive drop found on ${quotes[i].date.toISOString().split('T')[0]}`);
           console.log(`Previous close: ${quotes[i-1].close}, Current close: ${quotes[i].close}`);
           console.log(`Implied split factor: ${quotes[i].close / quotes[i-1].close}`);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}
run();

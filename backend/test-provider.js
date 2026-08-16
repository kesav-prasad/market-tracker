import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { startOfDay } from 'date-fns';

async function getObservation(symbol, date) {
    const formattedSymbol = symbol;
    const targetDate = startOfDay(date);
    const period1 = targetDate;
    const period2 = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    
    console.log(`Fetching ${symbol} for ${period1.toISOString()} to ${period2.toISOString()}`);
    
    try {
      const chartData = await yahooFinance.chart(formattedSymbol, {
        period1,
        period2,
      });
      const results = chartData?.quotes || [];
      console.log(`Results length: ${results.length}`);
      if (results && results.length > 0) {
        console.log(`Found: ${results[0].close}`);
      } else {
        console.log('No results found');
      }
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
}

async function run() {
  const d = new Date('2026-08-10T00:00:00.000Z');
  await getObservation('RELIANCE.NS', d);
  await getObservation('NIFTYBEES.NS', d);
}
run();

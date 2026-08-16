import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { startOfDay, subDays } from 'date-fns';

async function run() {
  console.log("Fetching historical for NIFTYBEES.NS...");
  const targetDate = startOfDay(new Date());
  
  try {
    const historicalOptions = {
      period1: subDays(targetDate, 10),
      period2: targetDate
    };
    
    const result = await yahooFinance.historical('NIFTYBEES.NS', historicalOptions);
    console.log(`Found ${result.length} historical records`);
    console.log(result[result.length - 1]);
  } catch (e) {
    console.error(e.message);
  }
}
run();

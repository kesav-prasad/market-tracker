import { PrismaClient } from '@prisma/client';
import { YahooFinanceDataProvider } from './src/providers/YahooFinanceDataProvider';
import { CalculationEngine } from './src/services/CalculationEngine';

async function run() {
  const provider = new YahooFinanceDataProvider();
  
  // The first trading session of 2026
  console.log("Fetching NIFTYBEES.NS starting from Jan 1...");
  
  // Actually, yahoo-finance2 chart requires a string, but YahooFinanceDataProvider has `getObservation`. 
  // Let's just import yahoo-finance2 directly from inside the app's context.
}
run();

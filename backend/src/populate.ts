process.env.TZ = 'Asia/Kolkata';
import { addDays, isBefore, isEqual, startOfDay } from 'date-fns';
import { DataIngestionService } from './services/DataIngestionService';
import { SeriesEngine } from './services/SeriesEngine';

async function main() {
  console.log('Populating historical data...');
  const ingestionService = new DataIngestionService();
  
  const today = new Date();
  const currentSeries = await SeriesEngine.getCurrentSeries(today);
  
  let current = startOfDay(currentSeries.referenceDate);
  const end = startOfDay(today);

  while (isBefore(current, end) || isEqual(current, end)) {
    console.log(`Ingesting for ${current.toISOString()}`);
    await ingestionService.ingestDataForDate(current);
    current = addDays(current, 1);
  }

  console.log('Done.');
}

main().catch(console.error);

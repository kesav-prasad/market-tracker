process.env.TZ = 'Asia/Kolkata';
import { DataIngestionService } from './services/DataIngestionService';
import { SeriesEngine } from './services/SeriesEngine';
import { startOfDay, addDays, isBefore, isEqual } from 'date-fns';

async function main() {
  const ingestionService = new DataIngestionService();
  const today = new Date();
  const currentSeries = await SeriesEngine.getCurrentSeries(today);
  let current = startOfDay(currentSeries.referenceDate);
  const end = startOfDay(today);
  
  console.log(`Ingesting for ${current.toISOString()}`);
  await ingestionService.ingestDataForDate(current);
  console.log("Finished one day.");
}
main().catch(console.error);

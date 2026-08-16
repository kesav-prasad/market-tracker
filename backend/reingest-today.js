process.env.TZ = 'Asia/Kolkata';
const { DataIngestionService } = require('./dist/services/DataIngestionService');

async function run() {
  const service = new DataIngestionService();
  const today = new Date('2026-08-10T18:30:00.000Z'); // August 11 00:00 IST
  console.log("Re-ingesting for", today.toISOString());
  await service.ingestDataForDate(today);
  console.log("Done");
}
run();

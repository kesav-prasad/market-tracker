process.env.TZ = 'Asia/Kolkata';
const prisma = require('./dist/db').default;
const { DataIngestionService } = require('./dist/services/DataIngestionService');
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const dates = [];
  let d = new Date('2026-07-28T18:30:00.000Z');
  const end = new Date();
  while (d <= end) {
    if (await MarketCalendarService.isValidTradingSession(d)) {
       dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  
  const origFindMany = prisma.instrument.findMany.bind(prisma.instrument);
  prisma.instrument.findMany = async (args) => {
      return origFindMany({ where: { symbol: 'VEDL' } });
  };
  
  const service = new DataIngestionService();
  
  for (const date of dates) {
    console.log(`Fast-forwarding VEDL to ${date.toISOString()}`);
    await service.ingestDataForDate(date);
  }
  console.log("VEDL is fully up to date!");
}
run();

process.env.TZ = 'Asia/Kolkata';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DataIngestionService } = require('./dist/services/DataIngestionService');
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const dates = [];
  let d = new Date('2026-07-28T18:30:00.000Z');
  const end = new Date(); // today
  while (d <= end) {
    if (await MarketCalendarService.isValidTradingSession(d)) {
       dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  
  const service = new DataIngestionService();
  
  for (const date of dates) {
    console.log(`Fast-forwarding VEDL to ${date.toISOString()}`);
    // Manually process just VEDL
    const instruments = await prisma.instrument.findMany({ where: { symbol: 'VEDL' } });
    
    // We cannot easily mock findMany inside the service, so let's just use the provider manually
    // Actually, DataIngestionService.ingestDataForDate fetches all instruments.
    // Let's monkey-patch prisma.instrument.findMany JUST for the duration of this call
    const origFindMany = prisma.instrument.findMany;
    prisma.instrument.findMany = async (args) => {
        return origFindMany.call(prisma, { where: { symbol: 'VEDL' } });
    };
    
    // BUT DataIngestionService creates its own PrismaClient instance!
    // So monkey-patching our local prisma doesn't affect it.
  }
}
run();

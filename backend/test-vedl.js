process.env.TZ = 'Asia/Kolkata';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DataIngestionService } = require('./dist/services/DataIngestionService');
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const dates = [];
  let d = new Date('2026-07-28T18:30:00.000Z');
  const end = new Date('2026-08-11T18:30:00.000Z');
  while (d <= end) {
    if (await MarketCalendarService.isValidTradingSession(d)) {
       dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  
  const service = new DataIngestionService();
  
  // Wipe DailyMetrics for VEDL so it gets recreated
  const vedl = await prisma.instrument.findUnique({where: {symbol: 'VEDL'}});
  await prisma.dailyMetric.deleteMany({where: {instrumentId: vedl.id}});
  
  for (const date of dates) {
    console.log(`Ingesting for ${date.toISOString()}`);
    await service.ingestDataForDate(date);
  }
  
  const metrics = await prisma.dailyMetric.findMany({
    where: {instrumentId: vedl.id},
    orderBy: {date: 'asc'}
  });
  
  for (const m of metrics) {
    console.log(`Date: ${m.date.toISOString()}, YTD Ref: ${m.ytdReferencePrice}, YTD Change: ${m.ytdChange}`);
  }
}

run();

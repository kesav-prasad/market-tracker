process.env.TZ = 'Asia/Kolkata';
const prisma = require('./dist/db').default;
const { DataIngestionService } = require('./dist/services/DataIngestionService');
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const service = new DataIngestionService();
  
  const origFindMany = prisma.instrument.findMany.bind(prisma.instrument);
  prisma.instrument.findMany = async (args) => {
      return origFindMany({ where: { symbol: 'SENSEXBETA' } });
  };
  
  await service.ingestDataForDate(new Date('2026-07-28T18:30:00.000Z'));
  
  const metric = await prisma.dailyMetric.findFirst({
    where: { instrumentId: 2, date: new Date('2026-07-28T18:30:00.000Z') }
  });
  console.log(metric);
}
run();

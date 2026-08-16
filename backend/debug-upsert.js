process.env.TZ = 'Asia/Kolkata';
const prisma = require('./dist/db').default;
const { DataIngestionService } = require('./dist/services/DataIngestionService');

async function run() {
  const service = new DataIngestionService();
  const date = new Date('2026-07-28T18:30:00.000Z');
  
  const origFindMany = prisma.instrument.findMany.bind(prisma.instrument);
  prisma.instrument.findMany = async (args) => {
      return origFindMany({ where: { symbol: 'SENSEXBETA' } });
  };
  
  const origUpsert = prisma.dailyMetric.upsert.bind(prisma.dailyMetric);
  prisma.dailyMetric.upsert = async (args) => {
      console.log("Upsert args:", JSON.stringify(args, null, 2));
      return origUpsert(args);
  };
  
  await service.ingestDataForDate(date);
}
run();

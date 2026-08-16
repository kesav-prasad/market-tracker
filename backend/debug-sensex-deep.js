process.env.TZ = 'Asia/Kolkata';
const prisma = require('./dist/db').default;
const { DataIngestionService } = require('./dist/services/DataIngestionService');

async function run() {
  const service = new DataIngestionService();
  const date = new Date('2026-07-28T18:30:00.000Z');
  
  // monkey patch console.log
  const _log = console.log;
  console.log = function(...args) {
    if (args.join(' ').includes('SENSEXBETA')) _log(...args);
  };
  
  // mock findMany to only return SENSEXBETA
  const origFindMany = prisma.instrument.findMany.bind(prisma.instrument);
  prisma.instrument.findMany = async (args) => {
      return origFindMany({ where: { symbol: 'SENSEXBETA' } });
  };
  
  // add a custom hook to the service directly by replacing the source temporarily
  // but wait, I can just read the compiled JS and patch it? No, too complex.
  // Let's just run it with a debugger or custom logging.
  // I will just read the DB values it inserts.
  await service.ingestDataForDate(date);
  
  const metric = await prisma.dailyMetric.findFirst({
    where: { instrumentId: 2, date: date }
  });
  _log("Final Metric:", metric);
}
run();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'SENSEXBETA' } });
  console.log('Provider Symbol:', inst.providerSymbol);
  const obs = await prisma.priceObservation.findMany({ 
    where: { instrumentId: inst.id },
    orderBy: { date: 'desc' },
    take: 5
  });
  console.log('Observations:', obs);
  const metric = await prisma.dailyMetric.findMany({
    where: { instrumentId: inst.id },
    orderBy: { date: 'desc' },
    take: 5
  });
  console.log('Metrics:', metric);
}
run();

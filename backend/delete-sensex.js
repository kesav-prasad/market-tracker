const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const dates = [
    new Date('2026-08-10T18:30:00.000Z'),
    new Date('2026-08-09T18:30:00.000Z')
  ];
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'SENSEXBETA' } });
  const obs = await prisma.priceObservation.findMany({ where: { instrumentId: inst.id, date: { in: dates } } });
  const obsIds = obs.map(o => o.id);
  
  await prisma.discrepancy.deleteMany({ where: { priceObservationId: { in: obsIds } } });
  await prisma.dailyMetric.deleteMany({ where: { instrumentId: inst.id, date: { in: dates } } });
  await prisma.priceObservation.deleteMany({ where: { instrumentId: inst.id, date: { in: dates } } });
  console.log('Deleted SENSEXBETA metrics');
}
run();

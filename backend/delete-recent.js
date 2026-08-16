const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const dates = [
    new Date('2026-08-10T18:30:00.000Z'), // Aug 11 IST
    new Date('2026-08-09T18:30:00.000Z')  // Aug 10 IST
  ];
  
  const obs = await prisma.priceObservation.findMany({ where: { date: { in: dates } } });
  const obsIds = obs.map(o => o.id);
  
  const res0 = await prisma.discrepancy.deleteMany({
    where: { priceObservationId: { in: obsIds } }
  });
  
  const res1 = await prisma.dailyMetric.deleteMany({
    where: { date: { in: dates } }
  });
  const res2 = await prisma.priceObservation.deleteMany({
    where: { date: { in: dates } }
  });
  
  console.log('Deleted discrepancies:', res0.count);
  console.log('Deleted metrics:', res1.count);
  console.log('Deleted obs:', res2.count);
}
run();

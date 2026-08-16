const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const count = await prisma.dailyMetric.deleteMany({
    where: { date: new Date('2026-08-11T18:30:00.000Z') }
  });
  console.log('Deleted polluted DailyMetrics:', count.count);
  
  const count2 = await prisma.priceObservation.deleteMany({
    where: { date: new Date('2026-08-11T18:30:00.000Z') }
  });
  console.log('Deleted polluted PriceObservations:', count2.count);
}
run();

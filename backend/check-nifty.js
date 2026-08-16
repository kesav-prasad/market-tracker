const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'NIFTYBEES' } });
  const metrics = await prisma.dailyMetric.findMany({
    where: { instrumentId: inst.id },
    orderBy: { date: 'desc' },
    take: 2
  });
  console.log('NIFTYBEES Metrics:', metrics);
}
run();

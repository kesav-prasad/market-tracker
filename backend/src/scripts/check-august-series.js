const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inst = await prisma.instrument.findFirst({ where: { symbol: 'NIFTYBEES' } });
  const metrics = await prisma.dailyMetric.findMany({
    where: { instrumentId: inst.id, date: { gte: new Date('2026-07-28T00:00:00Z') } },
    orderBy: { date: 'asc' }
  });
  console.log("AUGUST METRICS for NIFTYBEES:");
  metrics.forEach(m => console.log(`${m.date.toISOString().substring(0, 10)} | ID: ${m.seriesId} | Change: ${m.seriesChange}`));
}
run().finally(() => prisma.$disconnect());

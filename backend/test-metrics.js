const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const count = await prisma.dailyMetric.count();
  const distinctInstruments = await prisma.dailyMetric.findMany({
    distinct: ['instrumentId'],
    select: { instrumentId: true }
  });
  console.log('Total daily metrics:', count);
  console.log('Distinct instruments in DailyMetric:', distinctInstruments.length);
}
run().catch(console.error).finally(() => prisma.$disconnect());

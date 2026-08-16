const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'SENSEXBETA' } });
  
  // Update metric for Aug 11
  const aug11 = new Date('2026-08-10T18:30:00.000Z');
  await prisma.dailyMetric.updateMany({
    where: { instrumentId: inst.id, date: aug11 },
    data: { todayChange: -0.51896 } // Patch it based on SENSEXADD.BO
  });
  console.log('Patched SENSEXBETA metric');
}
run();

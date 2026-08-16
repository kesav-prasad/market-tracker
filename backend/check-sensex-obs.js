const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'SENSEXBETA' } });
  const obs = await prisma.priceObservation.findMany({
    where: { instrumentId: inst.id },
    orderBy: { date: 'desc' },
    take: 3
  });
  console.log('SENSEXBETA Obs:', obs);
}
run();

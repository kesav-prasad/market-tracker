const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inst = await prisma.instrument.findUnique({ where: { symbol: 'POWERINDIA' } });
  const history = await prisma.priceObservation.findMany({
    where: { instrumentId: inst.id },
    orderBy: { date: 'asc' }
  });
  console.log('Jan 1 Price:', history.find(h => h.date.toISOString().startsWith('2026-01-01'))?.price);
}
run();

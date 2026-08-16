const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inst = await prisma.instrument.findFirst({ where: { symbol: 'NIFTYBEES' } });
  const startOfYear = new Date('2026-01-01T00:00:00Z');
  const obs = await prisma.priceObservation.findMany({
    where: { instrumentId: inst.id, date: { gte: startOfYear, lte: new Date('2026-01-05T00:00:00Z') } },
    orderBy: { date: 'asc' }
  });
  console.log(obs);
}
run().finally(() => prisma.$disconnect());

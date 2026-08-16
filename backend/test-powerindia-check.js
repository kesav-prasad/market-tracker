const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const p = await prisma.priceObservation.findFirst({ where: { instrumentId: 6, date: new Date('2026-01-01T00:00:00.000Z') } });
  console.log('POWERINDIA Jan 1 price in DB:', p.price);
}
run();

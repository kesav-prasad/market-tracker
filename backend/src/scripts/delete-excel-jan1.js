const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const deleted = await prisma.priceObservation.deleteMany({
    where: { source: 'EXCEL', date: { lt: new Date('2026-07-01T00:00:00Z') } }
  });
  console.log('Deleted stray Excel seed rows before July:', deleted.count);
}
run().finally(() => prisma.$disconnect());

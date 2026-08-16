const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { startOfDay } = require('date-fns');

async function run() {
  await prisma.series.updateMany({
    where: { id: 1 },
    data: {
      referenceDate: new Date('2026-07-28T00:00:00.000Z'),
      expectedExpiryDate: new Date('2026-08-27T00:00:00.000Z')
    }
  });
  console.log('Series dates updated');
}
run().catch(console.error).finally(() => prisma.$disconnect());

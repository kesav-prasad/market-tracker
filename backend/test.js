const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const metric = await prisma.dailyMetric.findFirst({
    where: { instrument: { symbol: 'NIFTYBEES' } },
    orderBy: { date: 'desc' },
  });
  console.log(metric);
}
main();

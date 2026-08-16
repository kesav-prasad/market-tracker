const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cals = await prisma.marketCalendarDay.findMany({
    where: { date: { gte: new Date('2026-08-01'), lte: new Date('2026-08-15') } },
    orderBy: { date: 'asc' },
  });
  console.log(cals);
}
main();

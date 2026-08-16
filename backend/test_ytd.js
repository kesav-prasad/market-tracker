const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);
  
  const series = await prisma.series.findMany({
    orderBy: { referenceDate: 'asc' }
  });
  console.log("Series:", series.map(s => s.name + " " + s.referenceDate));
  
  const obs = await prisma.priceObservation.findMany({
    where: { date: { gte: startOfYear } },
    orderBy: { date: 'asc' },
    take: 5
  });
  console.log("Obs:", obs);
  
  const metrics = await prisma.dailyMetric.findMany({
    take: 5
  });
  console.log("Metrics:", metrics);
}

main().catch(console.error).finally(() => prisma.$disconnect());

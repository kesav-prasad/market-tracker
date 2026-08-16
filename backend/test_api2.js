const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);
  
  const series = await prisma.series.findFirst({
    where: { isFinalized: false },
    orderBy: { referenceDate: 'asc' }
  });
  
  const ytdSeriesList = [series];
  const firstSeriesDate = series.referenceDate;
  
  const historicalObsRaw = await prisma.priceObservation.findMany({
    where: {
      date: {
        gte: startOfYear,
        lt: firstSeriesDate
      }
    },
    orderBy: { date: 'asc' }
  });
  
  console.log('historicalObsRaw count:', historicalObsRaw.length);
  
  const m1 = await prisma.dailyMetric.findMany({ where: { instrumentId: 1, seriesId: series.id } });
  console.log('metrics for inst 1, series', series.id, ':', m1.length);
}
run().catch(console.error).finally(() => prisma.$disconnect());

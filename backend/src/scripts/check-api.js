const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);
  const series = await prisma.series.findFirst({
    where: { isFinalized: false },
    orderBy: { expectedExpiryDate: 'desc' }
  });
  
  const ytdSeriesList = await prisma.series.findMany({
    where: { 
      expectedExpiryDate: { gte: startOfYear },
      referenceDate: { lte: series.expectedExpiryDate }
    },
    orderBy: { referenceDate: 'asc' }
  });
  
  const inst = await prisma.instrument.findFirst({ where: { symbol: 'NIFTYBEES' } });
  
  const seriesData = [];
  for (const s of ytdSeriesList) {
    const dailyMetrics = await prisma.dailyMetric.findMany({
      where: { instrumentId: inst.id, seriesId: s.id },
      orderBy: { date: 'asc' }
    });
    seriesData.push({
      seriesId: s.id,
      metricsCount: dailyMetrics.length,
      nullSeriesChangeCount: dailyMetrics.filter(m => m.seriesChange === null).length
    });
  }
  console.log("Series Data:", seriesData);
}
run().finally(() => prisma.$disconnect());

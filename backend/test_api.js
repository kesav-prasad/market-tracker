const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const sList = await prisma.series.findMany();
  console.log('All series:', sList.map(s => ({id: s.id, ref: s.referenceDate})));
  const ytdSeriesList = await prisma.series.findMany({
    where: { 
      expectedExpiryDate: { gte: new Date('2026-01-01') },
      referenceDate: { lte: new Date('2026-08-25') }
    },
    orderBy: { referenceDate: 'asc' }
  });
  console.log('ytdSeriesList:', ytdSeriesList.map(s => ({id: s.id, ref: s.referenceDate})));
  
  const m9 = await prisma.dailyMetric.findMany({ where: { instrumentId: 1, seriesId: 9 } });
  console.log('metrics for inst 1, series 9:', m9.length);
}
run().catch(console.error).finally(() => prisma.$disconnect());

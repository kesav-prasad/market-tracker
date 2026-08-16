const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { startOfDay } = require('date-fns');

async function run() {
  const series = await prisma.series.findFirst({ where: { id: 1 } });
  if (!series) return;
  const refDate = startOfDay(series.referenceDate);
  
  const instruments = await prisma.instrument.findMany();
  for (const inst of instruments) {
    // Find price on or before reference date
    const refObs = await prisma.priceObservation.findFirst({
      where: {
        instrumentId: inst.id,
        status: 'VERIFIED',
        date: { lte: refDate }
      },
      orderBy: { date: 'desc' }
    });
    
    if (!refObs) continue;
    
    // Update DailyMetrics for this instrument
    const metrics = await prisma.dailyMetric.findMany({
      where: { instrumentId: inst.id }
    });
    
    for (const metric of metrics) {
      if (metric.price !== null) {
        const seriesChange = ((metric.price - refObs.price) / refObs.price) * 100;
        await prisma.dailyMetric.update({
          where: { id: metric.id },
          data: {
            referencePrice: refObs.price,
            seriesChange: seriesChange
          }
        });
      }
    }
  }
  console.log('Metrics recalculated');
}
run().catch(console.error).finally(() => prisma.$disconnect());

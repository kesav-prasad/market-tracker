import prisma from '../src/db';
import { CalculationEngine } from '../src/services/CalculationEngine';

async function main() {
  const currentSeries = await prisma.series.findFirst({
    where: { isFinalized: false },
    orderBy: { expectedExpiryDate: 'desc' }
  });
  if (!currentSeries) return;

  const zeroMetrics = await prisma.dailyMetric.findMany({
    where: { referencePrice: 0, seriesId: currentSeries.id }
  });

  // Group by instrumentId
  const instIds = [...new Set(zeroMetrics.map(m => m.instrumentId))];

  let fixedCount = 0;
  for (const instId of instIds) {
    // Find the latest PriceObservation on or before referenceDate
    const refObs = await prisma.priceObservation.findFirst({
      where: {
        instrumentId: instId,
        date: { lte: new Date(currentSeries.referenceDate.getTime() + 24 * 3600000) },
        status: 'VERIFIED'
      },
      orderBy: { date: 'desc' }
    });

    if (refObs && refObs.price > 0) {
      // Update all metrics for this instrument to use refObs.price as referencePrice
      const metrics = await prisma.dailyMetric.findMany({
        where: { instrumentId: instId, seriesId: currentSeries.id }
      });

      for (const m of metrics) {
        const seriesChange = (m.price !== null && m.price > 0) ? CalculationEngine.calculateSeriesChange(m.price, refObs.price) : null;
        await prisma.dailyMetric.update({
          where: { id: m.id },
          data: {
            referencePrice: refObs.price,
            seriesChange
          }
        });
        fixedCount++;
      }
    }
  }

  console.log('Fixed reference prices for', fixedCount, 'DailyMetrics');
}
main().catch(console.error);

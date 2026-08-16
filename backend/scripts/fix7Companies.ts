import prisma from '../src/db';
import { CalculationEngine } from '../src/services/CalculationEngine';
import { format } from 'date-fns';

async function main() {
  const currentSeries = await prisma.series.findFirst({
    where: { isFinalized: false },
    orderBy: { expectedExpiryDate: 'desc' }
  });
  if (!currentSeries) return;

  const instruments = await prisma.instrument.findMany({ where: { isActive: true } });

  // Companies that have only 1 valid point before
  const symbolsToFix = ["TATATECH", "EXIDEIND", "PPLPHARMA", "SAMMAANCAP", "TORNTPOWER", "IRCTC", "SYNGENE"];

  let fixed = 0;
  for (const inst of instruments) {
    if (!symbolsToFix.includes(inst.symbol)) continue;

    // The reference price should be the price on July 28!
    // Since currentSeries.referenceDate is July 28
    const refObs = await prisma.priceObservation.findFirst({
      where: {
        instrumentId: inst.id,
        date: { lte: currentSeries.referenceDate },
        status: 'VERIFIED'
      },
      orderBy: { date: 'desc' }
    });

    if (refObs) {
      const referencePrice = refObs.price;
      
      const metrics = await prisma.dailyMetric.findMany({
        where: { instrumentId: inst.id, seriesId: currentSeries.id }
      });

      for (const metric of metrics) {
        const seriesChange = (metric.price !== null && metric.price > 0) ? CalculationEngine.calculateSeriesChange(metric.price, referencePrice) : null;
        await prisma.dailyMetric.update({
          where: { id: metric.id },
          data: {
            referencePrice,
            seriesChange
          }
        });
        fixed++;
      }
    }
  }
  console.log(`Fixed ${fixed} DailyMetrics for the 7 missing companies.`);
}
main().catch(console.error);

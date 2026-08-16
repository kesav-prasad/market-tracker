import prisma from '../src/db';
import { CalculationEngine } from '../src/services/CalculationEngine';
import { format } from 'date-fns';

async function main() {
  const currentSeries = await prisma.series.findFirst({
    where: { isFinalized: false },
    orderBy: { expectedExpiryDate: 'desc' },
    include: { dailyMetrics: true }
  });
  if (!currentSeries) return;

  const instruments = await prisma.instrument.findMany({ where: { isActive: true } });
  
  // Find all unique dates in the current series from existing DailyMetrics
  const datesSet = new Set<string>();
  currentSeries.dailyMetrics.forEach(m => datesSet.add(format(new Date(m.date), 'yyyy-MM-dd')));
  const seriesDates = Array.from(datesSet).sort();

  let backfilledCount = 0;

  for (const inst of instruments) {
    // Determine reference price for this instrument
    const refMetric = currentSeries.dailyMetrics.find(m => 
      m.instrumentId === inst.id && format(new Date(m.date), 'yyyy-MM-dd') === format(new Date(currentSeries.referenceDate), 'yyyy-MM-dd')
    );
    let referencePrice = refMetric?.referencePrice || refMetric?.price || 0;

    if (!referencePrice) {
      // Find latest PriceObservation before or on reference date
      const refObs = await prisma.priceObservation.findFirst({
        where: {
          instrumentId: inst.id,
          date: { lte: new Date(currentSeries.referenceDate.getTime() + 24 * 3600000) },
          status: 'VERIFIED'
        },
        orderBy: { date: 'desc' }
      });
      if (refObs) referencePrice = refObs.price;
    }

    if (!referencePrice) continue; // Still no reference price, skip

    // Loop through all dates in the series
    for (const dStr of seriesDates) {
      const exactDate = new Date(dStr + 'T00:00:00.000+05:30'); // Midnight IST
      
      const existing = currentSeries.dailyMetrics.find(m => 
        m.instrumentId === inst.id && format(new Date(m.date), 'yyyy-MM-dd') === dStr
      );

      if (!existing) {
        // Find closest PriceObservation
        const obs = await prisma.priceObservation.findFirst({
          where: {
            instrumentId: inst.id,
            date: { lte: new Date(exactDate.getTime() + 24 * 3600000) },
            status: 'VERIFIED'
          },
          orderBy: { date: 'desc' }
        });

        if (obs && obs.price > 0) {
          const seriesChange = CalculationEngine.calculateSeriesChange(obs.price, referencePrice);
          await prisma.dailyMetric.create({
            data: {
              seriesId: currentSeries.id,
              instrumentId: inst.id,
              date: exactDate,
              price: obs.price,
              referencePrice,
              seriesChange,
              status: 'VERIFIED'
            }
          });
          backfilledCount++;
        }
      }
    }
  }

  console.log(`Backfilled ${backfilledCount} missing DailyMetrics`);
}

main().catch(console.error);

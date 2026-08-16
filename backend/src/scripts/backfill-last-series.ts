import prisma from '../db';

async function backfillLastSeries() {
  const instruments = await prisma.instrument.findMany();
  
  // Find all series to identify the previous one
  const allSeries = await prisma.series.findMany({ orderBy: { expectedExpiryDate: 'desc' } });
  const prevSeries = allSeries.length > 1 ? allSeries[1] : null;
  
  for (const inst of instruments) {
    if (!prevSeries) {
      console.log(`No prior series data for ${inst.symbol}, resetting to null`);
      await prisma.instrument.update({
        where: { id: inst.id },
        data: {
          lastSeriesChangePercent: null,
          lastSeriesEndDate: null
        }
      });
      continue;
    }

    const lastSeriesMetric = await prisma.dailyMetric.findFirst({
      where: {
        instrumentId: inst.id,
        seriesId: prevSeries.id
      },
      orderBy: { date: 'desc' },
      include: { series: true }
    });

    if (lastSeriesMetric && lastSeriesMetric.seriesChange !== null) {
      console.log(`Backfilling ${inst.symbol} with ${lastSeriesMetric.seriesChange}% from ${lastSeriesMetric.series.expectedExpiryDate.toISOString()}`);
      await prisma.instrument.update({
        where: { id: inst.id },
        data: {
          lastSeriesChangePercent: lastSeriesMetric.seriesChange,
          lastSeriesEndDate: lastSeriesMetric.series.expectedExpiryDate
        }
      });
    } else {
      console.log(`No valid final metric found for previous series for ${inst.symbol}, resetting to null`);
      await prisma.instrument.update({
        where: { id: inst.id },
        data: {
          lastSeriesChangePercent: null,
          lastSeriesEndDate: null
        }
      });
    }
  }
}

backfillLastSeries().catch(console.error).finally(() => prisma.$disconnect());

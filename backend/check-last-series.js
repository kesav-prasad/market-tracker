const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const instruments = await prisma.instrument.findMany({ take: 5, where: { isActive: true } });
  
  for (const inst of instruments) {
    // 1. Current value in LAST SERIES column
    const currentVal = inst.lastSeriesChangePercent;
    
    // 2. The actual final Series Change (%) that instrument had at the moment the previous series expired
    // Wait, let's find all series for this instrument to see what series exist.
    const allSeries = await prisma.series.findMany({ orderBy: { expectedExpiryDate: 'desc' } });
    
    // The previous series is the one before the current active one.
    // The current active one is allSeries[0].
    const currentSeries = allSeries[0];
    const prevSeries = allSeries.length > 1 ? allSeries[1] : null;
    
    let actualPrevVal = null;
    if (prevSeries) {
      const prevSeriesFinalMetric = await prisma.dailyMetric.findFirst({
        where: { instrumentId: inst.id, seriesId: prevSeries.id },
        orderBy: { date: 'desc' }
      });
      actualPrevVal = prevSeriesFinalMetric ? prevSeriesFinalMetric.seriesChange : null;
    }
    
    console.log(`Instrument: ${inst.symbol}`);
    console.log(`  Current LAST SERIES value: ${currentVal}`);
    console.log(`  Actual final Series Change (Prev Series): ${actualPrevVal}`);
    console.log(`  Previous Series Exists: ${!!prevSeries}`);
  }
}
check().then(() => process.exit(0));

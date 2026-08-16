import { PrismaClient } from '@prisma/client';
import { CalculationEngine } from '../services/CalculationEngine';

const prisma = new PrismaClient();

async function backfill() {
  const symbol = 'POWERINDIA';
  const instrument = await prisma.instrument.findUnique({ where: { symbol } });
  
  if (!instrument) {
    console.error(`Instrument ${symbol} not found`);
    return;
  }

  // Find the current active series
  const series = await prisma.series.findFirst({
    where: { isFinalized: false },
    orderBy: { expectedExpiryDate: 'desc' }
  });

  if (!series) {
    console.error('No active series found');
    return;
  }

  console.log(`Starting backfill for ${symbol} in series ${series.id}...`);

  // Target date range: July 30 to Aug 11 (plus we should recalculate Aug 12)
  const targetDates = await prisma.dailyMetric.findMany({
    where: {
      instrumentId: instrument.id,
      seriesId: series.id,
      date: {
        gte: new Date('2026-07-30T00:00:00.000Z'),
        lte: new Date('2026-08-12T23:59:59.000Z')
      }
    },
    orderBy: { date: 'asc' }
  });

  for (const metric of targetDates) {
    // 1. Get the VERIFIED Yahoo Finance observation for this date
    const obs = await prisma.priceObservation.findFirst({
      where: {
        instrumentId: instrument.id,
        date: metric.date,
        source: 'YAHOO_FINANCE'
      },
      orderBy: { timestamp: 'desc' }
    });

    if (!obs || obs.price === null) {
      console.log(`[${metric.date.toISOString().split('T')[0]}] STILL MISSING: No YAHOO_FINANCE observation found.`);
      continue;
    }

    // 2. Get the previous close price (from DailyMetric to ensure correctness)
    const prevMetric = await prisma.dailyMetric.findFirst({
      where: {
        instrumentId: instrument.id,
        date: { lt: metric.date },
        price: { not: null }
      },
      orderBy: { date: 'desc' }
    });

    const previousClose = prevMetric?.price ?? 0;
    
    // 3. Calculate metrics
    const todayChange = CalculationEngine.calculateTodayChange(obs.price, previousClose);
    const referencePrice = 31675.0; // Fixed series reference price
    let seriesChange = null;
    seriesChange = CalculationEngine.calculateSeriesChange(obs.price, referencePrice);
    let ytdChange = null;
    if (metric.ytdReferencePrice) {
      ytdChange = CalculationEngine.calculateYtdChange(obs.price, metric.ytdReferencePrice);
    }

    // 4. Update DailyMetric
    await prisma.dailyMetric.update({
      where: { id: metric.id },
      data: {
        price: obs.price,
        previousClosePrice: previousClose,
        referencePrice: referencePrice,
        todayChange,
        seriesChange,
        ytdChange,
        status: 'VERIFIED'
      }
    });

    console.log(`[${metric.date.toISOString().split('T')[0]}] Restored ${obs.price} | Session Change: ${todayChange?.toFixed(2)}% | Series Change: ${seriesChange?.toFixed(2)}%`);
  }
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

process.env.TZ = 'Asia/Kolkata';
import { PrismaClient } from '@prisma/client';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const prisma = new PrismaClient();

async function run() {
  const symbolArg = process.argv[2];
  if (!symbolArg) {
    console.error('Please provide an instrument symbol');
    process.exit(1);
  }

  const inst = await prisma.instrument.findFirst({ where: { symbol: symbolArg } });
  if (!inst) {
    console.error(`Instrument ${symbolArg} not found`);
    process.exit(1);
  }

  console.log(`Starting historical YTD backfill for ${inst.symbol}...`);
  
  const jan1 = new Date('2026-01-01T00:00:00Z');
  
  // The current active series in DB
  const currentSeries = await prisma.series.findFirst({
    where: { isFinalized: false },
    orderBy: { expectedExpiryDate: 'desc' }
  });

  if (!currentSeries) {
    console.error('No active series found');
    process.exit(1);
  }
  
  // Historical series from Jan 1 to current series reference date
  let histSeries = await prisma.series.findFirst({
    where: { referenceDate: jan1 }
  });
  
  if (!histSeries) {
    histSeries = await prisma.series.create({
      data: {
        referenceDate: jan1,
        expectedExpiryDate: currentSeries.referenceDate,
        isFinalized: true
      }
    });
    console.log('Created Historical Series:', histSeries.id);
  }

  const symbol = inst.providerSymbol || inst.symbol;
  
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`Fetching history for ${symbol} from 2026-01-01 to ${todayStr}...`);
    const chart: any = await yahooFinance.chart(symbol, {
       period1: '2026-01-01',
       period2: todayStr,
       interval: '1d'
    });
    
    const quotes = chart.quotes || [];
    if (quotes.length === 0) {
      console.log(`No quotes found for ${symbol}.`);
      process.exit(0);
    }
    
    const validQuotes = quotes.filter((q: any) => q.close !== null);
    if (validQuotes.length === 0) process.exit(0);
    
    const firstSession = validQuotes[0];
    const ytdRefPrice = firstSession.close;
    const ytdRefDate = firstSession.date;
    
    let created = 0;
    let prevClose = ytdRefPrice;
    let seriesRefPrice = ytdRefPrice; // For hist series it's just the ytd ref price

    // Find the quote that corresponds to the current series reference date
    const currentSeriesRefDateStr = currentSeries.referenceDate.toISOString().split('T')[0];
    const currentSeriesRefQuote = validQuotes.find((q: any) => new Date(q.date).toISOString().startsWith(currentSeriesRefDateStr));
    const currentSeriesRefPrice = currentSeriesRefQuote ? currentSeriesRefQuote.close : null;

    for (let i = 0; i < validQuotes.length; i++) {
       const q = validQuotes[i];
       const price = q.close;
       if (price === null) continue;
       
       const date = new Date(q.date);
       // Align date to DB format (18:30:00Z for IST 00:00:00 next day)
       const dbDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 18, 30, 0));

       const isCurrentSeries = dbDate > currentSeries.referenceDate;
       const activeSeriesId = isCurrentSeries ? currentSeries.id : histSeries.id;
       const activeSeriesRefPrice = isCurrentSeries && currentSeriesRefPrice ? currentSeriesRefPrice : seriesRefPrice;

       const ytdChange = ((price - ytdRefPrice) / ytdRefPrice) * 100;
       const todayChange = i === 0 ? 0 : ((price - prevClose) / prevClose) * 100;
       const seriesChange = ((price - activeSeriesRefPrice) / activeSeriesRefPrice) * 100;

       await prisma.priceObservation.upsert({
         where: {
           instrumentId_date_source: {
             instrumentId: inst.id,
             date: dbDate,
             source: 'YAHOO_FINANCE'
           }
         },
         update: { price, status: 'VERIFIED' },
         create: {
           instrumentId: inst.id,
           date: dbDate,
           price,
           source: 'YAHOO_FINANCE',
           status: 'VERIFIED',
           timestamp: q.date
         }
       });

       await prisma.dailyMetric.upsert({
         where: {
           instrumentId_seriesId_date: {
             instrumentId: inst.id,
             seriesId: activeSeriesId,
             date: dbDate
           }
         },
         update: {
           price,
           previousClosePrice: prevClose,
           referencePrice: activeSeriesRefPrice,
           seriesChange,
           todayChange,
           ytdReferenceDate: ytdRefDate,
           ytdReferencePrice: ytdRefPrice,
           ytdChange,
           status: 'VERIFIED'
         },
         create: {
           instrumentId: inst.id,
           seriesId: activeSeriesId,
           date: dbDate,
           price,
           previousClosePrice: prevClose,
           referencePrice: activeSeriesRefPrice,
           seriesChange,
           todayChange,
           ytdReferenceDate: ytdRefDate,
           ytdReferencePrice: ytdRefPrice,
           ytdChange,
           status: 'VERIFIED'
         }
       });

       prevClose = price;
       created++;
    }
    console.log(`${symbol}: Backfilled ${created} days.`);

  } catch(e: any) {
    console.error(`Failed ${symbol}:`, e.message);
  }
}

run().finally(() => prisma.$disconnect());

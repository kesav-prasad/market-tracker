const { PrismaClient } = require('@prisma/client');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

const prisma = new PrismaClient();

async function run() {
  console.log('Starting historical YTD backfill...');
  const instruments = await prisma.instrument.findMany({ where: { isActive: true } });
  
  const jan1 = new Date('2026-01-01T00:00:00Z');
  const july27 = new Date('2026-07-27T18:30:00Z');

  let histSeries = await prisma.series.findFirst({
    where: { referenceDate: jan1 }
  });
  
  if (!histSeries) {
    histSeries = await prisma.series.create({
      data: {
        referenceDate: jan1,
        expectedExpiryDate: july27,
        isFinalized: true
      }
    });
    console.log('Created Historical Series:', histSeries.id);
  }

  for (const inst of instruments) {
    const symbol = inst.symbol.includes('.') ? inst.symbol : `${inst.symbol}.NS`;
    
    try {
      await new Promise(r => setTimeout(r, 300)); // Be careful of Yahoo rate limits

      console.log(`Fetching history for ${symbol}...`);
      const chart = await yahooFinance.chart(symbol, {
         period1: '2026-01-01',
         period2: '2026-07-27',
         interval: '1d'
      });
      
      const quotes = chart.quotes;
      if (quotes.length === 0) {
        console.log(`No quotes found for ${symbol}. Skipping.`);
        continue;
      }
      
      const validQuotes = quotes.filter(q => q.close !== null);
      if (validQuotes.length === 0) continue;
      
      const firstSession = validQuotes[0];
      const ytdRefPrice = firstSession.close;
      const ytdRefDate = firstSession.date;
      
      console.log(`${symbol}: First session ${ytdRefDate.toISOString()} at ${ytdRefPrice}`);
      
      let created = 0;
      let prevClose = ytdRefPrice;

      for (let i = 0; i < validQuotes.length; i++) {
         const q = validQuotes[i];
         const price = q.close;
         const date = new Date(q.date);
         
         const dbDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 18, 30, 0));

         const ytdChange = ((price - ytdRefPrice) / ytdRefPrice) * 100;
         const todayChange = i === 0 ? 0 : ((price - prevClose) / prevClose) * 100;

         await prisma.priceObservation.upsert({
           where: {
             instrumentId_date_source: {
               instrumentId: inst.id,
               date: dbDate,
               source: 'YAHOO'
             }
           },
           update: { price, status: 'VERIFIED' },
           create: {
             instrumentId: inst.id,
             date: dbDate,
             price,
             source: 'YAHOO',
             status: 'VERIFIED',
             timestamp: q.date
           }
         });

         await prisma.dailyMetric.upsert({
           where: {
             instrumentId_seriesId_date: {
               instrumentId: inst.id,
               seriesId: histSeries.id,
               date: dbDate
             }
           },
           update: {
             price,
             previousClosePrice: prevClose,
             todayChange,
             ytdReferenceDate: ytdRefDate,
             ytdReferencePrice: ytdRefPrice,
             ytdChange,
             status: 'VERIFIED'
           },
           create: {
             instrumentId: inst.id,
             seriesId: histSeries.id,
             date: dbDate,
             price,
             previousClosePrice: prevClose,
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

    } catch(e) {
      console.error(`Failed ${symbol}:`, e.message);
    }
  }

  console.log('Backfill complete.');
}

run().finally(() => prisma.$disconnect());

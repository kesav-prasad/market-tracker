process.env.TZ = 'Asia/Kolkata';
const prisma = require('./dist/db').default;
const { DataIngestionService } = require('./dist/services/DataIngestionService');
const fs = require('fs');
const path = require('path');

// Read the uncompiled TS file to understand what I should monkey-patch? No, let's just copy the logic manually.
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');
const { MarketDataProviderFactory } = require('./dist/providers/MarketDataProviderFactory');

async function run() {
  const targetDate = new Date('2026-07-28T18:30:00.000Z');
  const instrument = await prisma.instrument.findUnique({where:{symbol:'SENSEXBETA'}});
  const provider = MarketDataProviderFactory.getProvider(instrument.provider);
  
  const prevSessionDate = await MarketCalendarService.getPreviousTradingSession(targetDate, instrument.marketCalendarId);
  const prevObs = await prisma.priceObservation.findFirst({
      where: {
          instrumentId: instrument.id,
          date: prevSessionDate
      },
      orderBy: { date: 'desc' }
  });
  
  let prevObsPrice = (prevObs?.price !== undefined && prevObs?.price !== null && !isNaN(prevObs.price)) ? prevObs.price : null;
  console.log("prevObs from DB:", prevObs);
  console.log("prevObsPrice after ternary:", prevObsPrice);
  
  if (prevObsPrice === null) {
      const prevProviderObs = await provider.getObservation(instrument.symbol, prevSessionDate, instrument.providerSymbol);
      console.log("prevProviderObs:", prevProviderObs);
      prevObsPrice = prevProviderObs.price;
  }
  
  console.log("prevObsPrice final:", prevObsPrice);
}
run();

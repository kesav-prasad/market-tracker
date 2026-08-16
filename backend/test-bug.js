const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const instruments = await prisma.instrument.findMany({
    where: { symbol: { in: ['VEDL', 'NIFTYBEES', 'RELIANCE', 'SENSEXBETA', 'TCS'] } }
  });
  
  for (const inst of instruments) {
    const metrics = await prisma.dailyMetric.findMany({
      where: { instrumentId: inst.id },
      orderBy: { date: 'desc' },
      take: 2
    });
    
    if (metrics.length < 2) continue;

    console.log(`\n--- ${inst.symbol} ---`);
    console.log(`Current Date: ${metrics[0].date.toISOString()}`);
    console.log(`Previous Close Date (expected): ${metrics[1].date.toISOString()}`);
    
    const obs = await prisma.priceObservation.findFirst({
      where: { instrumentId: inst.id, date: metrics[0].date }
    });

    console.log(`Current Price (obs): ${obs.price}`);
    console.log(`Previous Close Price used in DB: ${metrics[0].previousClosePrice}`);
    console.log(`Today Change stored: ${metrics[0].todayChange}`);
    
    const prevObs = await prisma.priceObservation.findFirst({
      where: { instrumentId: inst.id, date: metrics[1].date }
    });
    console.log(`Actual Previous Obs Price: ${prevObs.price}`);
    
    // Manual
    if (prevObs.price !== metrics[0].previousClosePrice) {
      console.log(`!! DIFF DETECTED !! Used: ${metrics[0].previousClosePrice}, Actual Obs: ${prevObs.price}`);
    }
  }
}
run();

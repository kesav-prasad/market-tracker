const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const instruments = await prisma.instrument.findMany({
    where: { symbol: { in: ['VEDL', 'NIFTYBEES', 'RELIANCE', 'SENSEXBETA', 'TCS'] } }
  });
  
  for (const inst of instruments) {
    const metric = await prisma.dailyMetric.findFirst({
      where: { instrumentId: inst.id },
      orderBy: { date: 'desc' }
    });
    
    const obs = await prisma.priceObservation.findFirst({
      where: { instrumentId: inst.id, date: metric.date }
    });

    console.log(`\n--- ${inst.symbol} ---`);
    console.log(`Current Price (obs): ${obs.price}`);
    console.log(`Previous Close (metric): ${metric.previousClosePrice}`);
    console.log(`Session Change (metric): ${metric.todayChange}`);
    
    // Manually calculate
    const expected = ((obs.price - metric.previousClosePrice) / metric.previousClosePrice) * 100;
    console.log(`Expected Session Change: ${expected}`);
  }
}
run();

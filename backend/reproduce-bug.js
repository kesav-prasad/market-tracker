const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const instruments = await prisma.instrument.findMany({
    where: { symbol: { in: ['NIFTYBEES', 'SENSEXBETA', 'SONACOMS'] } }
  });
  
  for (const inst of instruments) {
    const metric = await prisma.dailyMetric.findFirst({
      where: { instrumentId: inst.id },
      orderBy: { date: 'desc' }
    });
    if (!metric) {
      console.log(`--- ${inst.symbol} --- No metrics found`);
      continue;
    }
    
    const obs = await prisma.priceObservation.findFirst({
      where: { instrumentId: inst.id, date: metric.date }
    });
    
    console.log(`\n--- ${inst.symbol} ---`);
    console.log(`Current price used: ${obs?.price || 'null'}`);
    console.log(`"Previous close" price used: ${metric.previousClosePrice}`);
    console.log(`Date the app thinks that previous close is from: ${metric.date.toISOString()} minus 1 session`);
    console.log(`The resulting Session Change % the app shows: ${metric.todayChange}`);
  }
}
run();

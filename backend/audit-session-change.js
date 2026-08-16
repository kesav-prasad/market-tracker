process.env.TZ = 'Asia/Kolkata';
const prisma = require('./dist/db').default;
const { MarketCalendarService } = require('./dist/services/MarketCalendarService');

async function run() {
  const instruments = await prisma.instrument.findMany({
    where: { symbol: { in: ['NIFTYBEES', 'SENSEXBETA', 'BANKBEES', 'GOLDBEES', 'SILVERBEES'] } }
  });
  
  console.log("SYMBOL | PREVIOUS CLOSE | CURRENT | SESSION CHANGE");
  
  for (const inst of instruments) {
    const metric = await prisma.dailyMetric.findFirst({
      where: { instrumentId: inst.id },
      orderBy: { date: 'desc' }
    });
    
    if (metric) {
      console.log(`${inst.symbol} | ${metric.previousClosePrice} | ${metric.price} | ${metric.todayChange}`);
    }
  }
}
run();

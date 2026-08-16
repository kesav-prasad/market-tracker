const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inst = await prisma.instrument.findFirst({ where: { symbol: 'NIFTYBEES' } });
  
  const metrics = await prisma.dailyMetric.findMany({
    where: { 
      instrumentId: inst.id,
      date: { gte: new Date('2026-07-28T00:00:00Z') }
    },
    orderBy: { date: 'asc' },
    include: { series: true }
  });
  
  console.log('DAILY SPARKLINE DEBUG');
  console.log('Date | Previous Price | Current Price | Daily Change %');
  
  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    console.log(`${m.date.toISOString().substring(0, 10)} | XXXXX | ${m.price} | ${m.todayChange !== null ? m.todayChange : 'null'}%`);
  }
}
run().finally(() => prisma.$disconnect());

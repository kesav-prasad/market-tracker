process.env.TZ = 'Asia/Kolkata';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const symbol = 'SENSEXBETA';
  const inst = await prisma.instrument.findFirst({ where: { symbol } });
  
  if (!inst) throw new Error("Not found");

  const metrics = await prisma.dailyMetric.findMany({
    where: { 
      instrumentId: inst.id,
      date: { gte: new Date('2026-07-28T00:00:00Z') }
    },
    orderBy: { date: 'asc' }
  });

  console.log(`Symbol: ${inst.symbol}`);
  
  for (let i = 1; i < metrics.length; i++) {
    const prev = metrics[i-1];
    const curr = metrics[i];
    console.log(`Date: ${curr.date.toString().substring(0, 15)} | i-1.Price: ${prev.price?.toFixed(2)} | curr.PrevClose: ${curr.previousClosePrice?.toFixed(2)} | Curr: ${curr.price?.toFixed(2)} | DBChange: ${curr.todayChange?.toFixed(2)}% | CalcChange: ${(((curr.price - curr.previousClosePrice)/curr.previousClosePrice)*100).toFixed(2)}%`);
  }
}

run().finally(() => prisma.$disconnect());

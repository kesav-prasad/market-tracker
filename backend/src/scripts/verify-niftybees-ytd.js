const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inst = await prisma.instrument.findFirst({ where: { symbol: 'NIFTYBEES' } });
  
  const jan1 = new Date('2026-01-01T00:00:00Z');
  
  const metrics = await prisma.dailyMetric.findMany({
    where: { 
      instrumentId: inst.id,
      date: { gte: jan1 }
    },
    orderBy: { date: 'asc' }
  });
  
  console.log(`TOTAL RECORDS FOR NIFTYBEES: ${metrics.length}`);
  if (metrics.length > 0) {
     console.log(`FIRST TRADING SESSION: ${metrics[0].date.toISOString()} | PRICE: ${metrics[0].price} | YTD REF: ${metrics[0].ytdReferencePrice}`);
     
     console.log("\nDATE | PRICE | YEAR START REF | YTD %");
     for (let i = 0; i < metrics.length; i++) {
        const m = metrics[i];
        if (i < 5 || i > metrics.length - 6 || i % 20 === 0) {
           console.log(`${m.date.toISOString().substring(0, 10)} | ${m.price} | ${m.ytdReferencePrice} | ${m.ytdChange}%`);
        } else if (i === 5) {
           console.log("...");
        }
     }
  }
}
run().finally(() => prisma.$disconnect());

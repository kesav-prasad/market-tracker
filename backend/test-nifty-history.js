const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inst = await prisma.instrument.findFirst({ where: { symbol: 'NIFTYBEES' } });
  const metrics = await prisma.dailyMetric.findMany({ 
    where: { instrumentId: inst.id },
    orderBy: { date: 'asc' }
  });
  
  console.log(`TOTAL RECORDS FOR NIFTYBEES: ${metrics.length}`);
  if (metrics.length > 0) {
     console.log(`FIRST DATE: ${metrics[0].date.toISOString()} | PRICE: ${metrics[0].price} | YTD REF: ${metrics[0].ytdReferencePrice}`);
     console.log(`LAST DATE:  ${metrics[metrics.length-1].date.toISOString()} | PRICE: ${metrics[metrics.length-1].price} | YTD REF: ${metrics[metrics.length-1].ytdReferencePrice}`);
  }
}
run().finally(() => prisma.$disconnect());
